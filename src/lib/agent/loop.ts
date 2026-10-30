import { getAgency } from "../agency/sunrise";
import { byId, caregiverName } from "../agency/query";
import type { Candidate } from "../matcher/rank";
import type { EntityKind } from "../qloo/types";
import { env, hasLlm } from "../env";
import { functionCalls, generate, type GeminiContent, textOf } from "./llm";
import { AGENT_SYSTEM, CALLOUT_TASK } from "./prompts";
import {
  CALLOUT_TOOLS,
  draftOffer,
  findAvailableCaregivers,
  getShift,
  type OfferDraft,
  qlooSearchTool,
  rankCandidates,
  scorePairTool,
  type ToolOutput,
} from "./tools";

export type TraceEvent =
  | { type: "start"; mode: "llm" | "deterministic"; model?: string; shiftId: string }
  | { type: "say"; text: string }
  | { type: "tool"; id: string; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; id: string; tool: string; summary: string; ms: number; error?: boolean }
  | { type: "notice"; text: string }
  | { type: "result"; result: CalloutResult }
  | { type: "error"; text: string };

export interface CalloutCandidate {
  caregiverId: string;
  name: string;
  composite: number;
  taste: number;
  continuity: number;
  travelMin: number;
  bridges: { name: string; domain: string; qlooId: string; weaker: boolean }[];
  reasons: string[];
}

export interface CalloutResult {
  mode: "llm" | "deterministic";
  shiftId: string;
  clientId: string;
  candidates: CalloutCandidate[];
  drafts: OfferDraft[];
  pendingApproval: string | null;
  summary: string;
  elapsedMs: number;
}

type Emit = (e: TraceEvent) => void;

interface RunState {
  shiftId: string;
  candidates: Candidate[];
  drafts: Map<string, OfferDraft>;
  pendingApproval: string | null;
}

let seq = 0;
const newId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Execute one tool by name. Shared by the LLM loop and the deterministic runner. */
async function execTool(name: string, input: Record<string, unknown>, st: RunState): Promise<ToolOutput> {
  const str = (k: string) => String(input[k] ?? "");
  switch (name) {
    case "get_shift":
      return getShift(str("shift_id"));
    case "find_available_caregivers":
      return findAvailableCaregivers(str("shift_id"));
    case "rank_candidates": {
      const r = await rankCandidates(str("shift_id"));
      st.candidates = r.candidates;
      return r;
    }
    case "score_pair":
      return scorePairTool(str("client_id"), str("caregiver_id"));
    case "draft_offer": {
      const d = await draftOffer(str("caregiver_id"), str("shift_id"));
      st.drafts.set(d.draftId, d);
      return { result: { draft_id: d.draftId, text: d.text, status: "draft" }, summary: `Offer drafted for ${d.caregiverName}${d.bridges.length ? ` · ${d.bridges.join(", ")}` : ""}` };
    }
    case "send_offer": {
      const id = str("draft_id");
      if (!st.drafts.has(id)) return { result: { error: "unknown draft_id" }, summary: `Unknown draft ${id}` };
      st.pendingApproval = id;
      return {
        result: { status: "awaiting_scheduler_approval", draft_id: id },
        summary: `Held for scheduler approval: ${st.drafts.get(id)!.caregiverName}`,
      };
    }
    case "qloo_search":
      return qlooSearchTool(str("query"), str("type") as EntityKind);
    default:
      return { result: { error: `unknown tool ${name}` }, summary: `Unknown tool ${name}` };
  }
}

async function traced(name: string, input: Record<string, unknown>, st: RunState, emit: Emit): Promise<ToolOutput & { error?: boolean }> {
  const id = newId();
  emit({ type: "tool", id, tool: name, input });
  const t0 = Date.now();
  try {
    const out = await execTool(name, input, st);
    emit({ type: "tool_result", id, tool: name, summary: out.summary, ms: Date.now() - t0 });
    return out;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit({ type: "tool_result", id, tool: name, summary: msg, ms: Date.now() - t0, error: true });
    return { result: { error: msg }, summary: msg, error: true };
  }
}

/** Same tools, fixed order, templated narration. Used when no Gemini key is configured. */
async function runDeterministic(st: RunState, emit: Emit): Promise<string> {
  const sh = byId(getAgency()).shift(st.shiftId);
  emit({ type: "say", text: "Looking up the shift and the client's care needs." });
  await traced("get_shift", { shift_id: st.shiftId }, st, emit);
  emit({ type: "say", text: "Applying every hard constraint before looking at taste." });
  await traced("find_available_caregivers", { shift_id: st.shiftId }, st, emit);
  emit({ type: "say", text: "Ranking eligible caregivers with Qloo taste compatibility, continuity and travel." });
  await traced("rank_candidates", { shift_id: st.shiftId }, st, emit);
  const top = st.candidates.slice(0, 3);
  if (!top.length) return "No eligible caregiver passes the hard constraints for this shift. Escalate to the on-call scheduler.";
  emit({ type: "say", text: "Inspecting the bridges for the top candidate." });
  await traced("score_pair", { client_id: sh.clientId, caregiver_id: top[0].caregiverId }, st, emit);
  emit({ type: "say", text: `Drafting offers for the top ${top.length}.` });
  for (const c of top) await traced("draft_offer", { caregiver_id: c.caregiverId, shift_id: st.shiftId }, st, emit);
  await traced("send_offer", { draft_id: `${st.shiftId}:${top[0].caregiverId}` }, st, emit);
  const g = byId(getAgency()).caregiver(top[0].caregiverId);
  const why = top[0].bridges.slice(0, 2).map((b) => b.name);
  return `Recommend ${caregiverName(g)} (score ${top[0].composite}, taste ${top[0].taste}/100${why.length ? `; shared: ${why.join(", ")}` : ""}). Offer is drafted and waiting for your approval.`;
}

