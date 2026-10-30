import { qloo } from "@/lib/qloo/client";
import { isEntityKind, rateLimit } from "@/lib/service/guard";
import { fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";

/** Server-side proxy for intake autocomplete. The Qloo key never reaches the browser. */
export async function GET(req: Request) {
  const limited = rateLimit(req, "search", 90);
  if (limited) return limited;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const type = url.searchParams.get("type");
  if (q.length < 2) return json({ results: [] });
  if (type !== null && !isEntityKind(type)) return json({ error: "type must be one of artist, movie, tv_show, book, place, brand" }, 400);
  try {
    const res = await qloo().search(q, type ?? undefined, 6);
    return json({ results: res.data.map((e) => ({ id: e.id, name: e.name, kind: e.kind, year: e.year, image: e.image })), cached: res.cached });
  } catch (err) {
    return fail(err);
  }
}
