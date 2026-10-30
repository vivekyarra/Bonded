/**
 * Pre-computes everything the judge path touches and writes data/qloo-cache.json, which
 * ships with the deploy so the demo is instant and survives a Qloo hiccup.
 *   QLOO_API_KEY=... npm run warm-cache
 * Covers: all 100 synthetic profiles (so all 2,400 pair scores are pure compute), the
 * auto-match, call-out, Bridge Kits, health review, fairness audit, Try-it sample, and
 * the gold set.
 */
import fs from "node:fs";
import { getAgency } from "../src/lib/agency/sunrise";
import { openSchedules } from "../src/lib/agency/query";
import { healthReview } from "../src/lib/agent/health";
import { runCalloutAgent } from "../src/lib/agent/loop";
import { bridgeKitFor } from "../src/lib/agent/tools";
import { fairnessAudit } from "../src/lib/audit/fairness";
import { simulatedResults } from "../src/lib/audit/results";
import { env, isFixtureMode } from "../src/lib/env";
import { GOLD_SET } from "../src/lib/eval/goldset";
import { buildProfile } from "../src/lib/compat/profile";
import { BUNDLE_PATH, cacheSnapshot } from "../src/lib/qloo/cache";
import { qloo } from "../src/lib/qloo/client";
import { slimResponse } from "../src/lib/qloo/parse";
import { pairScore, personProfile, quickPairScore } from "../src/lib/service/engine";
import { autoMatchView } from "../src/lib/service/views";
import { tryIt } from "../src/lib/service/tryit";

const step = async (label: string, fn: () => Promise<unknown>) => {
  const t = Date.now();
  process.stdout.write(`• ${label}… `);
  await fn();
  console.log(`${((Date.now() - t) / 1000).toFixed(1)} s`);
};

async function main() {
  // DRY_RUN=1 with QLOO_MODE=fixture exercises every step offline without writing the bundle.
  const dry = process.env.DRY_RUN === "1";
  if (isFixtureMode() && !dry) throw new Error("warm-cache only makes sense against the live Qloo API (unset QLOO_MODE=fixture).");
  if (!isFixtureMode() && !env.qlooApiKey) throw new Error("Set QLOO_API_KEY.");
  const agency = getAgency();
  const unresolved: string[] = [];

  await step("100 taste profiles", async () => {
    for (const c of agency.clients) unresolved.push(...(await personProfile("client", c.id)).unresolved.map((u) => `${c.id}:${u}`));
    for (const g of agency.caregivers) unresolved.push(...(await personProfile("caregiver", g.id)).unresolved.map((u) => `${g.id}:${u}`));
  });
  await step("2,400 pair scores", async () => {
    for (const c of agency.clients) for (const g of agency.caregivers) await quickPairScore(c.id, g.id);
  });
  await step("auto-match + match details", async () => {
    const view = await autoMatchView(openSchedules(agency).map((s) => s.id));
    for (const p of view.proposals) {
      if (!p.caregiver) continue;
      await pairScore(p.client.id, p.caregiver.id);
      await bridgeKitFor(p.client.id, p.caregiver.id);
      for (const a of p.alternatives) await pairScore(p.client.id, a.caregiverId);
    }
  });
  await step("call-out agent + Bridge Kits", async () => {
    const res = await runCalloutAgent(agency.demo.calloutShiftId, () => {});
    for (const c of res.candidates.slice(0, 3)) await bridgeKitFor(res.clientId, c.caregiverId);
  });
  await step("story pairs", async () => {
    for (const [c, g] of [agency.demo.obviousPair, agency.demo.trapPair, agency.demo.healthPair, ["c06", "cg07"], ["c03", "cg04"]]) {
      await pairScore(c, g);
      await bridgeKitFor(c, g);
    }
  });
  await step("health review", () => healthReview());
  await step("fairness audit + results", async () => {
    await fairnessAudit(quickPairScore);
    await simulatedResults(quickPairScore);
  });
  await step("try-it sample", () =>
    tryIt([
      { name: "Ella Fitzgerald", kind: "artist" },
      { name: "The Carol Burnett Show", kind: "tv_show" },
      { name: "Casablanca", kind: "movie" },
    ]),
  );
  await step("gold set profiles", async () => {
    for (const p of GOLD_SET) {
      await buildProfile(qloo(), { personType: "client", personId: `${p.id}a`, seeds: p.a });
      await buildProfile(qloo(), { personType: "caregiver", personId: `${p.id}b`, seeds: p.b });
    }
  });

  if (dry) {
    console.log("\nDry run complete; bundle not written.");
    return;
  }
  const snap = cacheSnapshot();
  const slim = Object.fromEntries(Object.entries(snap).map(([k, e]) => [k, { ...e, response: slimResponse(e.response) }]));
  fs.writeFileSync(BUNDLE_PATH, JSON.stringify(slim));
  const mb = (fs.statSync(BUNDLE_PATH).size / 1e6).toFixed(1);
  console.log(`\nWrote ${Object.keys(slim).length} Qloo responses to ${BUNDLE_PATH} (${mb} MB).`);
  if (unresolved.length) console.log(`Favourites Qloo could not resolve (dropped, never guessed): ${unresolved.join("; ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