/** Gemini function-calling loop over the same tools. */
async function runLlm(st: RunState, emit: Emit): Promise<string> {
  const sh = byId(getAgency()).shift(st.shiftId);
  const regular = sh.caregiverId ? caregiverName(byId(getAgency()).caregiver(sh.caregiverId)) : "The regular caregiver";
  const contents: GeminiContent[] = [{ role: "user", parts: [{ text: CALLOUT_TASK(st.shiftId, regular) }] }];
  let summary = "";
  for (let turn = 0; turn < 12; turn++) {
    const res = await generate({ system: AGENT_SYSTEM, contents, tools: CALLOUT_TOOLS });
    const said = textOf(res.content);
    if (said) {
      emit({ type: "say", text: said });
      summary = said;
    }
    const calls = functionCalls(res.content);
    if (res.finishReason && !["STOP", "MAX_TOKENS"].includes(res.finishReason) && !calls.length) {
      emit({ type: "notice", text: "Finishing with the deterministic planner (same tools, same constraints)." });
      return runDeterministic(st, emit);
    }
    if (!calls.length) break;
    // Echo the model turn back verbatim: Gemini 3 needs its thought signatures returned.
    contents.push(res.content);
    const parts = await Promise.all(
      calls.map(async ({ functionCall: fc }) => {
        const out = await traced(fc.name, fc.args ?? {}, st, emit);
        return { functionResponse: { name: fc.name, ...(fc.id ? { id: fc.id } : {}), response: { result: out.result } } };
      }),
    );
    contents.push({ role: "user", parts });
  }
  // Guarantee the deliverables even if the model stopped early.
  if (!st.candidates.length) await traced("rank_candidates", { shift_id: st.shiftId }, st, emit);
  for (const cand of st.candidates.slice(0, 3)) {
    const id = `${st.shiftId}:${cand.caregiverId}`;
    if (!st.drafts.has(id)) await traced("draft_offer", { caregiver_id: cand.caregiverId, shift_id: st.shiftId }, st, emit);
  }
  if (!st.pendingApproval && st.candidates[0]) st.pendingApproval = `${st.shiftId}:${st.candidates[0].caregiverId}`;
  return summary;
}

export async function runCalloutAgent(shiftId: string, emit: Emit): Promise<CalloutResult> {
  const t0 = Date.now();
  const agency = getAgency();
  const sh = byId(agency).shift(shiftId);
  const st: RunState = { shiftId, candidates: [], drafts: new Map(), pendingApproval: null };
  const useLlm = hasLlm();
  emit({ type: "start", mode: useLlm ? "llm" : "deterministic", model: useLlm ? env.geminiModel : undefined, shiftId });
  let mode: CalloutResult["mode"] = useLlm ? "llm" : "deterministic";
  let summary: string;
  try {
    summary = useLlm ? await runLlm(st, emit) : await runDeterministic(st, emit);
  } catch (err) {
    emit({ type: "notice", text: "Running the deterministic planner (same tools, same constraints)." });
    mode = "deterministic";
    st.candidates = [];
    st.drafts.clear();
    summary = await runDeterministic(st, emit);
  }
  const q = byId(agency);
  const result: CalloutResult = {
    mode,
    shiftId,
    clientId: sh.clientId,
    candidates: st.candidates.slice(0, 6).map((c) => ({
      caregiverId: c.caregiverId,
      name: caregiverName(q.caregiver(c.caregiverId)),
      composite: c.composite,
      taste: c.taste,
      continuity: c.continuity,
      travelMin: c.travelMin,
      bridges: c.bridges.slice(0, 3).map((b) => ({ name: b.name, domain: b.domain, qlooId: b.entityId, weaker: b.weaker })),
      reasons: c.reasons,
    })),
    drafts: st.candidates
      .slice(0, 3)
      .map((c) => st.drafts.get(`${shiftId}:${c.caregiverId}`))
      .filter((d): d is OfferDraft => Boolean(d)),
    pendingApproval: st.pendingApproval,
    summary,
    elapsedMs: Date.now() - t0,
  };
  emit({ type: "result", result });
  return result;
}
