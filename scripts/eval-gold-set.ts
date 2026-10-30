/**
 * Gold-set evaluation: Bonded (Qloo) vs an LLM-only baseline.
 *   QLOO_API_KEY=... GEMINI_API_KEY=... npm run eval
 * Writes data/eval-results.json (shown on /evaluation) and docs/evaluation.md.
 */
import fs from "node:fs";
import path from "node:path";
import { env, hasLlm, isFixtureMode } from "../src/lib/env";
import { qloo } from "../src/lib/qloo/client";
import { runGoldSet } from "../src/lib/eval/run";

const pct = (x: number) => `${Math.round(x * 100)}%`;

async function main() {
  if (!isFixtureMode() && !env.qlooApiKey) throw new Error("Set QLOO_API_KEY (or QLOO_MODE=fixture for a dry run).");
  const res = await runGoldSet(qloo(), { qlooMode: isFixtureMode() ? "fixture" : "live", model: hasLlm() ? env.geminiModel : null, withLlm: hasLlm() });
  if (isFixtureMode()) {
    console.log("Fixture dry run (not written):", res.bonded, res.llm);
    return;
  }
  // Only our own scores are committed; Qloo entity names stay out of the public repo.
  const publishable = { ...res, rows: res.rows.map(({ bridges: _b, ...r }) => (void _b, r)) };
  fs.writeFileSync(path.join(process.cwd(), "data", "eval-results.json"), JSON.stringify(publishable, null, 2));
  const md = [
    "# Evaluation: Bonded vs LLM-only",
    "",
    `Run ${res.ranAt} · Qloo ${res.qlooMode} · baseline model ${res.model ?? "not run (no GEMINI_API_KEY)"}`,
    "",
    "Twenty hand-written synthetic pairs (`src/lib/eval/goldset.ts`): ten obviously compatible, ten obviously not. Labels were written before any engine run.",
    "",
    "- **Separation** = share of (compatible, incompatible) pairs where the compatible pair scored higher (ROC AUC; 50% = chance).",
    `- **Accuracy** = share of pairs on the right side of a score of ${res.threshold}.`,
    "",
    "| | Separation | Accuracy |",
    "|---|---|---|",
    `| Bonded (Qloo taste graph) | ${pct(res.bonded.separation)} | ${pct(res.bonded.accuracy)} |`,
    `| LLM-only (raw favourites) | ${res.llm ? pct(res.llm.separation) : "—"} | ${res.llm ? pct(res.llm.accuracy) : "—"} |`,
    "",
    "| Pair | Label | Bonded | LLM-only |",
    "|---|---|---|---|",
    ...res.rows.map((r) => `| ${r.id} ${r.note} | ${r.compatible ? "compatible" : "incompatible"} | ${r.bonded} | ${r.llm ?? "—"} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(process.cwd(), "docs", "evaluation.md"), md);
  console.log(md);
  for (const r of res.rows) console.log(`${r.id} bridges: ${r.bridges.join(", ") || "—"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
