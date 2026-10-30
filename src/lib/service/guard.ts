import { ENTITY_TYPES, type EntityKind } from "../qloo/types";
import { json } from "./http";

/** Own-property check: `"__proto__" in ENTITY_TYPES` is true, so `in` is not a validator. */
export const isEntityKind = (v: unknown): v is EntityKind => typeof v === "string" && Object.prototype.hasOwnProperty.call(ENTITY_TYPES, v);

const ID = /^[a-z0-9-]{1,40}$/i;
export const isId = (v: unknown): v is string => typeof v === "string" && ID.test(v);

/** Validated, de-duplicated, capped list of ids; null when the input is not a list of ids. */
export function idList(v: unknown, max: number): string[] | null {
  if (!Array.isArray(v) || !v.every(isId)) return null;
  return [...new Set(v)].slice(0, max);
}

const buckets = new Map<string, { tokens: number; at: number }>();

/**
 * Per-IP token bucket (per server instance) for endpoints that spend Qloo or Gemini
 * quota. Returns a 429 response when the caller is over the limit, otherwise null.
 */
export function rateLimit(req: Request, name: string, perMinute: number): Response | null {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const key = `${name}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: perMinute, at: now };
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60_000) * perMinute);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: { "retry-after": "10" } });
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now - v.at > 120_000) buckets.delete(k);
  return null;
}
