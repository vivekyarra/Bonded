import { pairDetail } from "@/lib/service/views";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { clientId, caregiverId } = await body<{ clientId: string; caregiverId: string }>(req);
  if (!clientId || !caregiverId) return json({ error: "clientId and caregiverId required" }, 400);
  try {
    return json(await pairDetail(clientId, caregiverId));
  } catch (err) {
    return fail(err);
  }
}
