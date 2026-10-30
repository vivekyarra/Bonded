import { describe, expect, it } from "vitest";
import { getAgency } from "../agency/sunrise";
import { ApprovalRequiredError, requireHumanApproval, stripMarks, validateGroundedText } from "./guards";
import { classifyNote, healthReview, slope } from "./health";
import { runCalloutAgent, type TraceEvent } from "./loop";
import { bridgeKitFor, notifyFamily, sendOffer } from "./tools";

describe("guards", () => {
  const allowed = ["Selena", "Coco"];
  const known = ["Selena", "Coco", "Metallica", "Breaking Bad"];

  it("accepts text that mentions only bridges", () => {
    expect(validateGroundedText("Ask her about [[Selena]] and [[Coco]].", allowed, known).ok).toBe(true);
  });

  it("rejects a marked entity that is not a bridge", () => {
    const r = validateGroundedText("Ask about [[Metallica]].", allowed, known);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toMatch(/not a bridge/);
  });

  it("rejects an unmarked known entity outside the bridge list", () => {
    expect(validateGroundedText("Ask about [[Selena]], then Breaking Bad.", allowed, known).ok).toBe(false);
  });

  it("rejects text with no bridge at all", () => {
    expect(validateGroundedText("Ask how her week was.", allowed, known).ok).toBe(false);
  });

  it("strips markers for display", () => {
    expect(stripMarks("Ask about [[Selena]].")).toBe("Ask about Selena.");
  });

  it("blocks contact without explicit human approval", async () => {
    expect(() => requireHumanApproval("send_offer", "true")).toThrow(ApprovalRequiredError);
    await expect(sendOffer("x:y", undefined)).rejects.toThrow(ApprovalRequiredError);
    await expect(notifyFamily("c01", "cg02", getAgency().demo.calloutShiftId, false)).rejects.toThrow(ApprovalRequiredError);
  });
});

describe("call-out agent (deterministic mode, fixture Qloo)", () => {
  it("runs the full tool sequence and holds the offer for approval", async () => {
    const events: TraceEvent[] = [];
    const shiftId = getAgency().demo.calloutShiftId;
    const res = await runCalloutAgent(shiftId, (e) => events.push(e));
    const tools = events.filter((e) => e.type === "tool").map((e) => (e as { tool: string }).tool);
    expect(tools).toEqual(["get_shift", "find_available_caregivers", "rank_candidates", "score_pair", "draft_offer", "draft_offer", "draft_offer", "send_offer"]);
    expect(res.mode).toBe("deterministic");
    expect(res.candidates[0].caregiverId).toBe("cg02");
    expect(res.drafts).toHaveLength(3);
    expect(res.pendingApproval).toBe(`${shiftId}:cg02`);
    expect(res.drafts[0].text).toMatch(/^Hi Maria, can you cover Dolores A\. tomorrow 9am–1pm/);
    expect(res.elapsedMs).toBeLessThan(20_000);
  });

  it("sends only with approval, then builds a grounded Bridge Kit", async () => {
    const shiftId = getAgency().demo.calloutShiftId;
    const sent = await sendOffer(`${shiftId}:cg02`, true);
    expect(sent.status).toBe("sent_sim");
    const kit = await bridgeKitFor("c01", "cg02");
    expect(kit.openers).toHaveLength(3);
    expect(kit.phrasing).toBe("template");
    expect(kit.playlist.length).toBeGreaterThan(0);
    expect(kit.playlist.every((t) => t.qlooId.startsWith("FX-") && t.spotify.includes("/search/"))).toBe(true);
    expect(kit.careNotes.length).toBeGreaterThan(0);
  });
});

describe("relationship health", () => {
  it("computes slope", () => {
    expect(slope([1, 1, 0, -1])).toBeLessThan(0);
    expect(slope([0, 0, 0])).toBe(0);
  });

  it("classifies notes into the fixed label set", () => {
    expect(classifyNote("Tense visit — she said I'm always on my phone")).toEqual(expect.arrayContaining(["conflict", "disengagement"]));
    expect(classifyNote("We've run out of things to talk about")).toContain("stale_conversation");
    expect(classifyNote("Fine")).toEqual(["none"]);
  });

  it("flags Eleanor & Kayla for re-match and Frank & Devon for a fresh kit", async () => {
    const { flags } = await healthReview();
    const eleanor = flags.find((f) => f.matchKey === "c05|cg06");
    expect(eleanor?.severity).toBe("high");
    expect(eleanor?.suggestedAction.kind).toBe("rematch");
    const frank = flags.find((f) => f.matchKey === "c06|cg07");
    expect(frank?.suggestedAction.kind).toBe("refresh_kit");
  });
});
