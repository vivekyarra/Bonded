import { getAgency } from "../agency/sunrise";
import { byId, caregiverName, clientName } from "../agency/query";
import type { VisitFeedback } from "../agency/types";
import { rankForSchedule } from "../matcher/rank";
import { pairScore, quickPairScore } from "../service/engine";
import { llmJson } from "./llm";
import { HEALTH_LABELS, HEALTH_SYSTEM, type HealthLabel } from "./prompts";

export interface HealthFlag {
  matchKey: string;
  clientId: string;
  clientName: string;
  caregiverId: string;
  caregiverName: string;
  severity: "high" | "watch";
  trend: number;
  recentAvg: number;
  declines: number;
  labels: HealthLabel[];
  evidence: { date: string; by: string; rating: number; note?: string; labels: HealthLabel[] }[];
  suggestedAction:
    | { kind: "rematch"; caregiverId: string; caregiverName: string; taste: number; currentTaste: number; bridges: { name: string; domain: string }[] }
    | { kind: "refresh_kit"; freshBridges: { name: string; domain: string }[] }
    | { kind: "check_in" };
}

export interface HealthMatch {
  matchKey: string;
  clientId: string;
  clientName: string;
  caregiverId: string;
  caregiverName: string;
  ratings: number[];
  trend: number;
  flagged: boolean;
}

/** Least-squares slope of ratings over visit index. */
export function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return den ? num / den : 0;
}

