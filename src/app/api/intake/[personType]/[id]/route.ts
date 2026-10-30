import type { SeedInput } from "@/lib/compat/types";
import { guestProfile } from "@/lib/service/engine";
import { profileSummary } from "@/lib/service/views";
import { isEntityKind, rateLimit } from "@/lib/service/guard";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Intake preview: seeds → resolve via Qloo → build profile. The demo is stateless and
 * synthetic, so nothing is stored; a real deployment would persist the TasteSeed rows.
 */
export async function POST(req: Request, { params }: { params: { personType: string; id: string } }) {
  if (!["client", "caregiver"].includes(params.personType)) return json({ error: "personType must be client or caregiver" }, 400);
  const limited = rateLimit(req, "intake", 15);
  if (limited) return limited;
  const { seeds } = await body<{ seeds: unknown }>(req);
  const list = Array.isArray(seeds) ? (seeds as SeedInput[]) : [];
  const clean = list
    .filter((s) => s && typeof s === "object" && typeof s.name === "string" && s.name.trim() && isEntityKind(s.kind))
    .map((s) => ({ name: s.name.trim().slice(0, 80), kind: s.kind, source: "intake" as const }))
    .slice(0, 8);
  if (clean.length < 3) return json({ error: "Name at least 3 favourites" }, 400);
  try {
    const p = await guestProfile(clean);
    return json({ personType: params.personType, id: params.id, stored: false, ...profileSummary(p) });
  } catch (err) {
    return fail(err);
  }
}
