import { getAgency } from "../agency/sunrise";
import type { Agency } from "../agency/types";
import { rankForSchedule, type ScoreFn } from "../matcher/rank";
import { AUDIT_GROUPS, auditDemographics, type AuditGroup } from "./demographics";
import { mulberry32 } from "../agency/sunrise";
import { chiSquare } from "./stats";

export const OFFERS_PER_SCHEDULE = 3;
/** Groups below this many eligible opportunities are reported but not tested. */
export const MIN_GROUP_OPPORTUNITIES = 20;
export const PERMUTATIONS = 2000;

export interface GroupRow {
  group: AuditGroup;
  caregivers: number;
  opportunities: number;
  offers: number;
  rate: number;
}

export interface FairnessReport {
  rows: GroupRow[];
  chi: { stat: number; df: number; p: number; pPermutation: number };
  impactRatio: number;
  /** pass: balanced · watch: four-fifths ratio below 0.8 but not statistically significant · alert: significant disparity */
  status: "pass" | "watch" | "alert";
  pass: boolean;
  caregiversWithoutOffers: number;
  eligibleCaregivers: number;
  totalOffers: number;
  method: string;
}

/**
 * Offer-rate audit. For every recurring schedule, the top 2 eligible caregivers by score
 * get an offer, and the third slot rotates to the eligible caregiver with the lowest
 * offer rate so far (taste ranks; rotation keeps every eligible caregiver getting work).
 * Rate = offers / times the caregiver was eligible. The separately stored self-reported
 * groups are joined only here, after matching has run.
 *
 * Offers cluster by caregiver, so significance comes from a permutation test that
 * shuffles group labels across caregivers (the plain chi-square p is shown for reference).
 */
export async function fairnessAudit(scoreFn: ScoreFn, agency: Agency = getAgency()): Promise<FairnessReport> {
  const offers = new Map<string, number>();
  const opps = new Map<string, number>();
  const give = (id: string) => offers.set(id, (offers.get(id) ?? 0) + 1);
  for (const sc of agency.schedules) {
    const freed = { ...agency, schedules: agency.schedules.map((s) => (s.id === sc.id ? { ...s, caregiverId: undefined } : s)) };
    const { candidates } = await rankForSchedule(freed, sc.id, scoreFn);
    candidates.forEach((c) => opps.set(c.caregiverId, (opps.get(c.caregiverId) ?? 0) + 1));
    candidates.slice(0, OFFERS_PER_SCHEDULE - 1).forEach((c) => give(c.caregiverId));
    const rest = candidates.slice(OFFERS_PER_SCHEDULE - 1);
    const rateSoFar = (id: string) => (offers.get(id) ?? 0) / (opps.get(id) ?? 1);
    const rotation = [...rest].sort((a, b) => rateSoFar(a.caregiverId) - rateSoFar(b.caregiverId) || b.composite - a.composite)[0];
    if (rotation) give(rotation.caregiverId);
  }
  const selfReports = auditDemographics(agency.caregivers.map((c) => c.id));
  const tally = (labels: Map<string, AuditGroup>) =>
    AUDIT_GROUPS.map((group) => {
      const ids = [...labels.entries()].filter(([, g]) => g === group).map(([id]) => id);
      const o = ids.reduce((s, id) => s + (opps.get(id) ?? 0), 0);
      const f = ids.reduce((s, id) => s + (offers.get(id) ?? 0), 0);
      return { group, caregivers: ids.length, opportunities: o, offers: f, rate: o ? f / o : 0 };
    }).filter((r) => r.caregivers > 0);
  const testedOf = (rows: GroupRow[]) => rows.filter((r) => r.opportunities >= MIN_GROUP_OPPORTUNITIES && r.group !== "Prefer not to say");
  const statOf = (rows: GroupRow[]) => chiSquare(testedOf(rows).map((r) => [r.offers, r.opportunities - r.offers])).stat;

  const labels = new Map(selfReports.map((d) => [d.caregiverId, d.groupSelfReported]));
  const rows = tally(labels);
  const tested = testedOf(rows);
  const chi = chiSquare(tested.map((r) => [r.offers, r.opportunities - r.offers]));
  const observed = chi.stat;
  const rand = mulberry32(4242);
  const ids = [...labels.keys()];
  const groups = [...labels.values()];
  let extreme = 0;
  for (let k = 0; k < PERMUTATIONS; k++) {
    for (let i = groups.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [groups[i], groups[j]] = [groups[j], groups[i]];
    }
    if (statOf(tally(new Map(ids.map((id, i) => [id, groups[i]])))) >= observed - 1e-9) extreme++;
  }
  const pPermutation = (extreme + 1) / (PERMUTATIONS + 1);
  const rates = tested.map((r) => r.rate);
  const impactRatio = rates.length && Math.max(...rates) > 0 ? Math.min(...rates) / Math.max(...rates) : 1;
  const eligible = [...opps.keys()];
  return {
    rows,
    chi: { stat: Number(chi.stat.toFixed(3)), df: chi.df, p: Number(chi.p.toFixed(4)), pPermutation: Number(pPermutation.toFixed(4)) },
    impactRatio: Number(impactRatio.toFixed(3)),
    status: pPermutation < 0.05 ? "alert" : impactRatio < 0.8 ? "watch" : "pass",
    pass: pPermutation >= 0.05 && impactRatio >= 0.8,
    caregiversWithoutOffers: eligible.filter((id) => !offers.get(id)).length,
    eligibleCaregivers: eligible.length,
    totalOffers: [...offers.values()].reduce((a, b) => a + b, 0),
    method: `Per recurring schedule, the top ${OFFERS_PER_SCHEDULE - 1} eligible caregivers by score get an offer and one rotating slot goes to the eligible caregiver with the lowest offer rate so far. Tested: groups with ≥${MIN_GROUP_OPPORTUNITIES} eligible opportunities, excluding "Prefer not to say". PASS = caregiver-level permutation p ≥ 0.05 (${PERMUTATIONS} shuffles) and four-fifths impact ratio ≥ 0.8; WATCH = ratio below 0.8 without statistical significance (small groups); ALERT = p < 0.05.`,
  };
}
