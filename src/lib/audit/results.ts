import { getAgency } from "../agency/sunrise";
import type { Agency } from "../agency/types";
import { eligibleForSchedule, rankForSchedule, type ScoreFn } from "../matcher/rank";

/**
 * SIMULATED results. Compares today's proximity-based regular assignments with a
 * Bonded assignment of the same schedules (greedy by fewest options, hours capacity
 * respected). Retention uses a stated assumption, not an outcome claim:
 * monthly survival of a match = BASE + LIFT × taste/100.
 */
export const RETENTION_MODEL = { base: 0.8, lift: 0.15 } as const;

const survival = (taste: number) => RETENTION_MODEL.base + (RETENTION_MODEL.lift * taste) / 100;

export async function simulatedResults(scoreFn: ScoreFn, agency: Agency = getAgency()) {
  const assigned = agency.schedules.filter((s) => s.caregiverId);
  const before = await Promise.all(assigned.map(async (s) => (await scoreFn(s.clientId, s.caregiverId!)).tasteScore));

  // Re-solve as if onboarding with Bonded from day one: no existing assignments, no continuity credit.
  const freed: Agency = { ...agency, history: [], schedules: agency.schedules.map((s) => ({ ...s, caregiverId: undefined })) };
  const ranked = await Promise.all(assigned.map(async (s) => ({ s, r: await rankForSchedule(freed, s.id, scoreFn) })));
  ranked.sort((a, b) => a.r.candidates.length - b.r.candidates.length);
  const hours = new Map<string, number>();
  const after: number[] = [];
  const bridgesAfter: number[] = [];
  for (const { s, r } of ranked) {
    const need = s.weekdays.length * 4;
    const pick = r.candidates.find((c) => {
      const cg = agency.caregivers.find((g) => g.id === c.caregiverId)!;
      if ((hours.get(cg.id) ?? 0) + need > cg.maxHours) return false;
      return eligibleForSchedule(freed, s, cg).eligible;
    });
    if (!pick) continue;
    hours.set(pick.caregiverId, (hours.get(pick.caregiverId) ?? 0) + need);
    // Block the caregiver's time slots for later schedules.
    freed.schedules = freed.schedules.map((x) => (x.id === s.id ? { ...x, caregiverId: pick.caregiverId } : x));
    after.push(pick.taste);
    bridgesAfter.push(pick.bridges.length);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const curve = (tastes: number[]) =>
    [0, 30, 60, 90].map((d) => ({ day: d, retained: Math.round(100 * avg(tastes.map((t) => survival(t) ** (d / 30)))) }));
  return {
    simulated: true as const,
    model: `Monthly match survival = ${RETENTION_MODEL.base} + ${RETENTION_MODEL.lift} × taste/100 (assumption for illustration, not a measured outcome).`,
    matches: assigned.length,
    covered: after.length,
    avgTasteBefore: Math.round(avg(before)),
    avgTasteAfter: Math.round(avg(after)),
    curves: [0, 30, 60, 90].map((day, i) => ({ day, proximity: curve(before)[i].retained, bonded: curve(after)[i].retained })),
  };
}
