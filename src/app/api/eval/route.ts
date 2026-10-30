import fs from "node:fs";
import path from "node:path";
import { GOLD_SET } from "@/lib/eval/goldset";
import { json } from "@/lib/service/http";

export const dynamic = "force-dynamic";

/** Gold-set results produced by `npm run eval` (or the warm-cache workflow). */
export function GET() {
  const gold = GOLD_SET.map((g) => ({ id: g.id, note: g.note, compatible: g.compatible, a: g.a.map((x) => x.name), b: g.b.map((x) => x.name) }));
  try {
    const results = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "eval-results.json"), "utf8"));
    return json({ status: "ok", results, gold });
  } catch {
    return json({ status: "not_run", gold });
  }
}
