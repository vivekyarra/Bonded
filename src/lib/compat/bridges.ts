import type { QlooClient } from "../qloo/client";
import { DOMAINS, DOMAIN_KIND, type Domain } from "../qloo/types";
import { AGENCY_LOCATION } from "./profile";
import type { Bridge, ProfileEntity, TasteProfile } from "./types";

export const MAX_BRIDGES = 5;
export const MAX_PER_DOMAIN = 2;

function seedNames(p: TasteProfile, e: ProfileEntity | undefined): string[] {
  if (!e?.explainedBy?.length) return [];
  const byId = new Map(p.seeds.map((s) => [s.qlooId, s.name]));
  return e.explainedBy.map((id) => byId.get(id)).filter((x): x is string => Boolean(x));
}

/**
 * Step 4: bridges are entities scored highly by BOTH people, ranked by min(affinity),
 * at most two per domain for variety.
 */
export function findBridges(a: TasteProfile, b: TasteProfile, max = MAX_BRIDGES): Bridge[] {
  const candidates: Bridge[] = [];
  const seedIdsA = new Set(a.seeds.map((s) => s.qlooId));
  const seedIdsB = new Set(b.seeds.map((s) => s.qlooId));
  for (const d of DOMAINS) {
    for (const [id, ea] of Object.entries(a.domains[d])) {
      const eb = b.domains[d][id];
      if (!eb) continue;
      candidates.push({
        entityId: id,
        name: ea.name,
        kind: ea.kind,
        domain: d,
        strength: Math.min(ea.affinity, eb.affinity),
        affinityA: ea.affinity,
        affinityB: eb.affinity,
        seedsA: seedNames(a, ea),
        seedsB: seedNames(b, eb),
        weaker: false,
        sharedSeed: seedIdsA.has(id) && seedIdsB.has(id),
      });
    }
  }
  return pickDiverse(candidates, max);
}

export function pickDiverse(candidates: Bridge[], max: number): Bridge[] {
  const sorted = [...candidates].sort((x, y) => y.strength - x.strength || x.name.localeCompare(y.name));
  const perDomain = new Map<Domain, number>();
  const names = new Set<string>();
  const out: Bridge[] = [];
  for (const c of sorted) {
    if (out.length >= max) break;
    // The same title can exist as several Qloo entities (e.g. an artist and a biopic): show it once.
    const key = c.name.trim().toLowerCase();
    if (names.has(key)) continue;
    const n = perDomain.get(c.domain) ?? 0;
    if (n >= MAX_PER_DOMAIN) continue;
    perDomain.set(c.domain, n + 1);
    names.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Fallback for pairs with fewer than 3 bridges: ask Qloo with the UNION of both people's
 * seeds, keep results that appear in at least one individual profile, and label them
 * "weaker bridges". Every entity still comes from a Qloo response.
 */
export async function unionBridges(qloo: QlooClient, a: TasteProfile, b: TasteProfile, existing: Bridge[]): Promise<Bridge[]> {
  if (existing.length >= 3) return existing;
  const ids = [...new Set([...a.seeds, ...b.seeds].map((s) => s.qlooId))];
  if (!ids.length) return existing;
  const have = new Set(existing.map((x) => x.entityId));
  const extra: Bridge[] = [];
  await Promise.all(
    DOMAINS.map(async (d) => {
      const kind = DOMAIN_KIND[d];
      try {
        const res = await qloo.insights({
          kind,
          entityIds: ids,
          take: 30,
          locationQuery: kind === "place" ? AGENCY_LOCATION : undefined,
        });
        for (const e of res.data) {
          const ea = a.domains[d][e.id];
          const eb = b.domains[d][e.id];
          if (have.has(e.id) || (!ea && !eb)) continue;
          extra.push({
            entityId: e.id,
            name: e.name,
            kind,
            domain: d,
            strength: (e.affinity ?? 0) * 0.5,
            affinityA: ea?.affinity ?? null,
            affinityB: eb?.affinity ?? null,
            seedsA: seedNames(a, ea),
            seedsB: seedNames(b, eb),
            weaker: true,
            sharedSeed: false,
          });
        }
      } catch {
        /* fallback is best-effort */
      }
    }),
  );
  const needed = Math.max(0, 3 - existing.length);
  const used = new Map<Domain, number>();
  for (const x of existing) used.set(x.domain, (used.get(x.domain) ?? 0) + 1);
  const picked = pickDiverse(
    extra.filter((x) => (used.get(x.domain) ?? 0) < MAX_PER_DOMAIN),
    needed,
  );
  return [...existing, ...picked];
}
