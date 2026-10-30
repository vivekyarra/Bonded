import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Three-tier cache for Qloo responses, keyed by a hash of endpoint + params.
 *  1. memory  – per server instance
 *  2. bundle  – data/qloo-cache.json, produced by `npm run warm-cache` and shipped with
 *               the deploy so judging never depends on a cold API
 *  3. disk    – runtime writes (`.cache/qloo` locally, the OS temp dir on serverless), 7-day TTL
 */
export interface CacheEntry {
  endpoint: string;
  params: Record<string, string>;
  response: unknown;
  fetchedAt: string;
}

export const TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const BUNDLE_PATH = path.join(process.cwd(), "data", "qloo-cache.json");

export function cacheKey(endpoint: string, params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha256").update(`${endpoint}?${sorted}`).digest("hex").slice(0, 40);
}

const memory = new Map<string, CacheEntry>();
let bundle: Record<string, CacheEntry> | null = null;

function loadBundle(): Record<string, CacheEntry> {
  if (bundle) return bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, "utf8")) as Record<string, CacheEntry>;
  } catch {
    bundle = {};
  }
  return bundle;
}

function diskDir(): string {
  const local = path.join(process.cwd(), ".cache", "qloo");
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return serverless ? path.join(os.tmpdir(), "bonded-qloo") : local;
}

export type CacheTier = "memory" | "bundle" | "disk";

export function cacheGet(key: string, memoryOnly = false): { entry: CacheEntry; tier: CacheTier } | null {
  const m = memory.get(key);
  if (m) return { entry: m, tier: "memory" };
  if (memoryOnly) return null;
  const b = loadBundle()[key];
  if (b) {
    memory.set(key, b);
    return { entry: b, tier: "bundle" };
  }
  try {
    const file = path.join(diskDir(), `${key}.json`);
    const entry = JSON.parse(fs.readFileSync(file, "utf8")) as CacheEntry;
    if (Date.now() - Date.parse(entry.fetchedAt) < TTL_MS) {
      memory.set(key, entry);
      return { entry, tier: "disk" };
    }
  } catch {
    /* miss */
  }
  return null;
}

export function cacheSet(key: string, entry: CacheEntry, memoryOnly = false): void {
  memory.set(key, entry);
  if (memoryOnly) return;
  try {
    const dir = diskDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(entry));
  } catch {
    /* read-only filesystem: memory cache still works */
  }
}

/** Snapshot of everything fetched in this process (used by warm-cache to write the bundle). */
export function cacheSnapshot(): Record<string, CacheEntry> {
  return { ...loadBundle(), ...Object.fromEntries(memory) };
}

export function cacheStats() {
  return { memory: memory.size, bundle: Object.keys(loadBundle()).length };
}

/** Test hook. */
export function cacheClear(): void {
  memory.clear();
  bundle = null;
}
