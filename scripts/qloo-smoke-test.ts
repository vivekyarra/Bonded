/**
 * Day-1 smoke test: confirms /search and /v2/insights return real data and prints the
 * response shape. Run with:  QLOO_API_KEY=... npm run qloo:smoke
 */
import { QlooClient, httpTransport } from "../src/lib/qloo/client";

async function main() {
  if (!process.env.QLOO_API_KEY) {
    console.error("Set QLOO_API_KEY first (see .env.example).");
    process.exit(1);
  }
  const client = new QlooClient(httpTransport);

  const raw = await httpTransport("/search", { query: "Selena", types: "urn:entity:artist", take: "3" });
  console.log("RAW /search (truncated):\n", JSON.stringify(raw, null, 2).slice(0, 1500));

  const search = await client.search("Selena", "artist", 3);
  console.log("\nParsed search:", search.data.map((e) => `${e.name} [${e.id}]`));
  if (!search.data.length) throw new Error("search returned nothing");

  const seed = search.data[0].id;
  for (const kind of ["artist", "tv_show", "movie", "book"] as const) {
    const res = await client.insights({ kind, entityIds: [seed], take: 5 });
    console.log(`\ninsights ${kind}:`, res.data.map((e) => `${e.name} (${e.affinity?.toFixed(2)})`));
  }
  const places = await client.insights({ kind: "place", entityIds: [seed], take: 5, locationQuery: "Phoenix" });
  console.log("\ninsights place (Phoenix):", places.data.map((e) => `${e.name} (${e.affinity?.toFixed(2)})`));
  console.log("\nSmoke test passed.");
}

main().catch((err) => {
  console.error("Smoke test FAILED:", err);
  process.exit(1);
});
