import type { SeedInput } from "@/lib/compat/types";
import { tryIt } from "@/lib/service/tryit";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { favourites } = await body<{ favourites: SeedInput[] }>(req);
  try {
    return json(await tryIt(favourites ?? []));
  } catch (err) {
    if (err instanceof Error && /favourites/.test(err.message)) return json({ error: err.message }, 400);
    return fail(err);
  }
}
