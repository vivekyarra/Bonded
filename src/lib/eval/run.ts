import { claudeJson } from "../agent/claude";
import { separation } from "../audit/stats";
import { buildProfile } from "../compat/profile";
import { scorePair } from "../compat/score";
import type { QlooClient } from "../qloo/client";
import { GOLD_SET, type GoldPair } from "./goldset";

export const THRESHOLD = 50;

export interface EvalRow {
  id: string;
  note: string;
  compatible: boolean;
  bonded: number;
  bridges: string[];
  llm: number | null;
}

export interface EvalSummary {
  ranAt: string;
  qlooMode: string;
  model: string | null;
  n: number;
  bonded: { separation: number; accuracy: number };
  llm: { separation: number; accuracy: number } | null;
  threshold: number;
  rows: EvalRow[];
}

async function llmScore(p: GoldPair): Promise<number | null> {
  const out = await claudeJson<{ score: number }>(
    "Estimate how well two people would get along over months of home-care visits, using only their favourites. Return a 0-100 score.",
    JSON.stringify({ person_a_favourites: p.a.map((x) => x.name), person_b_favourites: p.b.map((x) => x.name) }),
    { type: "object", properties: { score: { type: "integer" } }, required: ["score"], additionalProperties: false },
  );
  return out ? Math.max(0, Math.min(100, out.score)) : null;
}

const accuracy = (rows: { compatible: boolean; score: number }[]) =>
  rows.length ? rows.filter((r) => (r.score >= THRESHOLD) === r.compatible).length / rows.length : 0;

/** Runs the gold set through the Qloo engine and (if a key is set) the LLM-only baseline. */
export async function runGoldSet(qloo: QlooClient, opts: { qlooMode: string; model: string | null; withLlm: boolean }): Promise<EvalSummary> {
  const rows: EvalRow[] = [];
  for (const p of GOLD_SET) {
    const [a, b] = await Promise.all([
      buildProfile(qloo, { personType: "client", personId: `${p.id}a`, seeds: p.a }),
      buildProfile(qloo, { personType: "caregiver", personId: `${p.id}b`, seeds: p.b }),
    ]);
    const s = scorePair(a, b);
    rows.push({ id: p.id, note: p.note, compatible: p.compatible, bonded: s.tasteScore, bridges: s.bridges.slice(0, 3).map((x) => x.name), llm: opts.withLlm ? await llmScore(p) : null });
  }
  const pos = rows.filter((r) => r.compatible);
  const neg = rows.filter((r) => !r.compatible);
  const llmRows = rows.filter((r) => r.llm !== null);
  return {
    ranAt: new Date().toISOString(),
    qlooMode: opts.qlooMode,
    model: opts.model,
    n: rows.length,
    threshold: THRESHOLD,
    bonded: {
      separation: separation(pos.map((r) => r.bonded), neg.map((r) => r.bonded)),
      accuracy: accuracy(rows.map((r) => ({ compatible: r.compatible, score: r.bonded }))),
    },
    llm:
      llmRows.length === rows.length
        ? {
            separation: separation(pos.map((r) => r.llm!), neg.map((r) => r.llm!)),
            accuracy: accuracy(rows.map((r) => ({ compatible: r.compatible, score: r.llm! }))),
          }
        : null,
    rows,
  };
}
