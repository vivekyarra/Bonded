import { describe, expect, it } from "vitest";
import { QlooClient } from "../qloo/client";
import { fixtureTransport } from "../qloo/fixture";
import type { Domain } from "../qloo/types";
import { findBridges, unionBridges } from "./bridges";
import { buildProfile, emptyDomains, pickSearchHit } from "./profile";
import { calibrate, scorePair, weightedJaccard } from "./score";
import type { ProfileEntity, TasteProfile } from "./types";

function profile(id: string, data: Partial<Record<Domain, [string, number][]>>, seeds: string[] = []): TasteProfile {
  const domains = emptyDomains();
  for (const [d, list] of Object.entries(data) as [Domain, [string, number][]][]) {
    for (const [eid, aff] of list) {
      domains[d][eid] = { id: eid, name: eid, kind: "artist", affinity: aff, explainedBy: seeds.slice(0, 1) } as ProfileEntity;
    }
  }
  return {
    personType: "client",
    personId: id,
    seeds: seeds.map((s) => ({ qlooId: s, name: s, kind: "artist", input: s, source: "intake" })),
    unresolved: [],
    domains,
    builtAt: "",
    cached: false,
  };
}

describe("weightedJaccard", () => {
  it("is 1 for identical maps and 0 for disjoint maps", () => {
    const a = { x: { affinity: 0.5 }, y: { affinity: 1 } };
    expect(weightedJaccard(a, a).overlap).toBe(1);
    expect(weightedJaccard(a, { z: { affinity: 1 } }).overlap).toBe(0);
  });
  it("weights by min/max affinity", () => {
    const r = weightedJaccard({ x: { affinity: 1 } }, { x: { affinity: 0.5 } });
    expect(r.overlap).toBeCloseTo(0.5);
    expect(r.shared).toBe(1);
  });
});

describe("calibrate", () => {
  it("is monotonic and bounded", () => {
    expect(calibrate(0)).toBe(0);
    expect(calibrate(0.1)).toBeLessThan(calibrate(0.2));
    expect(calibrate(5)).toBeLessThanOrEqual(1);
  });
});

describe("scorePair", () => {
  const a = profile("a", { music: [["m1", 0.9], ["m2", 0.8], ["m3", 0.4]], tv: [["t1", 0.9]] });
  const same = profile("b", { music: [["m1", 0.85], ["m2", 0.7]], tv: [["t1", 0.8]] });
  const diff = profile("c", { music: [["m9", 0.9]], tv: [["t9", 0.9]] });

  it("ranks the overlapping pair above the disjoint pair", () => {
    expect(scorePair(a, same).tasteScore).toBeGreaterThan(scorePair(a, diff).tasteScore);
    expect(scorePair(a, diff).tasteScore).toBe(0);
  });

  it("renormalises weights over domains both people have data for", () => {
    const s = scorePair(a, same);
    const total = Object.values(s.perDomain).reduce((acc, d) => acc + d.weight, 0);
    expect(total).toBeCloseTo(1);
    expect(s.perDomain.film.weight).toBe(0);
  });

  it("flags friction where both have data but nothing is shared", () => {
    expect(scorePair(a, diff).friction.map((f) => f.domain)).toEqual(expect.arrayContaining(["music", "tv"]));
  });

  it("gives an empty profile a zero score without throwing", () => {
    expect(scorePair(a, profile("e", {})).tasteScore).toBe(0);
  });
});

describe("findBridges", () => {
  it("ranks by min affinity and caps two per domain", () => {
    const a = profile("a", { music: [["m1", 0.9], ["m2", 0.9], ["m3", 0.9]], tv: [["t1", 0.3]] });
    const b = profile("b", { music: [["m1", 0.2], ["m2", 0.8], ["m3", 0.7]], tv: [["t1", 0.9]] });
    const br = findBridges(a, b);
    expect(br.map((x) => x.entityId)).toEqual(["m2", "m3", "t1"]);
    expect(br[0].strength).toBeCloseTo(0.8);
  });
});

describe("pickSearchHit", () => {
  it("prefers an accent-insensitive exact match over Qloo's first result", () => {
    const hit = pickSearchHit("vicente fernandez", [
      { id: "1", name: "Alejandro Fernández", kind: "artist" },
      { id: "2", name: "Vicente Fernández", kind: "artist" },
    ]);
    expect(hit?.id).toBe("2");
  });
});

describe("engine over the offline fixture graph", () => {
  const qloo = new QlooClient(fixtureTransport, "fixture");

  it("finds cross-generation bridges for the hero pair and ranks a mismatched pair lower", async () => {
    const dolores = await buildProfile(qloo, {
      personType: "client",
      personId: "dolores",
      seeds: [
        { name: "Pedro Infante", kind: "artist" },
        { name: "Vicente Fernández", kind: "artist" },
        { name: "María la del Barrio", kind: "tv_show" },
        { name: "Nosotros los pobres", kind: "movie" },
      ],
    });
    const maria = await buildProfile(qloo, {
      personType: "caregiver",
      personId: "maria",
      seeds: [
        { name: "Bad Bunny", kind: "artist" },
        { name: "Selena", kind: "artist" },
        { name: "Chopped", kind: "tv_show" },
        { name: "Coco", kind: "movie" },
      ],
    });
    const metal = await buildProfile(qloo, {
      personType: "caregiver",
      personId: "metal",
      seeds: [
        { name: "Metallica", kind: "artist" },
        { name: "Breaking Bad", kind: "tv_show" },
      ],
    });
    const good = scorePair(dolores, maria);
    const bad = scorePair(dolores, metal);
    expect(good.tasteScore).toBeGreaterThan(bad.tasteScore);
    expect(good.bridges.length).toBeGreaterThanOrEqual(3);
    expect(good.bridges.every((b) => b.entityId.startsWith("FX-"))).toBe(true);
    const withFallback = await unionBridges(qloo, dolores, metal, bad.bridges);
    expect(withFallback.length).toBeGreaterThanOrEqual(bad.bridges.length);
  });

  it("reports favourites Qloo cannot resolve instead of inventing them", async () => {
    const p = await buildProfile(qloo, { personType: "guest", personId: "g", seeds: [{ name: "   ", kind: "artist" }] });
    expect(p.unresolved).toEqual(["   "]);
    expect(p.seeds).toHaveLength(0);
  });
});
