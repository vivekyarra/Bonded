import { describe, expect, it } from "vitest";
import { env } from "./env";

describe("env", () => {
  it("defaults to the Qloo hackathon server without a trailing slash", () => {
    expect(env.qlooBaseUrl.endsWith("/")).toBe(false);
    expect(env.qlooBaseUrl).toMatch(/^https:\/\//);
  });
  it("pins a Claude model", () => {
    expect(env.claudeModel.length).toBeGreaterThan(0);
  });
});
