/** Server-side configuration. Never import this from a client component. */
export const env = {
  qlooApiKey: process.env.QLOO_API_KEY ?? "",
  qlooBaseUrl: (process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com").replace(/\/$/, ""),
  qlooMode: (process.env.QLOO_MODE ?? "live") as "live" | "fixture",
  geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
};

/** True when an LLM (Google Gemini) is configured; otherwise the agent runs deterministically. */
export const hasLlm = () => env.geminiApiKey.length > 0;
export const isFixtureMode = () => env.qlooMode === "fixture";
