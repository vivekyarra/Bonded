import type { QlooClient } from "../qloo/client";
import { DOMAINS, DOMAIN_KIND, type Domain, type QlooEntity } from "../qloo/types";
import type { PersonType, ProfileEntity, ResolvedSeed, SeedInput, TasteProfile } from "./types";

export const AGENCY_LOCATION = "Phoenix";
export const PROFILE_TAKE = 50;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const AGENCY_CENTER = { lat: 33.4484, lng: -112.074 };
export const PLACE_RADIUS_KM = 80;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * Prefer an exact (accent/case-insensitive) name match, else Qloo's top result.
 * Places must be in the agency's metro: a "Durant's" in Riyadh is not the Phoenix steakhouse.
 */
export function pickSearchHit(input: string, hits: QlooEntity[], near?: { lat: number; lng: number }): QlooEntity | null {
  let pool = hits;
  if (near) pool = hits.filter((h) => h.lat !== undefined && h.lng !== undefined && distanceKm(near, { lat: h.lat, lng: h.lng }) <= PLACE_RADIUS_KM);
  if (!pool.length) return null;
  const n = norm(input);
  return pool.find((h) => norm(h.name) === n) ?? pool[0];
}

/** Step 1: resolve every favourite to a Qloo entity id. Unresolved seeds are reported, never guessed. */
export async function resolveSeeds(
  qloo: QlooClient,
  seeds: SeedInput[],
): Promise<{ resolved: ResolvedSeed[]; unresolved: string[]; cached: boolean }> {
  let cached = true;
  let firstError: unknown = null;
  const results = await Promise.all(
    seeds.map(async (s) => {
      try {
        const res = await qloo.search(s.name, s.kind, s.kind === "place" ? 10 : 5);
        cached &&= res.cached;
        const hit = pickSearchHit(s.name, res.data, s.kind === "place" ? AGENCY_CENTER : undefined);
        return hit
          ? ({ qlooId: hit.id, name: hit.name, kind: s.kind, input: s.name, source: s.source ?? "intake" } as ResolvedSeed)
          : null;
      } catch (err) {
        cached = false;
        firstError ??= err;
        return null;
      }
    }),
  );
  // If Qloo failed for every seed, surface the outage instead of an empty profile.
  if (firstError && results.every((r) => r === null)) throw firstError;
  const resolved: ResolvedSeed[] = [];
  const unresolved: string[] = [];
  const seen = new Set<string>();
  results.forEach((r, i) => {
    if (!r) unresolved.push(seeds[i].name);
    else if (!seen.has(r.qlooId)) {
      seen.add(r.qlooId);
      resolved.push(r);
    }
  });
  return { resolved, unresolved, cached };
}

export function emptyDomains(): Record<Domain, Record<string, ProfileEntity>> {
  return { music: {}, tv: {}, film: {}, food: {}, books: {} };
}

/**
 * Step 2: expand the seeds into a cross-domain profile — one insights call per domain,
 * all of the person's seeds as the signal.
 */
export async function expandProfile(
  qloo: QlooClient,
  seeds: ResolvedSeed[],
  opts: { ageSignal?: string } = {},
): Promise<{ domains: Record<Domain, Record<string, ProfileEntity>>; cached: boolean }> {
  const domains = emptyDomains();
  if (!seeds.length) return { domains, cached: true };
  let cached = true;
  let failures = 0;
  let firstError: unknown = null;
  const ids = seeds.map((s) => s.qlooId);
  await Promise.all(
    DOMAINS.map(async (domain) => {
      const kind = DOMAIN_KIND[domain];
      try {
        const res = await qloo.insights({
          kind,
          entityIds: ids,
          take: PROFILE_TAKE,
          locationQuery: kind === "place" ? AGENCY_LOCATION : undefined,
          ageSignal: opts.ageSignal,
        });
        cached &&= res.cached;
        for (const e of res.data) {
          domains[domain][e.id] = {
            id: e.id,
            name: e.name,
            kind,
            affinity: e.affinity ?? 0,
            explainedBy: e.explainedBy,
          };
        }
      } catch (err) {
        cached = false;
        failures++;
        firstError ??= err;
      }
      // A person's own favourite always belongs in their profile at full affinity.
      for (const s of seeds) {
        if (s.kind === kind) {
          domains[domain][s.qlooId] = {
            ...(domains[domain][s.qlooId] ?? {}),
            id: s.qlooId,
            name: s.name,
            kind,
            affinity: 1,
            explainedBy: [s.qlooId],
          };
        }
      }
    }),
  );
  if (failures === DOMAINS.length) throw firstError;
  return { domains, cached };
}

export async function buildProfile(
  qloo: QlooClient,
  person: { personType: PersonType; personId: string; seeds: SeedInput[]; ageSignal?: string },
): Promise<TasteProfile> {
  const { resolved, unresolved, cached: c1 } = await resolveSeeds(qloo, person.seeds);
  const { domains, cached: c2 } = await expandProfile(qloo, resolved, { ageSignal: person.ageSignal });
  return {
    personType: person.personType,
    personId: person.personId,
    seeds: resolved,
    unresolved,
    domains,
    builtAt: new Date().toISOString(),
    cached: c1 && c2,
  };
}

/** Top-n entities of a domain by affinity. */
export function topEntities(profile: TasteProfile, domain: Domain, n: number): ProfileEntity[] {
  return Object.values(profile.domains[domain])
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, n);
}

export function profileSize(profile: TasteProfile): number {
  return DOMAINS.reduce((acc, d) => acc + Object.keys(profile.domains[d]).length, 0);
}
