import { type QlooEntity, urnToKind, type EntityKind } from "./types";

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * Pull the entity list out of a Qloo response. The search endpoint returns
 * `{ results: [...] }` and insights returns `{ results: { entities: [...] } }`;
 * both shapes (and a bare array) are accepted.
 */
export function extractEntityList(body: unknown): Json[] {
  if (Array.isArray(body)) return body.filter(isObj);
  if (!isObj(body)) return [];
  const results = body.results;
  if (Array.isArray(results)) return results.filter(isObj);
  if (isObj(results)) {
    if (Array.isArray(results.entities)) return results.entities.filter(isObj);
    if (Array.isArray(results.results)) return results.results.filter(isObj);
  }
  if (Array.isArray(body.entities)) return body.entities.filter(isObj);
  return [];
}

function entityKind(raw: Json, fallback: EntityKind | null): EntityKind | null {
  const direct = urnToKind(str(raw.type));
  if (direct) return direct;
  if (Array.isArray(raw.types)) {
    for (const t of raw.types) {
      const k = urnToKind(str(t));
      if (k) return k;
    }
  }
  const sub = str(raw.subtype);
  if (sub?.startsWith("urn:entity:")) {
    const k = urnToKind(sub);
    if (k) return k;
  }
  return fallback;
}

function explainedBy(query: Json | undefined): string[] | undefined {
  if (!query) return undefined;
  const ex = query.explainability;
  if (!isObj(ex)) return undefined;
  const signal = isObj(ex.signal) ? ex.signal : ex;
  const interests = isObj(signal.interests) ? signal.interests : signal;
  const list = Array.isArray(interests.entities) ? interests.entities : Array.isArray(ex.entities) ? ex.entities : [];
  const ids = list
    .map((e) => (isObj(e) ? str(e.entity_id) ?? str(e.id) : str(e)))
    .filter((x): x is string => Boolean(x));
  return ids.length ? ids : undefined;
}

export function parseEntity(raw: Json, fallbackKind: EntityKind | null): QlooEntity | null {
  const id = str(raw.entity_id) ?? str(raw.id);
  const name = str(raw.name);
  if (!id || !name) return null;
  const props = isObj(raw.properties) ? raw.properties : {};
  const query = isObj(raw.query) ? raw.query : undefined;
  const image = isObj(props.image) ? str(props.image.url) : str(props.image);
  const affinity = num(query?.affinity) ?? num(raw.affinity) ?? num(raw.score);
  return {
    id,
    name,
    kind: entityKind(raw, fallbackKind),
    affinity: affinity === undefined ? undefined : Math.max(0, Math.min(1, affinity)),
    popularity: num(raw.popularity),
    image,
    description: str(props.short_description) ?? str(props.description),
    year: str(props.release_year) ?? (num(props.release_year) !== undefined ? String(props.release_year) : undefined) ?? str(props.publication_year),
    address: str(props.address),
    explainedBy: explainedBy(query),
  };
}

export function parseEntities(body: unknown, fallbackKind: EntityKind | null): QlooEntity[] {
  const out: QlooEntity[] = [];
  const seen = new Set<string>();
  for (const raw of extractEntityList(body)) {
    const e = parseEntity(raw, fallbackKind);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out;
}

/**
 * Some Qloo responses omit affinity. Fill gaps with a rank-based score so the
 * ordering Qloo returned is preserved (rank 0 -> 1.0, last -> ~0.3).
 */
export function ensureAffinity(entities: QlooEntity[]): QlooEntity[] {
  const n = entities.length;
  return entities.map((e, i) =>
    e.affinity !== undefined ? e : { ...e, affinity: n <= 1 ? 1 : 1 - (0.7 * i) / (n - 1) },
  );
}
