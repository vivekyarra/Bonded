import { afterEach, describe, expect, it, vi } from "vitest";

type Body = { contents: { role: string; parts: Record<string, unknown>[] }[]; tools?: { functionDeclarations: { name: string; parameters: unknown }[] }[]; generationConfig?: Record<string, unknown> };

/** Load the agent modules fresh with a Gemini key set and fetch mocked. */
async function withGemini(responder: (body: Body, url: string, headers: Record<string, string>) => unknown) {
  vi.resetModules();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_MODEL", "gemini-test");
  const calls: Body[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { body: string; headers: Record<string, string> }) => {
      const body = JSON.parse(init.body) as Body;
      calls.push(body);
      const out = responder(body, url, init.headers);
      if (typeof out === "number") return new Response("{}", { status: out });
      return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
  return { calls, llm: await import("./llm"), loop: await import("./loop"), agency: await import("../agency/sunrise") };
}

const fc = (name: string, args: Record<string, unknown>) => ({ functionCall: { name, args }, thoughtSignature: `sig-${name}` });
const reply = (...parts: Record<string, unknown>[]) => ({ candidates: [{ content: { role: "model", parts }, finishReason: "STOP" }] });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Gemini client", () => {
  it("strips JSON-Schema keywords Gemini rejects", async () => {
    const { toGeminiSchema } = await import("./llm");
    expect(toGeminiSchema({ type: "object", additionalProperties: false, properties: { a: { type: "object", additionalProperties: false } } })).toEqual({
      type: "object",
      properties: { a: { type: "object" } },
    });
  });

  it("sends the key in a header, never the URL, and parses JSON output", async () => {
    let seenUrl = "";
    let seenKey = "";
    const { llm } = await withGemini((_b, url, h) => {
      seenUrl = url;
      seenKey = h["x-goog-api-key"];
      return reply({ text: '{"score": 72}' });
    });
    const out = await llm.llmJson<{ score: number }>("sys", "user", { type: "object", properties: { score: { type: "integer" } } });
    expect(out).toEqual({ score: 72 });
    expect(seenUrl).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(seenKey).toBe("test-key");
  });

  it("returns null (caller falls back) when the free-tier quota is exhausted", async () => {
    const { llm } = await withGemini(() => 429);
    expect(await llm.llmJson("s", "u", { type: "object" })).toBeNull();
  }, 30_000);
});

describe("call-out agent on Gemini function calling", () => {
  it("executes the model's tool calls, echoes thought signatures, and holds the offer", async () => {
    let shiftId = "";
    const { calls, loop, agency } = await withGemini((body) => {
      const turn = body.contents.filter((c) => c.role === "model").length;
      if (turn === 0) return reply({ text: "Looking up the shift." }, fc("get_shift", { shift_id: shiftId }));
      if (turn === 1) return reply(fc("find_available_caregivers", { shift_id: shiftId }), fc("rank_candidates", { shift_id: shiftId }));
      if (turn === 2) return reply(fc("draft_offer", { caregiver_id: "cg02", shift_id: shiftId }));
      if (turn === 3) return reply(fc("send_offer", { draft_id: `${shiftId}:cg02` }));
      return reply({ text: "Recommend Maria G.; offer awaits your approval." });
    });
    shiftId = agency.getAgency().demo.calloutShiftId;
    const events: { type: string; tool?: string }[] = [];
    const res = await loop.runCalloutAgent(shiftId, (e) => events.push(e));

    expect(res.mode).toBe("llm");
    expect(events.filter((e) => e.type === "tool").map((e) => e.tool)).toEqual(
      expect.arrayContaining(["get_shift", "find_available_caregivers", "rank_candidates", "draft_offer", "send_offer"]),
    );
    expect(res.pendingApproval).toBe(`${shiftId}:cg02`);
    expect(res.drafts).toHaveLength(3); // the loop tops up drafts the model skipped
    expect(res.summary).toMatch(/Maria/);
    // Model turns are echoed back verbatim (thought signatures intact) followed by function responses.
    const last = calls[calls.length - 1];
    expect(last.contents[1].parts[1]).toMatchObject({ thoughtSignature: "sig-get_shift" });
    expect(last.contents[2].parts[0]).toMatchObject({ functionResponse: { name: "get_shift" } });
    expect(JSON.stringify(last.tools)).not.toContain("additionalProperties");
  });

  it("falls back to the deterministic runner when Gemini fails", async () => {
    const { loop, agency } = await withGemini(() => ({ error: { message: "API key not valid" } }));
    const res = await loop.runCalloutAgent(agency.getAgency().demo.calloutShiftId, () => {});
    expect(res.mode).toBe("deterministic");
    expect(res.pendingApproval).toMatch(/:cg02$/);
  });
});
