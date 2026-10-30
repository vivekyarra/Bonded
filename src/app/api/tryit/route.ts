import type { SeedInput } from "@/lib/compat/types";
import { tryIt } from "@/lib/service/tryit";
import { rateLimit } from "@/lib/service/guard";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const limited = rateLimit(req, "tryit", 15);
  if (limited) return limited;
  const { favourites } = await body<{ favourites: unknown }>(req);
  if (favourites !== undefined && !Array.isArray(favourites)) return json({ error: "favourites must be a list" }, 400);
  try {
    return json(await tryIt((favourites ?? []) as SeedInput[]));
  } catch (err) {
    if (err instanceof Error && /favourites/.test(err.message)) return json({ error: err.message }, 400);
    return fail(err);
  }
}
