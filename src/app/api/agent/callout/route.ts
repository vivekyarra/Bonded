import { getAgency } from "@/lib/agency/sunrise";
import { runCalloutAgent, type TraceEvent } from "@/lib/agent/loop";
import { isId, rateLimit } from "@/lib/service/guard";
import { body } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Streams the agent's tool-call trace as Server-Sent Events. */
export async function POST(req: Request) {
  const limited = rateLimit(req, "callout", 20);
  if (limited) return limited;
  const { shiftId } = await body<{ shiftId: unknown }>(req);
  const id = isId(shiftId) ? shiftId : getAgency().demo.calloutShiftId;
  const enc = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      // The viewer may close the tab mid-run: never write to a closed stream.
      const send = (e: TraceEvent) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          closed = true;
        }
      };
      try {
        await runCalloutAgent(id, send);
      } catch (err) {
        send({ type: "error", text: err instanceof Error ? err.message : String(err) });
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