const KEYWORDS: [HealthLabel, RegExp][] = [
  ["conflict", /\b(tense|argu|frustrat|upset|yell|disagree|angry|snapped)/i],
  ["disengagement", /\b(phone|didn'?t want to talk|quiet visit|watched (her|his) shows|ignored)/i],
  ["stale_conversation", /\b(run out of things|routine|bored|nothing to talk|same stories)/i],
  ["communication", /\b(misunderstand|couldn'?t understand|language|hearing)/i],
  ["scheduling", /\b(late|early|reschedul|missed)/i],
  ["care_quality", /\b(medication|fall|injur|missed dose|unsafe)/i],
  ["rapport", /\b(great day|laughed|loved|talked about .* for an hour|cooked together)/i],
];

/** Keyword classifier over the fixed label set (used without an LLM key, and as a fallback). */
export function classifyNote(note: string): HealthLabel[] {
  const out = KEYWORDS.filter(([, re]) => re.test(note)).map(([l]) => l);
  if (/someone else could come/i.test(note)) out.push("conflict");
  return out.length ? [...new Set(out)] : ["none"];
}

async function classifyAll(notes: string[]): Promise<{ labels: HealthLabel[][]; by: "llm" | "keywords" }> {
  if (!notes.length) return { labels: [], by: "keywords" };
  const out = await llmJson<{ items: { index: number; labels: string[] }[] }>(
    HEALTH_SYSTEM,
    notes.map((n, i) => `${i}: ${n}`).join("\n"),
    {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { index: { type: "integer" }, labels: { type: "array", items: { type: "string", enum: [...HEALTH_LABELS] } } },
            required: ["index", "labels"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  );
  if (out && out.items.length === notes.length) {
    const labels = notes.map((_, i) => {
      const l = (out.items.find((x) => x.index === i)?.labels ?? []).filter((x): x is HealthLabel => (HEALTH_LABELS as readonly string[]).includes(x));
      return l.length ? l : (["none"] as HealthLabel[]);
    });
    return { labels, by: "llm" };
  }
  return { labels: notes.map(classifyNote), by: "keywords" };
}

export function listMatches(): HealthMatch[] {
  const agency = getAgency();
  const q = byId(agency);
  const active = agency.schedules.filter((s) => s.caregiverId);
  return active.map((sc) => {
    const fb = agency.feedback.filter((f) => f.clientId === sc.clientId && f.caregiverId === sc.caregiverId).sort((a, b) => a.date.localeCompare(b.date));
    const ratings: number[] = fb.map((f) => f.rating);
    const declines = agency.declines.filter((d) => d.clientId === sc.clientId && d.caregiverId === sc.caregiverId).length;
    const trend = slope(ratings);
    const recent = ratings.slice(-3);
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 1;
    return {
      matchKey: `${sc.clientId}|${sc.caregiverId}`,
      clientId: sc.clientId,
      clientName: clientName(q.client(sc.clientId)),
      caregiverId: sc.caregiverId!,
      caregiverName: caregiverName(q.caregiver(sc.caregiverId!)),
      ratings,
      trend: Number(trend.toFixed(3)),
      flagged: (trend < -0.08 && recentAvg <= 0) || declines >= 2 || recentAvg < 0,
    };
  });
}

/** The weekly health review: trend + note labels → flags with a suggested action. A human reviews every flag. */
export async function healthReview(): Promise<{ flags: HealthFlag[]; matches: HealthMatch[]; classifiedBy: "llm" | "keywords" }> {
  const agency = getAgency();
  const matches = listMatches();
  const candidates = matches.filter((m) => m.flagged);
  const fbBy = (m: HealthMatch): VisitFeedback[] =>
    agency.feedback.filter((f) => f.clientId === m.clientId && f.caregiverId === m.caregiverId).sort((a, b) => a.date.localeCompare(b.date));
  const allNotes = candidates.flatMap((m) => fbBy(m).filter((f) => f.note).map((f) => f.note!));
  const { labels, by } = await classifyAll(allNotes);
  let cursor = 0;
  const flags: HealthFlag[] = [];
  for (const m of candidates) {
    const fb = fbBy(m);
    const evidence = fb.map((f) => ({ date: f.date, by: f.by, rating: f.rating, note: f.note, labels: f.note ? labels[cursor++] : (["none"] as HealthLabel[]) }));
    const all = [...new Set(evidence.flatMap((e) => e.labels).filter((l) => l !== "none"))];
    const declines = agency.declines.filter((d) => d.clientId === m.clientId && d.caregiverId === m.caregiverId).length;
    const recent = m.ratings.slice(-3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length);
    const severe = all.includes("conflict") || all.includes("disengagement") || declines >= 2 || recentAvg < 0;
    let suggestedAction: HealthFlag["suggestedAction"] = { kind: "check_in" };
    if (severe) {
      const sc = agency.schedules.find((s) => s.clientId === m.clientId && s.caregiverId === m.caregiverId)!;
      const freed = { ...agency, schedules: agency.schedules.map((s) => (s.id === sc.id ? { ...s, caregiverId: undefined } : s)) };
      const { candidates: alts } = await rankForSchedule(freed, sc.id, quickPairScore);
      const current = await quickPairScore(m.clientId, m.caregiverId);
      const best = alts.find((a) => a.caregiverId !== m.caregiverId);
      // Only suggest a re-match that is clearly better on taste; otherwise a human check-in.
      if (best && best.taste >= current.tasteScore + 5)
        suggestedAction = {
          kind: "rematch",
          caregiverId: best.caregiverId,
          caregiverName: caregiverName(byId(agency).caregiver(best.caregiverId)),
          taste: best.taste,
          currentTaste: current.tasteScore,
          bridges: best.bridges.slice(0, 3).map((b) => ({ name: b.name, domain: b.domain })),
        };
    } else if (all.includes("stale_conversation")) {
      const p = await pairScore(m.clientId, m.caregiverId);
      // Fresh bridges: skip the two the pair most likely already uses.
      const pick = (list: typeof p.bridges) => list.map((b) => ({ name: b.name, domain: b.domain }));
      const fresh = pick(p.bridges.slice(2));
      suggestedAction = { kind: "refresh_kit", freshBridges: fresh.length ? fresh : pick(p.bridges) };
    }
    flags.push({
      matchKey: m.matchKey,
      clientId: m.clientId,
      clientName: m.clientName,
      caregiverId: m.caregiverId,
      caregiverName: m.caregiverName,
      severity: severe ? "high" : "watch",
      trend: m.trend,
      recentAvg: Number(recentAvg.toFixed(2)),
      declines,
      labels: all,
      evidence,
      suggestedAction,
    });
  }
  flags.sort((a, b) => (a.severity === b.severity ? a.trend - b.trend : a.severity === "high" ? -1 : 1));
  return { flags, matches, classifiedBy: by };
}
