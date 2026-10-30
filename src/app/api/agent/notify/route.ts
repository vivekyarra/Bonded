import { notifyFamily } from "@/lib/agent/tools";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { clientId, caregiverId, shiftId, approved_by_human } = await body<{
    clientId: string;
    caregiverId: string;
    shiftId: string;
    approved_by_human: boolean;
  }>(req);
  if (!clientId || !caregiverId || !shiftId) return json({ error: "clientId, caregiverId, shiftId required" }, 400);
  try {
    return json(await notifyFamily(clientId, caregiverId, shiftId, approved_by_human));
  } catch (err) {
    return fail(err);
  }
}
