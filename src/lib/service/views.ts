import { getAgency } from "../agency/sunrise";
import { byId, caregiverName, clientName, scheduleLabel, workedTogether } from "../agency/query";
import { claudeJson } from "../agent/claude";
import { topEntities } from "../compat/profile";
import { DEFAULT_WEIGHTS, type TasteProfile } from "../compat/types";
import { hasClaude } from "../env";
import { autoMatch, composite, MATCH_WEIGHTS, eligibleForSchedule } from "../matcher/rank";
import { DOMAINS, DOMAIN_LABEL, type Domain } from "../qloo/types";
import { pairScore, personProfile, quickPairScore } from "./engine";

/** Share of each person's affinity mass, per domain, that the other person also has. */
export function radar(a: TasteProfile, b: TasteProfile) {
  return DOMAINS.map((d) => {
    const share = (x: TasteProfile, y: TasteProfile) => {
      const list = Object.values(x.domains[d]);
      const total = list.reduce((acc, e) => acc + e.affinity, 0);
      const shared = list.filter((e) => y.domains[d][e.id]).reduce((acc, e) => acc + e.affinity, 0);
      return total ? Math.round((100 * shared) / total) : 0;
    };
    return { domain: DOMAIN_LABEL[d], client: share(a, b), caregiver: share(b, a) };
  });
}

export function profileSummary(p: TasteProfile) {
  return {
    seeds: p.seeds,
    unresolved: p.unresolved,
    cached: p.cached,
    top: Object.fromEntries(DOMAINS.map((d) => [d, topEntities(p, d, 5).map((e) => ({ id: e.id, name: e.name, affinity: e.affinity }))])) as Record<
      Domain,
      { id: string; name: string; affinity: number }[]
    >,
  };
}

export async function pairDetail(clientId: string, caregiverId: string) {
  const agency = getAgency();
  const q = byId(agency);
  const client = q.client(clientId);
  const cg = q.caregiver(caregiverId);
  const [score, a, b] = await Promise.all([pairScore(clientId, caregiverId), personProfile("client", clientId), personProfile("caregiver", caregiverId)]);
  const sc = agency.schedules.find((s) => s.clientId === clientId);
  const el = sc ? eligibleForSchedule(agency, { ...sc, caregiverId: undefined }, cg) : null;
  const continuity = workedTogether(agency, clientId, caregiverId) ? 100 : 0;
  const travelMin = el?.travelMin ?? 0;
  const comp = composite(score.tasteScore, continuity, travelMin);
  return {
    client: { id: client.id, name: clientName(client), age: client.age, area: client.home.area, seeds: a.seeds, unresolved: a.unresolved, eraAnswer: client.eraAnswer },
    caregiver: { id: cg.id, name: caregiverName(cg), age: cg.age, area: cg.home.area, seeds: b.seeds, unresolved: b.unresolved, blurb: cg.blurb },
    score,
    radar: radar(a, b),
    why: {
      weights: MATCH_WEIGHTS,
      domainWeights: DEFAULT_WEIGHTS,
      taste: score.tasteScore,
      continuity,
      travelMin,
      travelScore: comp.travelScore,
      composite: comp.value,
      eligibility: el ? { eligible: el.eligible, reasons: el.reasons } : null,
    },
    cached: a.cached && b.cached,
  };
}

export async function autoMatchView(scheduleIds: string[]) {
  const agency = getAgency();
  const q = byId(agency);
  const proposals = await autoMatch(agency, scheduleIds, quickPairScore);
  return {
    proposals: proposals.map((p) => {
      const c = q.client(p.clientId);
      return {
        scheduleId: p.scheduleId,
        schedule: scheduleLabel(q.schedule(p.scheduleId)),
        client: { id: c.id, name: clientName(c), age: c.age, area: c.home.area },
        caregiver: p.caregiverId ? { id: p.caregiverId, name: caregiverName(q.caregiver(p.caregiverId)), age: q.caregiver(p.caregiverId).age } : null,
        candidate: p.candidate,
        alternatives: p.alternatives.map((a) => ({ ...a, name: caregiverName(q.caregiver(a.caregiverId)) })),
        eligibleCount: p.eligibleCount,
      };
    }),
  };
}

/**
 * LLM-only baseline: Claude rates compatibility from the raw favourites alone, with no
 * Qloo data. Anything it names carries no Qloo id, which the UI points out.
 */
export async function llmOnlyBaseline(clientId: string, caregiverId: string) {
  const q = byId(getAgency());
  const c = q.client(clientId);
  const g = q.caregiver(caregiverId);
  if (!hasClaude()) return { available: false as const, reason: "Set ANTHROPIC_API_KEY to run the live LLM-only baseline." };
  const out = await claudeJson<{ score: number; shared_interests: string[]; rationale: string }>(
    "You estimate how well two people would get along over long home-care visits, using only their listed favourites. Return a 0-100 score, the interests you believe they share, and one sentence of rationale.",
    JSON.stringify({ person_a_favourites: c.seeds.map((s) => s.name), person_b_favourites: g.seeds.map((s) => s.name) }),
    {
      type: "object",
      properties: { score: { type: "integer" }, shared_interests: { type: "array", items: { type: "string" } }, rationale: { type: "string" } },
      required: ["score", "shared_interests", "rationale"],
      additionalProperties: false,
    },
  );
  if (!out) return { available: false as const, reason: "Claude did not return a result." };
  return { available: true as const, score: Math.max(0, Math.min(100, Math.round(out.score))), sharedInterests: out.shared_interests, rationale: out.rationale };
}

/** Match Board left column: open recurring schedules (no Qloo calls). */
export function boardView() {
  const agency = getAgency();
  const q = byId(agency);
  const open = agency.schedules.filter((s) => !s.caregiverId);
  return {
    agency: { name: agency.name, city: agency.city, caregivers: agency.caregivers.length, clients: agency.clients.length, today: agency.demo.today },
    open: open.map((s) => {
      const c = q.client(s.clientId);
      return {
        scheduleId: s.id,
        schedule: scheduleLabel(s),
        client: { id: c.id, name: clientName(c), age: c.age, area: c.home.area, needs: c.requiredSkills, favourites: c.seeds.map((x) => x.name) },
      };
    }),
    demo: agency.demo,
  };
}
