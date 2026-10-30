/** Server-side configuration. Never import this from a client component. */
export const env = {
  qlooApiKey: process.env.QLOO_API_KEY ?? "",
  qlooBaseUrl: (process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com").replace(/\/$/, ""),
  qlooMode: (process.env.QLOO_MODE ?? "live") as "live" | "fixture",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
};

export const hasClaude = () => env.anthropicApiKey.length > 0;
export const isFixtureMode = () => env.qlooMode === "fixture";
