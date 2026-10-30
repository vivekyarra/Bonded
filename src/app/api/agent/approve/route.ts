import { getAgency } from "@/lib/agency/sunrise";
import { byId } from "@/lib/agency/query";
import { bridgeKitFor, familyNotice, sendOffer } from "@/lib/agent/tools";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduler approval. Sends the offer (simulated), simulates the caregiver accepting,
 * builds their Bridge Kit, and drafts — but does not send — the family notice.
 */
export async function POST(req: Request) {
  const { draftId, approved_by_human } = await body<{ draftId: string; approved_by_human: boolean }>(req);
  if (typeof draftId !== "string" || !/^[a-z0-9-]{1,40}:[a-z0-9-]{1,40}$/i.test(draftId)) return json({ error: "draftId required" }, 400);
  try {
    const sent = await sendOffer(draftId, approved_by_human);
    const { shiftId, caregiverId } = sent.draft;
    const clientId = byId(getAgency()).shift(shiftId).clientId;
    const [kit, family] = await Promise.all([bridgeKitFor(clientId, caregiverId), familyNotice(clientId, caregiverId, shiftId)]);
    return json({ sent, accepted: { caregiverId, at: new Date().toISOString(), simulated: true }, kit, familyDraft: family });
  } catch (err) {
    return fail(err);
  }
}
