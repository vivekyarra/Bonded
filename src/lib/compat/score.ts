import { DOMAINS, type Domain } from "../qloo/types";
import { findBridges } from "./bridges";
import { DEFAULT_WEIGHTS, type DomainWeights, type FrictionNote, type PairScore, type TasteProfile } from "./types";
import { topEntities } from "./profile";
import { DOMAIN_LABEL } from "../qloo/types";

/**
 * Calibration: on live Qloo data, weighted Jaccard over 50-entity profiles mostly falls
 * between 0.02 and 0.3, so the raw sum is mapped onto 0–100 with a saturating curve
 * (raw 0.05 → 33, 0.1 → 55, 0.2 → 80). K was set so the synthetic agency's median pair
 * lands near 40. The mapping is monotonic, so ranking (and the gold-set separation
 * metric) is identical to the raw formula in the spec.
 */
export const CALIBRATION_K = 8;
export const calibrate = (raw: number) => 1 - Math.exp(-CALIBRATION_K * Math.max(0, raw));

export const SEED_BONUS_EACH = 0.02;
export const SEED_BONUS_CAP = 0.1;

/** Weighted Jaccard: Σ_shared min(a,b) / Σ_union max(a,b). */
export function weightedJaccard(a: Record<string, { affinity: number }>, b: Record<string, { affinity: number }>) {
  let num = 0;
  let den = 0;
  let shared = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const x = a[k]?.affinity ?? 0;
    const y = b[k]?.affinity ?? 0;
    if (a[k] && b[k]) shared++;
    num += Math.min(x, y);
    den += Math.max(x, y);
  }
  return { overlap: den > 0 ? num / den : 0, shared, union: keys.size };
}

/** Small boost when a raw favourite of one person appears in the other's expanded profile. */
export function seedBonus(a: TasteProfile, b: TasteProfile): number {
  const inProfile = (p: TasteProfile, id: string) => DOMAINS.some((d) => id in p.domains[d]);
  const hits =
    a.seeds.filter((s) => inProfile(b, s.qlooId)).length + b.seeds.filter((s) => inProfile(a, s.qlooId)).length;
  return Math.min(SEED_BONUS_CAP, hits * SEED_BONUS_EACH);
}

const hasData = (p: TasteProfile, d: Domain) => Object.keys(p.domains[d]).length > 0;

export function frictionNotes(a: TasteProfile, b: TasteProfile, perDomain: PairScore["perDomain"], bridges: PairScore["bridges"] = []): FrictionNote[] {
  const notes: FrictionNote[] = [];
  for (const d of DOMAINS) {
    if (!hasData(a, d) || !hasData(b, d)) continue;
    // Only a real gap: almost no overlap and no bridge found in this domain.
    if (perDomain[d].overlap >= 0.03 || bridges.some((x) => x.domain === d)) continue;
    const ta = topEntities(a, d, 1)[0]?.name;
    const tb = topEntities(b, d, 1)[0]?.name;
    if (!ta || !tb) continue;
    notes.push({ domain: d, text: `Little shared ${DOMAIN_LABEL[d].toLowerCase() === "tv" ? "TV" : DOMAIN_LABEL[d].toLowerCase()}: ${ta} vs ${tb}.` });
  }
  return notes.slice(0, 2);
}

/**
 * Step 3: pair score. Domains where either person has no Qloo data are dropped and the
 * remaining weights renormalised, so a thin profile is not punished twice.
 */
export function scorePair(a: TasteProfile, b: TasteProfile, weights: DomainWeights = DEFAULT_WEIGHTS): PairScore {
  const perDomain = {} as PairScore["perDomain"];
  let wSum = 0;
  for (const d of DOMAINS) {
    const usable = hasData(a, d) && hasData(b, d);
    const j = weightedJaccard(a.domains[d], b.domains[d]);
    perDomain[d] = { ...j, weight: usable ? weights[d] : 0 };
    wSum += perDomain[d].weight;
  }
  let raw = 0;
  for (const d of DOMAINS) {
    if (wSum > 0) perDomain[d].weight = perDomain[d].weight / wSum;
    raw += perDomain[d].weight * perDomain[d].overlap;
  }
  const bonus = wSum > 0 ? seedBonus(a, b) : 0;
  const tasteScore = Math.round(100 * Math.min(1, calibrate(raw + bonus)));
  const bridges = findBridges(a, b);
  return {
    aId: a.personId,
    bId: b.personId,
    tasteScore,
    raw: Number(raw.toFixed(4)),
    seedBonus: bonus,
    perDomain,
    bridges,
    friction: frictionNotes(a, b, perDomain, bridges),
  };
}
