import { describe, expect, it } from "vitest";
import { cacheKey } from "./cache";
import { QlooClient } from "./client";
import { fixtureTransport, fixtureId } from "./fixture";
import { createLimiter } from "./limit";
import { ensureAffinity, parseEntities } from "./parse";

describe("parseEntities", () => {
  it("reads the /search shape", () => {
    const body = {
      results: [
        { entity_id: "A1", name: "Selena", types: ["urn:entity:artist"], properties: { image: { url: "x.png" } } },
        { entity_id: "A1", name: "Selena dup" },
        { name: "no id" },
      ],
    };
    const out = parseEntities(body, null);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "A1", name: "Selena", kind: "artist", image: "x.png" });
  });

  it("reads the /v2/insights shape with affinity and explainability", () => {
    const body = {
      results: {
        entities: [
          {
            entity_id: "M1",
            name: "Coco",
            type: "urn:entity:movie",
            query: { affinity: 0.91, explainability: { signal: { interests: { entities: [{ entity_id: "S1" }] } } } },
          },
        ],
      },
    };
    const [e] = parseEntities(body, "movie");
    expect(e.affinity).toBeCloseTo(0.91);
    expect(e.kind).toBe("movie");
    expect(e.explainedBy).toEqual(["S1"]);
  });

  it("fills missing affinity by rank, preserving order", () => {
    const filled = ensureAffinity([
      { id: "a", name: "a", kind: null },
      { id: "b", name: "b", kind: null },
      { id: "c", name: "c", kind: null, affinity: 0.2 },
    ]);
    expect(filled[0].affinity).toBe(1);
    expect(filled[1].affinity!).toBeLessThan(1);
    expect(filled[2].affinity).toBe(0.2);
  });
});

describe("cacheKey", () => {
  it("is independent of param order", () => {
    expect(cacheKey("/search", { a: "1", b: "2" })).toBe(cacheKey("/search", { b: "2", a: "1" }));
    expect(cacheKey("/search", { a: "1" })).not.toBe(cacheKey("/search", { a: "2" }));
  });
});

describe("createLimiter", () => {
  it("never runs more than max tasks at once", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const task = () =>
      limit(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
      });
    await Promise.all(Array.from({ length: 8 }, task));
    expect(peak).toBe(2);
  });
});

describe("QlooClient over the offline fixture", () => {
  const client = new QlooClient(fixtureTransport, "fixture");

  it("resolves a seed by name and type", async () => {
    const res = await client.search("Selena", "artist");
    expect(res.data[0]).toMatchObject({ id: fixtureId("artist", "Selena"), kind: "artist" });
  });

  it("expands seeds into a ranked insights list with correlated affinity", async () => {
    const res = await client.insights({ kind: "artist", entityIds: [fixtureId("artist", "Pedro Infante")], take: 20 });
    const names = res.data.slice(0, 8).map((e) => e.name);
    expect(names).toContain("Vicente Fernández");
    const affs = res.data.map((e) => e.affinity!);
    expect([...affs].sort((a, b) => b - a)).toEqual(affs);
  });

  it("serves repeat calls from cache", async () => {
    const params = { kind: "movie" as const, entityIds: [fixtureId("artist", "Johnny Cash")], take: 10 };
    await client.insights(params);
    const again = await client.insights(params);
    expect(again.cached).toBe(true);
  });
});

describe("slimResponse", () => {
  it("keeps every field Bonded parses and nothing else", async () => {
    const { slimResponse } = await import("./parse");
    const body = {
      results: {
        entities: [
          {
            entity_id: "X1",
            name: "Coco",
            types: ["urn:entity:movie"],
            popularity: 0.912345,
            properties: { image: { url: "c.png" }, release_year: 2017, short_description: "long text", keywords: ["a", "b"] },
            tags: [{ id: "t" }],
            query: { affinity: 0.81234, explainability: { signal: { interests: { entities: [{ entity_id: "S1", score: 0.4 }] } } } },
          },
        ],
      },
    };
    const slim = slimResponse(body);
    expect(parseEntities(slim, null)).toEqual(parseEntities(body, null).map((e) => ({ ...e, description: undefined, popularity: 0.9123, affinity: 0.8123 })));
    expect(JSON.stringify(slim)).not.toContain("keywords");
  });
});
