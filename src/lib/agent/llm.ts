import { env, hasLlm } from "../env";

/**
 * Minimal Google Gemini client (REST `models.generateContent`, free tier friendly).
 * The LLM only orchestrates and phrases: it never supplies an entity, a person or a score.
 * Without GEMINI_API_KEY every caller falls back to deterministic code paths.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GenerateRequest {
  system?: string;
  contents: GeminiContent[];
  tools?: GeminiFunctionDeclaration[];
  /** JSON Schema for a JSON-only response. */
  jsonSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
}

export interface GenerateResult {
  content: GeminiContent;
  finishReason?: string;
}

export class LlmError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** Gemini's schema dialect is an OpenAPI subset: drop keywords it doesn't accept. */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (k === "additionalProperties" || k === "$schema") continue;
    out[k] = k === "properties" && v && typeof v === "object"
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([p, s]) => [p, toGeminiSchema(s)]))
      : toGeminiSchema(v);
  }
  return out;
}

export function textOf(content: GeminiContent | undefined): string {
  return (content?.parts ?? [])
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}

export const functionCalls = (content: GeminiContent | undefined) =>
  (content?.parts ?? []).filter((p): p is GeminiPart & { functionCall: NonNullable<GeminiPart["functionCall"]> } => Boolean(p.functionCall));

export async function generate(req: GenerateRequest): Promise<GenerateResult> {
  if (!hasLlm()) throw new LlmError("GEMINI_API_KEY is not set");
  const body: Record<string, unknown> = { contents: req.contents };
  if (req.system) body.systemInstruction = { parts: [{ text: req.system }] };
  if (req.tools?.length)
    body.tools = [{ functionDeclarations: req.tools.map((t) => ({ ...t, parameters: toGeminiSchema(t.parameters) })) }];
  const generationConfig: Record<string, unknown> = { maxOutputTokens: req.maxOutputTokens ?? 4096 };
  if (req.jsonSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = toGeminiSchema(req.jsonSchema);
  }
  body.generationConfig = generationConfig;

  const url = `${BASE}/models/${encodeURIComponent(env.geminiModel)}:generateContent`;
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.geminiApiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
      if (res.status === 429 || res.status >= 500) {
        last = new LlmError(`Gemini ${res.status}`, res.status);
        await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
        continue;
      }
      const json = (await res.json().catch(() => ({}))) as {
        candidates?: { content?: GeminiContent; finishReason?: string }[];
        error?: { message?: string };
      };
      if (!res.ok) throw new LlmError(`Gemini ${res.status}: ${json.error?.message ?? "request failed"}`, res.status);
      const cand = json.candidates?.[0];
      if (!cand?.content) throw new LlmError(`Gemini returned no content (${cand?.finishReason ?? "no candidates"})`);
      return { content: { role: "model", parts: cand.content.parts ?? [] }, finishReason: cand.finishReason };
    } catch (err) {
      if (err instanceof LlmError && err.status && err.status < 500 && err.status !== 429) throw err;
      last = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw last instanceof Error ? last : new LlmError("Gemini request failed");
}

/** Single structured call returning parsed JSON; null when Gemini is unavailable or fails. */
export async function llmJson<T>(system: string, user: string, schema: Record<string, unknown>): Promise<T | null> {
  if (!hasLlm()) return null;
  try {
    const res = await generate({ system, contents: [{ role: "user", parts: [{ text: user }] }], jsonSchema: schema });
    if (res.finishReason && !["STOP", "MAX_TOKENS"].includes(res.finishReason)) return null;
    return JSON.parse(textOf(res.content)) as T;
  } catch {
    return null;
  }
}
