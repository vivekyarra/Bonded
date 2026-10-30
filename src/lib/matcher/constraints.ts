import { TRAVEL_LIMIT_MIN, travelMinutes } from "../agency/geo";
import { SKILL_LABEL, type Caregiver, type Client, type Shift, type Block, type Weekday } from "../agency/types";

export interface EligibilityContext {
  /** Hours the caregiver is already booked for in the shift's week. */
  bookedHours: number;
  /** Other shifts the caregiver already holds (for time conflicts). */
  busy: { date: string; block: Block }[];
  travelLimit?: number;
}

export interface Eligibility {
  eligible: boolean;
  reasons: string[];
  travelMin: number;
}

/**
 * Hard constraints come first and are never traded off against taste:
 * availability, travel time, skills, languages, pets/smoke, personal-care gender
 * preference (a recognised privacy exception) and the weekly hours cap.
 * Taste data and audit demographics are never consulted here.
 */
export function checkEligibility(
  cg: Caregiver,
  client: Client,
  slot: { date: string; weekday: Weekday; block: Block; hours: number },
  ctx: EligibilityContext,
): Eligibility {
  const reasons: string[] = [];
  const travelMin = travelMinutes(cg.home, client.home);
  if (!(cg.availability[slot.weekday] ?? []).includes(slot.block)) reasons.push("Not available at this time");
  if (ctx.busy.some((b) => b.date === slot.date && b.block === slot.block)) reasons.push("Already booked at this time");
  if (travelMin > (ctx.travelLimit ?? TRAVEL_LIMIT_MIN)) reasons.push(`Travel ${travelMin} min exceeds limit`);
  const missing = client.requiredSkills.filter((s) => !cg.skills.includes(s));
  if (missing.length) reasons.push(`Missing skills: ${missing.map((s) => SKILL_LABEL[s]).join(", ")}`);
  const lang = client.languagesNeeded.filter((l) => !cg.languages.includes(l));
  if (lang.length) reasons.push(`Needs ${lang.join(", ")}`);
  if (client.hasPets && !cg.petsOk) reasons.push("Pet allergy / not pet-friendly");
  if (client.smoker && !cg.smokeOk) reasons.push("Smoke-free requirement");
  if (client.genderPrefPersonalCare && client.genderPrefPersonalCare !== cg.gender)
    reasons.push("Client personal-care preference");
  if (ctx.bookedHours + slot.hours > cg.maxHours) reasons.push(`Would exceed ${cg.maxHours}h weekly cap`);
  return { eligible: reasons.length === 0, reasons, travelMin };
}

/** ISO week key (Monday-based) used for the hours cap. */
export function weekKey(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function bookedHours(shifts: Shift[], caregiverId: string, date: string, excludeShiftId?: string): number {
  const wk = weekKey(date);
  return shifts
    .filter((s) => s.caregiverId === caregiverId && s.id !== excludeShiftId && s.status === "assigned" && weekKey(s.date) === wk)
    .reduce((acc, s) => acc + s.hours, 0);
}

export function busySlots(shifts: Shift[], caregiverId: string, excludeShiftId?: string) {
  return shifts
    .filter((s) => s.caregiverId === caregiverId && s.id !== excludeShiftId && s.status === "assigned")
    .map((s) => ({ date: s.date, block: s.block }));
}
