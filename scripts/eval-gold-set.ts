/**
 * Gold-set evaluation: Bonded (Qloo) vs an LLM-only baseline.
 *   QLOO_API_KEY=... ANTHROPIC_API_KEY=... npm run eval
 * Writes data/eval-results.json (shown on /evaluation) and docs/evaluation.md.
 */
import fs from "node:fs";
import path from "node:path";
import { env, hasClaude, isFixtureMode } from "../src/lib/env";
import { qloo } from "../src/lib/qloo/client";
import { runGoldSet } from "../src/lib/eval/run";

const pct = (x: number) => `${Math.round(x * 100)}%`;

async function main() {
  if (!isFixtureMode() && !env.qlooApiKey) throw new Error("Set QLOO_API_KEY (or QLOO_MODE=fixture for a dry run).");
  const res = await runGoldSet(qloo(), { qlooMode: isFixtureMode() ? "fixture" : "live", model: hasClaude() ? env.claudeModel : null, withLlm: hasClaude() });
  if (isFixtureMode()) {
    console.log("Fixture dry run (not written):", res.bonded, res.llm);
    return;
  }
  fs.writeFileSync(path.join(process.cwd(), "data", "eval-results.json"), JSON.stringify(res, null, 2));
  const md = [
    "# Evaluation: Bonded vs LLM-only",
    "",
    `Run ${res.ranAt} · Qloo ${res.qlooMode} · baseline model ${res.model ?? "not run (no ANTHROPIC_API_KEY)"}`,
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
    "| Pair | Label | Bonded | LLM-only | Top Qloo bridges |",
    "|---|---|---|---|---|",
    ...res.rows.map((r) => `| ${r.id} ${r.note} | ${r.compatible ? "compatible" : "incompatible"} | ${r.bonded} | ${r.llm ?? "—"} | ${r.bridges.join(", ") || "—"} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(process.cwd(), "docs", "evaluation.md"), md);
  console.log(md);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
