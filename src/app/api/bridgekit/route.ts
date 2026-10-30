import { bridgeKitFor } from "@/lib/agent/tools";
import { isId } from "@/lib/service/guard";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { clientId, caregiverId } = await body<{ clientId: string; caregiverId: string }>(req);
  if (!isId(clientId) || !isId(caregiverId)) return json({ error: "clientId and caregiverId required" }, 400);
  try {
    return json(await bridgeKitFor(clientId, caregiverId));
  } catch (err) {
    return fail(err);
  }
}
