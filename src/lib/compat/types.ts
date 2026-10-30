import type { Domain, EntityKind } from "../qloo/types";

export type PersonType = "client" | "caregiver" | "guest";

/** A favourite as typed at intake. */
export interface SeedInput {
  name: string;
  kind: EntityKind;
  source?: "intake" | "era";
}

/** A favourite resolved to a Qloo entity. */
export interface ResolvedSeed {
  qlooId: string;
  name: string;
  kind: EntityKind;
  input: string;
  source: "intake" | "era";
}

export interface ProfileEntity {
  id: string;
  name: string;
  kind: EntityKind;
  affinity: number;
  explainedBy?: string[];
}

/** A person's Qloo-expanded taste profile: per domain, entity id -> entity. */
export interface TasteProfile {
  personType: PersonType;
  personId: string;
  seeds: ResolvedSeed[];
  unresolved: string[];
  domains: Record<Domain, Record<string, ProfileEntity>>;
  builtAt: string;
  cached: boolean;
}

export interface Bridge {
  entityId: string;
  name: string;
  kind: EntityKind;
  domain: Domain;
  /** min(affinity_client, affinity_caregiver): it must matter to both people. */
  strength: number;
  affinityA: number | null;
  affinityB: number | null;
  /** Seeds (by name) on each side that Qloo reports as producing this entity. */
  seedsA: string[];
  seedsB: string[];
  weaker: boolean;
  /** True when the bridge is literally one of both people's favourites. */
  sharedSeed: boolean;
}

export interface FrictionNote {
  domain: Domain;
  text: string;
}

export interface PairScore {
  aId: string;
  bId: string;
  tasteScore: number;
  raw: number;
  seedBonus: number;
  perDomain: Record<Domain, { overlap: number; weight: number; shared: number; union: number }>;
  bridges: Bridge[];
  friction: FrictionNote[];
}

export type DomainWeights = Record<Domain, number>;

export const DEFAULT_WEIGHTS: DomainWeights = {
  music: 0.3,
  tv: 0.25,
  film: 0.15,
  food: 0.2,
  books: 0.1,
};
