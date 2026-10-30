import type Anthropic from "@anthropic-ai/sdk";
import { getAgency } from "../agency/sunrise";
import { byId, caregiverName, clientShort, shiftLabel } from "../agency/query";
import { SKILL_LABEL } from "../agency/types";
import { rankForShift, eligibleForShift, type Candidate } from "../matcher/rank";
import { qloo } from "../qloo/client";
import { ENTITY_TYPES, type EntityKind } from "../qloo/types";
import { pairScore, personProfile, quickPairScore } from "../service/engine";
import { buildBridgeKit } from "./bridgekit";
import { requireHumanApproval } from "./guards";

export interface OfferDraft {
  draftId: string;
  shiftId: string;
  caregiverId: string;
  caregiverName: string;
  phone: string;
  text: string;
  bridges: string[];
}

export interface ToolOutput {
  /** JSON returned to Claude. */
  result: unknown;
  /** One line for the visible trace. */
  summary: string;
}

const agency = () => getAgency();
const q = () => byId(agency());

function relativeDay(date: string): string {
  const today = agency().demo.today;
  const diff = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

export function getShift(shiftId: string): ToolOutput {
  const sh = q().shift(shiftId);
  const c = q().client(sh.clientId);
  const regular = sh.caregiverId ? q().caregiver(sh.caregiverId) : null;
  return {
    result: {
      shift_id: sh.id,
      when: shiftLabel(sh),
      relative_day: relativeDay(sh.date),
      client: { id: c.id, name: clientShort(c), age: c.age, area: c.home.area },
      required_skills: c.requiredSkills.map((s) => SKILL_LABEL[s]),
      languages_needed: c.languagesNeeded,
      has_pets: c.hasPets,
      regular_caregiver: regular ? { id: regular.id, name: caregiverName(regular) } : null,
    },
    summary: `${clientShort(c)} · ${shiftLabel(sh)} · needs ${c.requiredSkills.map((s) => SKILL_LABEL[s]).join(", ")}`,
  };
}

export function findAvailableCaregivers(shiftId: string): ToolOutput {
  const all = agency().caregivers.map((cg) => ({ cg, el: eligibleForShift(agency(), shiftId, cg) }));
  const ok = all.filter((x) => x.el.eligible);
  const why = new Map<string, number>();
  for (const x of all) if (!x.el.eligible) for (const r of x.el.reasons) why.set(r.replace(/\d+/g, "#"), (why.get(r.replace(/\d+/g, "#")) ?? 0) + 1);
  return {
    result: {
      eligible: ok.map((x) => ({ id: x.cg.id, name: caregiverName(x.cg), travel_min: x.el.travelMin })),
      excluded_count: all.length - ok.length,
      top_exclusion_reasons: [...why.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([r, n]) => `${r} (${n})`),
    },
    summary: `${ok.length} of ${all.length} caregivers pass every hard constraint`,
  };
}

export async function scorePairTool(clientId: string, caregiverId: string): Promise<ToolOutput> {
  const p = await pairScore(clientId, caregiverId);
  const cg = q().caregiver(caregiverId);
  return {
    result: {
      taste_score: p.tasteScore,
      bridges: p.bridges.map((b) => ({
        name: b.name,
        domain: b.domain,
        qloo_id: b.entityId,
        affinity_client: b.affinityA,
        affinity_caregiver: b.affinityB,
        weaker: b.weaker,
      })),
      friction: p.friction.map((f) => f.text),
    },
    summary: `${caregiverName(cg)}: taste ${p.tasteScore}/100 · ${p.bridges.slice(0, 3).map((b) => b.name).join(", ") || "no bridges"}`,
  };
}

export async function rankCandidates(shiftId: string): Promise<ToolOutput & { candidates: Candidate[] }> {
  const { candidates } = await rankForShift(agency(), shiftId, quickPairScore);
  const top = candidates.slice(0, 8);
  return {
    candidates,
    result: top.map((c, i) => ({
      rank: i + 1,
      caregiver_id: c.caregiverId,
      name: caregiverName(q().caregiver(c.caregiverId)),
      composite: c.composite,
      taste_score: c.taste,
      continuity: c.continuity,
      travel_min: c.travelMin,
      top_bridges: c.bridges.slice(0, 3).map((b) => b.name),
    })),
    summary: top
      .slice(0, 3)
      .map((c, i) => `${i + 1}. ${caregiverName(q().caregiver(c.caregiverId))} (${c.composite})`)
      .join(" · "),
  };
}

export async function draftOffer(caregiverId: string, shiftId: string): Promise<OfferDraft> {
  const sh = q().shift(shiftId);
  const c = q().client(sh.clientId);
  const cg = q().caregiver(caregiverId);
  const p = await pairScore(c.id, cg.id);
  const names = p.bridges.filter((b) => !b.weaker).slice(0, 2).map((b) => b.name);
  const time = { morning: "9am–1pm", afternoon: "1–5pm", evening: "5–9pm" }[sh.block];
  const hook = names.length ? ` You both love ${names.join(" and ")}.` : "";
  return {
    draftId: `${shiftId}:${caregiverId}`,
    shiftId,
    caregiverId,
    caregiverName: caregiverName(cg),
    phone: cg.phoneMock,
    text: `Hi ${cg.firstName}, can you cover ${clientShort(c)} ${relativeDay(sh.date)} ${time} in ${c.home.area}?${hook} Reply YES to accept. – Sunrise Home Care`,
    bridges: names,
  };
}

/** Simulated SMS send. Requires the scheduler's explicit approval. */
export async function sendOffer(draftId: string, approvedByHuman: unknown) {
  requireHumanApproval("send_offer", approvedByHuman);
  const [shiftId, caregiverId] = draftId.split(":");
  const draft = await draftOffer(caregiverId, shiftId);
  return { status: "sent_sim" as const, draft, sentAt: new Date().toISOString() };
}

export async function familyNotice(clientId: string, caregiverId: string, shiftId: string) {
  const c = q().client(clientId);
  const cg = q().caregiver(caregiverId);
  const sh = q().shift(shiftId);
  const p = await pairScore(clientId, caregiverId);
  const b = p.bridges.find((x) => !x.weaker);
  const extra = b ? ` ${cg.firstName} is a big ${b.name} fan too.` : "";
  return {
    to: `${c.family.name} (${c.family.relation})`,
    text: `Hi ${c.family.name}, ${cg.firstName} is covering for ${c.firstName} ${relativeDay(sh.date)} while the regular caregiver is out.${extra} – Sunrise Home Care`,
  };
}

/** Simulated family notification. Requires the scheduler's explicit approval. */
export async function notifyFamily(clientId: string, caregiverId: string, shiftId: string, approvedByHuman: unknown) {
  requireHumanApproval("notify_family", approvedByHuman);
  return { status: "sent_sim" as const, message: await familyNotice(clientId, caregiverId, shiftId), sentAt: new Date().toISOString() };
}

export async function bridgeKitFor(clientId: string, caregiverId: string) {
  const [pair, client, caregiver] = await Promise.all([
    pairScore(clientId, caregiverId),
    personProfile("client", clientId),
    personProfile("caregiver", caregiverId),
  ]);
  return buildBridgeKit(clientId, caregiverId, pair, { client, caregiver });
}

// ------------------------------------------------------------------ Claude tool schemas

const obj = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object" as const,
  properties,
  required,
  additionalProperties: false,
});

