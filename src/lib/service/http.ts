import { NextResponse } from "next/server";
import { ApprovalRequiredError } from "../agent/guards";
import { qlooConfigured } from "../qloo/client";
import { QlooError } from "../qloo/types";

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function fail(err: unknown) {
  if (err instanceof ApprovalRequiredError) return json({ error: err.message }, 403);
  if (!qlooConfigured()) return json({ error: "Qloo is not configured: set QLOO_API_KEY on the server." }, 503);
  if (err instanceof QlooError) return json({ error: `Qloo unavailable: ${err.message}` }, 502);
  const msg = err instanceof Error ? err.message : String(err);
  return json({ error: msg }, /Unknown (client|caregiver|shift|schedule)/.test(msg) ? 404 : 500);
}

export async function body<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    return {};
  }
}
