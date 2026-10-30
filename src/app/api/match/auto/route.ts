import { getAgency } from "@/lib/agency/sunrise";
import { openSchedules } from "@/lib/agency/query";
import { autoMatchView } from "@/lib/service/views";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { scheduleIds } = await body<{ scheduleIds: string[] }>(req);
  const ids = scheduleIds?.length ? scheduleIds : openSchedules(getAgency()).map((s) => s.id);
  try {
    return json(await autoMatchView(ids));
  } catch (err) {
    return fail(err);
  }
}