export const CALLOUT_TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: "get_shift", description: "Get a shift's client, time, required skills and regular caregiver.", input_schema: obj({ shift_id: { type: "string" } }, ["shift_id"]), strict: true },
  {
    name: "find_available_caregivers",
    description: "List caregivers who pass every hard constraint for the shift (availability, travel, skills, languages, pets/smoke, personal-care preference, hours cap).",
    input_schema: obj({ shift_id: { type: "string" } }, ["shift_id"]),
    strict: true,
  },
  {
    name: "rank_candidates",
    description: "Rank eligible caregivers for the shift by 0.6·Qloo taste score + 0.25·continuity + 0.15·travel. Returns top bridges.",
    input_schema: obj({ shift_id: { type: "string" } }, ["shift_id"]),
    strict: true,
  },
  {
    name: "score_pair",
    description: "Qloo taste compatibility for a client and caregiver: score, bridges with Qloo ids and affinities, friction notes.",
    input_schema: obj({ client_id: { type: "string" }, caregiver_id: { type: "string" } }, ["client_id", "caregiver_id"]),
    strict: true,
  },
  {
    name: "draft_offer",
    description: "Draft (not send) the SMS shift offer for a caregiver, grounded in their Qloo bridges with the client.",
    input_schema: obj({ caregiver_id: { type: "string" }, shift_id: { type: "string" } }, ["caregiver_id", "shift_id"]),
    strict: true,
  },
  {
    name: "send_offer",
    description: "Request that a drafted offer be sent. Sending always waits for the human scheduler's approval in the UI.",
    input_schema: obj({ draft_id: { type: "string" } }, ["draft_id"]),
    strict: true,
  },
  {
    name: "qloo_search",
    description: "Look up an entity in Qloo by name (advanced; responses cached).",
    input_schema: obj({ query: { type: "string" }, type: { type: "string", enum: Object.keys(ENTITY_TYPES) } }, ["query", "type"]),
    strict: true,
  },
];

export async function qlooSearchTool(query: string, type: EntityKind): Promise<ToolOutput> {
  const res = await qloo().search(query, type, 5);
  return {
    result: res.data.map((e) => ({ qloo_id: e.id, name: e.name, type: e.kind })),
    summary: `Qloo /search "${query}" → ${res.data.slice(0, 3).map((e) => e.name).join(", ") || "nothing"}${res.cached ? " (cached)" : ""}`,
  };
}
