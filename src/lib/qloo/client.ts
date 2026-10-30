import { env, isFixtureMode } from "../env";
import { cacheGet, cacheKey, cacheSet } from "./cache";
import { fixtureTransport } from "./fixture";
import { createLimiter } from "./limit";
import { ensureAffinity, parseEntities } from "./parse";
import {
  ENTITY_TYPES,
  type EntityKind,
  type InsightsRequest,
  type QlooEntity,
  QlooError,
  type QlooParams,
  type QlooResult,
  type QlooTransport,
} from "./types";

// Qloo starts returning 429 above ~6 concurrent requests per key.
const limit = createLimiter(6);
/** Identical requests already on the wire share one promise (no thundering herd on a cold cache). */
const inflight = new Map<string, Promise<unknown>>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Backoff for 429/5xx: honour Retry-After, else exponential with jitter, capped at 8 s. */
export function backoffMs(attempt: number, retryAfter: string | null): number {
  const secs = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(secs) && secs >= 0) return Math.min(10_000, secs * 1000);
  return Math.min(8_000, 600 * 2 ** attempt) + Math.floor(Math.random() * 250);
}

const MAX_ATTEMPTS = 5;

/** Live HTTP transport. The API key is only ever read server-side. */
export const httpTransport: QlooTransport = async (path, params) => {
  if (!env.qlooApiKey) throw new QlooError("QLOO_API_KEY is not set");
  const url = new URL(env.qlooBaseUrl + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    let wait = 0;
    try {
      const res = await fetch(url, {
        headers: { "X-Api-Key": env.qlooApiKey, accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new QlooError(`Qloo ${res.status} on ${path}`, res.status);
        wait = backoffMs(attempt, res.headers.get("retry-after"));
      } else if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new QlooError(`Qloo ${res.status} on ${path}: ${text.slice(0, 200)}`, res.status);
      } else {
        return (await res.json()) as unknown;
      }
    } catch (err) {
      if (err instanceof QlooError && err.status && err.status < 500 && err.status !== 429) throw err;
      lastErr = err;
      wait = backoffMs(attempt, null);
    } finally {
      clearTimeout(timer);
    }
    if (attempt < MAX_ATTEMPTS - 1) await sleep(wait);
  }
  // Network failures and timeouts surface as a QlooError so the API answers 502, not 500.
  if (lastErr instanceof QlooError) throw lastErr;
  const reason = lastErr instanceof Error ? (lastErr.name === "AbortError" ? "timed out" : lastErr.message) : "request failed";
  throw new QlooError(`Qloo unreachable (${reason})`, 503);
};

export class QlooClient {
  constructor(
    private transport: QlooTransport,
    private label: "network" | "fixture" = "network",
  ) {}

  /** Cached GET. Every Qloo response Bonded uses passes through here. */
  async get(path: string, params: QlooParams): Promise<QlooResult<unknown>> {
    const key = cacheKey(`${this.label}:${path}`, params);
    // Fixture responses are never persisted, so a changed test graph can't go stale on disk.
    const memoryOnly = this.label === "fixture";
    const hit = cacheGet(key, memoryOnly);
    if (hit) return { data: hit.entry.response, cached: true, source: hit.tier };
    let pending = inflight.get(key);
    if (!pending) {
      pending = limit(() => this.transport(path, params))
        .then((response) => {
          cacheSet(key, { endpoint: path, params, response, fetchedAt: new Date().toISOString() }, memoryOnly);
          return response;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    const response = await pending;
    return { data: response, cached: false, source: this.label };
  }

  async search(query: string, kind?: EntityKind, take = 6): Promise<QlooResult<QlooEntity[]>> {
    const params: QlooParams = { query: query.trim(), take: String(take) };
    if (kind) params.types = ENTITY_TYPES[kind];
    const res = await this.get("/search", params);
    return { ...res, data: parseEntities(res.data, kind ?? null) };
  }

  async insights(req: InsightsRequest): Promise<QlooResult<QlooEntity[]>> {
    const params: QlooParams = {
      "filter.type": ENTITY_TYPES[req.kind],
      "signal.interests.entities": req.entityIds.slice(0, 25).join(","),
      take: String(req.take ?? 50),
      "feature.explainability": "true",
    };
    if (req.locationQuery) params["filter.location.query"] = req.locationQuery;
    if (req.ageSignal) params["signal.demographics.age"] = req.ageSignal;
    let res: QlooResult<unknown>;
    try {
      res = await this.get("/v2/insights", params);
    } catch (err) {
      // Older deployments reject explainability; retry once without it.
      if (err instanceof QlooError && err.status === 400) {
        const { ["feature.explainability"]: _drop, ...rest } = params;
        void _drop;
        res = await this.get("/v2/insights", rest);
      } else throw err;
    }
    return { ...res, data: ensureAffinity(parseEntities(res.data, req.kind)) };
  }
}

let singleton: QlooClient | null = null;

export function qloo(): QlooClient {
  if (!singleton) {
    singleton = isFixtureMode()
      ? new QlooClient(fixtureTransport, "fixture")
      : new QlooClient(httpTransport, "network");
  }
  return singleton;
}

export function qlooConfigured(): boolean {
  return isFixtureMode() || env.qlooApiKey.length > 0;
}
