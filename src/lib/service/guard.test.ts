import { describe, expect, it } from "vitest";
import { idList, isEntityKind, isId, rateLimit } from "./guard";

describe("input guards", () => {
  it("rejects prototype keys that `in` would accept", () => {
    expect("__proto__" in { artist: 1 }).toBe(true);
    expect(isEntityKind("__proto__")).toBe(false);
    expect(isEntityKind("constructor")).toBe(false);
    expect(isEntityKind("artist")).toBe(true);
  });

  it("validates ids and id lists", () => {
    expect(isId("c01")).toBe(true);
    expect(isId(["c01"])).toBe(false);
    expect(isId("x".repeat(41))).toBe(false);
    expect(isId("<script>")).toBe(false);
    expect(idList("s02", 5)).toBeNull();
    expect(idList(["s02", "s02", "s03"], 5)).toEqual(["s02", "s03"]);
    expect(idList(Array.from({ length: 50 }, (_, i) => `s${i}`), 20)).toHaveLength(20);
  });

  it("rate-limits per IP", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9" } });
    const results = Array.from({ length: 4 }, () => rateLimit(req, "test", 3));
    expect(results.slice(0, 3).every((r) => r === null)).toBe(true);
    expect(results[3]?.status).toBe(429);
    const other = new Request("http://x", { headers: { "x-forwarded-for": "8.8.8.8" } });
    expect(rateLimit(other, "test", 3)).toBeNull();
  });
});
