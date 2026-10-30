import { getAgency } from "../agency/sunrise";
import { byId } from "../agency/query";
import { unionBridges } from "../compat/bridges";
import { buildProfile } from "../compat/profile";
import { scorePair } from "../compat/score";
import type { PairScore, SeedInput, TasteProfile } from "../compat/types";
import { qloo } from "../qloo/client";

/**
 * Glue between the agency data, the Qloo client and the pure engine.
 * Profiles and pair scores are memoised per server instance; Qloo responses underneath
 * are cached (bundle → disk → memory), so repeat requests never hit the API.
 */
const profiles = new Map<string, Promise<TasteProfile>>();
const pairs = new Map<string, Promise<PairScore>>();

export function personProfile(personType: "client" | "caregiver", personId: string): Promise<TasteProfile> {
  const key = `${personType}:${personId}`;
  let p = profiles.get(key);
  if (!p) {
    const q = byId(getAgency());
    const person = personType === "client" ? q.client(personId) : q.caregiver(personId);
    p = buildProfile(qloo(), { personType, personId, seeds: person.seeds }).catch((err) => {
      profiles.delete(key);
      throw err;
    });
    profiles.set(key, p);
  }
  return p;
}

export function guestProfile(seeds: SeedInput[]): Promise<TasteProfile> {
  return buildProfile(qloo(), { personType: "guest", personId: "guest", seeds });
}

/** Full pair score including the union-signal fallback for thin bridge lists. */
export function pairScore(clientId: string, caregiverId: string): Promise<PairScore> {
  const key = `${clientId}|${caregiverId}`;
  let p = pairs.get(key);
  if (!p) {
    p = (async () => {
      const [a, b] = await Promise.all([personProfile("client", clientId), personProfile("caregiver", caregiverId)]);
      const score = scorePair(a, b);
      score.bridges = await unionBridges(qloo(), a, b, score.bridges);
      return score;
    })().catch((err) => {
      pairs.delete(key);
      throw err;
    });
    pairs.set(key, p);
  }
  return p;
}

/** Fast variant used when ranking many caregivers: no fallback calls. */
export async function quickPairScore(clientId: string, caregiverId: string): Promise<PairScore> {
  const [a, b] = await Promise.all([personProfile("client", clientId), personProfile("caregiver", caregiverId)]);
  return scorePair(a, b);
}
