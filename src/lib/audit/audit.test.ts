import { describe, expect, it } from "vitest";
import { getAgency } from "../agency/sunrise";
import { quickPairScore } from "../service/engine";
import { tryIt } from "../service/tryit";
import { fairnessAudit } from "./fairness";
import { simulatedResults } from "./results";
import { chiSquare, gammaQ, separation } from "./stats";

describe("stats", () => {
  it("chi-square p-value matches known values", () => {
    // 1 df, statistic 3.841 → p ≈ 0.05
    expect(gammaQ(0.5, 3.841 / 2)).toBeCloseTo(0.05, 3);
    expect(chiSquare([[10, 10], [10, 10]]).p).toBeCloseTo(1);
    expect(chiSquare([[30, 0], [0, 30]]).p).toBeLessThan(0.001);
  });
  it("separation is AUC", () => {
    expect(separation([3, 4], [1, 2])).toBe(1);
    expect(separation([1], [1])).toBe(0.5);
  });
});

describe("fairness audit and simulated results (fixture Qloo)", () => {
  it("produces a report over all groups with a pass/fail decision", async () => {
    const r = await fairnessAudit(quickPairScore, getAgency());
    expect(r.rows.length).toBeGreaterThan(2);
    expect(r.totalOffers).toBeGreaterThan(0);
    expect(typeof r.pass).toBe("boolean");
    expect(r.chi.p).toBeGreaterThanOrEqual(0);
  });

  it("re-solves today's schedules with Bonded and labels the output simulated", async () => {
    const r = await simulatedResults(quickPairScore, getAgency());
    expect(r.simulated).toBe(true);
    expect(r.avgTasteAfter).toBeGreaterThanOrEqual(r.avgTasteBefore);
    expect(r.curves[0]).toMatchObject({ day: 0, proximity: 100, bonded: 100 });
  });
});

describe("try it", () => {
  it("matches a jazz fan to the 91-year-old jazz client", async () => {
    const res = await tryIt([
      { name: "Ella Fitzgerald", kind: "artist" },
      { name: "Duke Ellington", kind: "artist" },
      { name: "Casablanca", kind: "movie" },
    ]);
    expect(res.stored).toBe(false);
    expect(res.top[0].client.id).toBe("c03");
    expect(res.kit?.openers.length).toBeGreaterThan(0);
  });

  it("rejects fewer than three favourites", async () => {
    await expect(tryIt([{ name: "Selena", kind: "artist" }])).rejects.toThrow(/3 favourites/);
  });
});
