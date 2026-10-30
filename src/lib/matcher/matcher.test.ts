import { describe, expect, it } from "vitest";
import { openSchedules } from "../agency/query";
import { buildSunrise } from "../agency/sunrise";
import { buildProfile } from "../compat/profile";
import { scorePair } from "../compat/score";
import type { PairScore, TasteProfile } from "../compat/types";
import { QlooClient } from "../qloo/client";
import { fixtureTransport } from "../qloo/fixture";
import { hungarian } from "./hungarian";
import { autoMatch, composite, rankForShift, type ScoreFn } from "./rank";

describe("hungarian", () => {
  it("solves a small square problem optimally", () => {
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ];
    const a = hungarian(cost);
    const total = a.reduce((acc, j, i) => acc + cost[i][j], 0);
    expect(total).toBe(5);
    expect(new Set(a).size).toBe(3);
  });

  it("handles rectangular matrices and avoids forbidden cells", () => {
    const F = 1e6;
    const a = hungarian([
      [F, 5, 1, F],
      [F, 1, F, F],
    ]);
    expect(a).toEqual([2, 1]);
  });

  it("matches brute force on random 4x6 instances", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let t = 0; t < 30; t++) {
      const cost = Array.from({ length: 4 }, () => Array.from({ length: 6 }, () => Math.floor(rand() * 50)));
      const a = hungarian(cost);
      const got = a.reduce((acc, j, i) => acc + cost[i][j], 0);
      let best = Infinity;
      const rec = (i: number, used: Set<number>, sum: number) => {
        if (i === 4) return void (best = Math.min(best, sum));
        for (let j = 0; j < 6; j++) if (!used.has(j)) rec(i + 1, new Set([...used, j]), sum + cost[i][j]);
      };
      rec(0, new Set(), 0);
      expect(got).toBe(best);
    }
  });
});

describe("composite", () => {
  it("applies the published 0.6 / 0.25 / 0.15 weights", () => {
    expect(composite(100, 100, 0).value).toBe(100);
    expect(composite(50, 0, 45).value).toBe(30);
  });
});

describe("matching on the synthetic agency (fixture Qloo)", () => {
  const agency = buildSunrise("2026-10-30");
  const qloo = new QlooClient(fixtureTransport, "fixture");
  const cache = new Map<string, Promise<TasteProfile>>();
  const prof = (type: "client" | "caregiver", id: string) => {
    const k = `${type}:${id}`;
    if (!cache.has(k)) {
      const person = type === "client" ? agency.clients.find((c) => c.id === id)! : agency.caregivers.find((c) => c.id === id)!;
      cache.set(k, buildProfile(qloo, { personType: type, personId: id, seeds: person.seeds }));
    }
    return cache.get(k)!;
  };
  const scoreFn: ScoreFn = async (c, g): Promise<PairScore> => scorePair(await prof("client", c), await prof("caregiver", g));

  it("proposes a distinct, eligible caregiver for every open schedule", async () => {
    const ids = openSchedules(agency).map((s) => s.id);
    const proposals = await autoMatch(agency, ids, scoreFn);
    expect(proposals).toHaveLength(6);
    const assigned = proposals.map((p) => p.caregiverId).filter(Boolean);
    expect(assigned.length).toBe(6);
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it("pairs Walter with Travis — the obvious match", async () => {
    const proposals = await autoMatch(agency, ["s02"], scoreFn);
    expect(proposals[0].caregiverId).toBe("cg03");
  });

  it("never offers the call-out shift back to the caregiver who called out", async () => {
    const { candidates, excluded } = await rankForShift(agency, agency.demo.calloutShiftId, scoreFn);
    expect(candidates.map((c) => c.caregiverId)).not.toContain("cg01");
    expect(excluded.find((e) => e.caregiverId === "cg01")?.reasons).toContain("Called out");
    expect(candidates.length).toBeGreaterThanOrEqual(3);
    expect(candidates[0].caregiverId).toBe("cg02");
  });
});
