/** Qloo entity types Bonded uses. Values are Qloo URNs. */
export const ENTITY_TYPES = {
  artist: "urn:entity:artist",
  movie: "urn:entity:movie",
  tv_show: "urn:entity:tv_show",
  book: "urn:entity:book",
  place: "urn:entity:place",
  brand: "urn:entity:brand",
} as const;

export type EntityKind = keyof typeof ENTITY_TYPES;
export type EntityUrn = (typeof ENTITY_TYPES)[EntityKind];

/** Taste domains used for scoring. Each domain is expanded with one insights call. */
export const DOMAINS = ["music", "tv", "film", "food", "books"] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_KIND: Record<Domain, EntityKind> = {
  music: "artist",
  tv: "tv_show",
  film: "movie",
  food: "place",
  books: "book",
};

export const DOMAIN_LABEL: Record<Domain, string> = {
  music: "Music",
  tv: "TV",
  film: "Film",
  food: "Local places",
  books: "Books",
};

export function kindToDomain(kind: EntityKind): Domain | null {
  const hit = (Object.keys(DOMAIN_KIND) as Domain[]).find((d) => DOMAIN_KIND[d] === kind);
  return hit ?? null;
}

export function urnToKind(urn: string | undefined): EntityKind | null {
  if (!urn) return null;
  const hit = (Object.keys(ENTITY_TYPES) as EntityKind[]).find((k) => ENTITY_TYPES[k] === urn);
  return hit ?? null;
}

/** A normalised Qloo entity. `id` is always the Qloo entity_id. */
export interface QlooEntity {
  id: string;
  name: string;
  kind: EntityKind | null;
  /** Affinity 0..1 from an insights call (absent on search results). */
  affinity?: number;
  popularity?: number;
  image?: string;
  description?: string;
  year?: string;
  address?: string;
  /** Coordinates (places). */
  lat?: number;
  lng?: number;
  /** Seed entity ids that Qloo reports as contributing to this result (explainability). */
  explainedBy?: string[];
}

export interface InsightsRequest {
  kind: EntityKind;
  entityIds: string[];
  take?: number;
  /** Required by Qloo for place results. */
  locationQuery?: string;
  /** Optional Qloo demographic signal, e.g. "55_and_older". */
  ageSignal?: string;
}

/** Wrapper telling the UI whether data came from cache. */
export interface QlooResult<T> {
  data: T;
  cached: boolean;
  source: "memory" | "bundle" | "disk" | "network" | "fixture";
}

export type QlooParams = Record<string, string>;

/** Low-level transport: GET path with query params, returns parsed JSON. */
export type QlooTransport = (path: string, params: QlooParams) => Promise<unknown>;

export class QlooError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "QlooError";
  }
}
