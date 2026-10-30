import { TRAVEL_LIMIT_MIN } from "../agency/geo";
import { byId, workedTogether } from "../agency/query";
import type { Agency, Caregiver, RecurringSchedule } from "../agency/types";
import type { Bridge, PairScore } from "../compat/types";
import { bookedHours, busySlots, checkEligibility, type Eligibility } from "./constraints";
import { hungarian } from "./hungarian";

/** Weights shown in the "Why this match" panel. Transparency is a feature. */
export const MATCH_WEIGHTS = { taste: 0.6, continuity: 0.25, travel: 0.15 } as const;

export type ScoreFn = (clientId: string, caregiverId: string) => Promise<PairScore>;

export interface Candidate {
  caregiverId: string;
  composite: number;
  taste: number;
  continuity: number;
  travelMin: number;
  travelScore: number;
  bridges: Bridge[];
  reasons: string[];
}

export interface Excluded {
  caregiverId: string;
  reasons: string[];
}

export function composite(taste: number, continuity: number, travelMin: number) {
  const travelScore = Math.max(0, 100 - (100 * travelMin) / TRAVEL_LIMIT_MIN);
  const value = MATCH_WEIGHTS.taste * taste + MATCH_WEIGHTS.continuity * continuity + MATCH_WEIGHTS.travel * travelScore;
  return { value: Math.round(value * 10) / 10, travelScore: Math.round(travelScore) };
}

function weeklyRegularHours(agency: Agency, caregiverId: string) {
  return agency.schedules.filter((s) => s.caregiverId === caregiverId).reduce((a, s) => a + s.weekdays.length * 4, 0);
}

/** A caregiver can take a recurring schedule only if every weekday instance passes all hard constraints. */
export function eligibleForSchedule(agency: Agency, sc: RecurringSchedule, cg: Caregiver): Eligibility {
  const client = byId(agency).client(sc.clientId);
  const busy = agency.schedules
    .filter((s) => s.caregiverId === cg.id && s.id !== sc.id)
    .flatMap((s) => s.weekdays.map((wd) => ({ date: String(wd), block: s.block })));
  const reasons = new Set<string>();
  let travelMin = 0;
  for (const wd of sc.weekdays) {
    const res = checkEligibility(cg, client, { date: String(wd), weekday: wd, block: sc.block, hours: 0 }, { bookedHours: 0, busy });
    res.reasons.forEach((r) => reasons.add(r));
    travelMin = res.travelMin;
  }
  const hours = weeklyRegularHours(agency, cg.id) + sc.weekdays.length * 4;
  if (hours > cg.maxHours) reasons.add(`Would exceed ${cg.maxHours}h weekly cap`);
  return { eligible: reasons.size === 0, reasons: [...reasons], travelMin };
}

export function eligibleForShift(agency: Agency, shiftId: string, cg: Caregiver): Eligibility {
  const q = byId(agency);
  const sh = q.shift(shiftId);
  if (cg.id === sh.caregiverId) return { eligible: false, reasons: ["Called out"], travelMin: 0 };
  return checkEligibility(cg, q.client(sh.clientId), sh, {
    bookedHours: bookedHours(agency.shifts, cg.id, sh.date, sh.id),
    busy: busySlots(agency.shifts, cg.id, sh.id),
  });
}

function explain(c: Omit<Candidate, "reasons">): string[] {
  const out: string[] = [];
  if (c.bridges.length) out.push(`Shares ${c.bridges.slice(0, 2).map((b) => b.name).join(" & ")}`);
  if (c.continuity) out.push("Has worked with this client before");
  out.push(`${c.travelMin} min away`);
  return out;
}

async function scoreCandidates(
  agency: Agency,
  clientId: string,
  pool: { cg: Caregiver; el: Eligibility }[],
  scoreFn: ScoreFn,
): Promise<{ candidates: Candidate[]; excluded: Excluded[] }> {
  const excluded = pool.filter((p) => !p.el.eligible).map((p) => ({ caregiverId: p.cg.id, reasons: p.el.reasons }));
  const candidates = await Promise.all(
    pool
      .filter((p) => p.el.eligible)
      .map(async ({ cg, el }) => {
        const pair = await scoreFn(clientId, cg.id);
        const continuity = workedTogether(agency, clientId, cg.id) ? 100 : 0;
        const { value, travelScore } = composite(pair.tasteScore, continuity, el.travelMin);
        const base = { caregiverId: cg.id, composite: value, taste: pair.tasteScore, continuity, travelMin: el.travelMin, travelScore, bridges: pair.bridges };
        return { ...base, reasons: explain(base) };
      }),
  );
  candidates.sort((a, b) => b.composite - a.composite || b.taste - a.taste || a.caregiverId.localeCompare(b.caregiverId));
  return { candidates, excluded };
}

/** Rank substitutes for one shift (the call-out case). Taste only ranks; constraints decide who is in the pool. */
export async function rankForShift(agency: Agency, shiftId: string, scoreFn: ScoreFn) {
  const sh = byId(agency).shift(shiftId);
  const pool = agency.caregivers.map((cg) => ({ cg, el: eligibleForShift(agency, shiftId, cg) }));
  return scoreCandidates(agency, sh.clientId, pool, scoreFn);
}

export async function rankForSchedule(agency: Agency, scheduleId: string, scoreFn: ScoreFn) {
  const sc = byId(agency).schedule(scheduleId);
  const pool = agency.caregivers.map((cg) => ({ cg, el: eligibleForSchedule(agency, sc, cg) }));
  return scoreCandidates(agency, sc.clientId, pool, scoreFn);
}

export interface Proposal {
  scheduleId: string;
  clientId: string;
  caregiverId: string | null;
  candidate: Candidate | null;
  alternatives: Candidate[];
  eligibleCount: number;
}

const FORBIDDEN = 1e6;

/**
 * Auto-match open schedules: hard-constraint filter, then a min-cost assignment where
 * cost = −composite and ineligible pairs are forbidden. One caregiver per schedule.
 */
export async function autoMatch(agency: Agency, scheduleIds: string[], scoreFn: ScoreFn): Promise<Proposal[]> {
  const ranked = await Promise.all(scheduleIds.map((id) => rankForSchedule(agency, id, scoreFn)));
  const cgIds = agency.caregivers.map((c) => c.id);
  const cost = ranked.map((r) => {
    const byCg = new Map(r.candidates.map((c) => [c.caregiverId, c]));
    return cgIds.map((id) => (byCg.has(id) ? -byCg.get(id)!.composite : FORBIDDEN));
  });
  const assignment = scheduleIds.length <= cgIds.length ? hungarian(cost) : [];
  return scheduleIds.map((scheduleId, i) => {
    const r = ranked[i];
    const col = assignment[i];
    const ok = col !== undefined && col >= 0 && cost[i][col] < FORBIDDEN;
    const cgId = ok ? cgIds[col] : null;
    const candidate = cgId ? r.candidates.find((c) => c.caregiverId === cgId)! : null;
    return {
      scheduleId,
      clientId: byId(agency).schedule(scheduleId).clientId,
      caregiverId: cgId,
      candidate,
      alternatives: r.candidates.filter((c) => c.caregiverId !== cgId).slice(0, 3),
      eligibleCount: r.candidates.length,
    };
  });
}
