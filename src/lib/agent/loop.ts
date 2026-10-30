import type Anthropic from "@anthropic-ai/sdk";
import { getAgency } from "../agency/sunrise";
import { byId, caregiverName } from "../agency/query";
import type { Candidate } from "../matcher/rank";
import type { EntityKind } from "../qloo/types";
import { baseParams, claude, textOf } from "./claude";
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
  | { type: "start"; mode: "claude" | "deterministic"; model?: string; shiftId: string }
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
  mode: "claude" | "deterministic";
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

/** Execute one tool by name. Shared by the Claude loop and the deterministic runner. */
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
      return { result: { draft_id: d.draftId, text: d.text, status: "draft" }, summary: `Draft for ${d.caregiverName}: “${d.text}”` };
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

/** Same tools, fixed order, templated narration. Used when no Claude key is configured. */
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

async function runClaude(st: RunState, emit: Emit): Promise<string> {
  const c = claude()!;
  const sh = byId(getAgency()).shift(st.shiftId);
  const regular = sh.caregiverId ? caregiverName(byId(getAgency()).caregiver(sh.caregiverId)) : "The regular caregiver";
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: CALLOUT_TASK(st.shiftId, regular) }];
  let summary = "";
  for (let turn = 0; turn < 12; turn++) {
    const res = await c.beta.messages.create({
      ...baseParams(),
      max_tokens: 4000,
      system: AGENT_SYSTEM,
      tools: CALLOUT_TOOLS,
      messages,
    });
    const said = textOf(res.content);
    if (said) {
      emit({ type: "say", text: said });
      summary = said;
    }
    if (res.stop_reason === "refusal") {
      emit({ type: "notice", text: "Claude declined this turn; finishing deterministically." });
      return runDeterministic(st, emit);
    }
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) break;
    messages.push({ role: "assistant", content: res.content });
    const results = await Promise.all(
      uses.map(async (u) => {
        const out = await traced(u.name, (u.input ?? {}) as Record<string, unknown>, st, emit);
        return {
          type: "tool_result" as const,
          tool_use_id: u.id,
          content: JSON.stringify(out.result),
          is_error: out.error ?? false,
        };
      }),
    );
    messages.push({ role: "user", content: results });
  }
  // Guarantee the deliverables even if Claude stopped early.
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
  const useClaude = Boolean(claude());
  emit({ type: "start", mode: useClaude ? "claude" : "deterministic", model: useClaude ? baseParams().model : undefined, shiftId });
  let mode: CalloutResult["mode"] = useClaude ? "claude" : "deterministic";
  let summary: string;
  try {
    summary = useClaude ? await runClaude(st, emit) : await runDeterministic(st, emit);
  } catch (err) {
    emit({ type: "notice", text: `Claude unavailable (${err instanceof Error ? err.message : "error"}); running deterministically.` });
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
