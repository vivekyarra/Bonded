import Anthropic from "@anthropic-ai/sdk";
import { env, hasClaude } from "../env";

let client: Anthropic | null = null;

export function claude(): Anthropic | null {
  if (!hasClaude()) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey, timeout: 45_000, maxRetries: 2 });
  return client;
}

/**
 * Shared request options. Low effort keeps the call-out demo well under 20 s, and the
 * server-side fallback keeps a refused turn from stalling the agent.
 */
export const baseParams = () => ({
  model: env.claudeModel,
  output_config: { effort: "low" as const },
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
});

export function textOf(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Single structured call returning JSON text; null when Claude is unavailable or fails. */
export async function claudeJson<T>(system: string, user: string, schema: Record<string, unknown>): Promise<T | null> {
  const c = claude();
  if (!c) return null;
  try {
    const res = await c.beta.messages.create({
      ...baseParams(),
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low", format: { type: "json_schema", schema } },
    });
    if (res.stop_reason === "refusal") return null;
    return JSON.parse(textOf(res.content)) as T;
  } catch {
    return null;
  }
}
