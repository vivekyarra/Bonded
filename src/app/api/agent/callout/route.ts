import { getAgency } from "@/lib/agency/sunrise";
import { runCalloutAgent, type TraceEvent } from "@/lib/agent/loop";
import { body } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Streams the agent's tool-call trace as Server-Sent Events. */
export async function POST(req: Request) {
  const { shiftId } = await body<{ shiftId: string }>(req);
  const id = shiftId || getAgency().demo.calloutShiftId;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: TraceEvent) => controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runCalloutAgent(id, send);
      } catch (err) {
        send({ type: "error", text: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
