import { getAgency } from "@/lib/agency/sunrise";
import { openSchedules } from "@/lib/agency/query";
import { autoMatchView } from "@/lib/service/views";
import { idList } from "@/lib/service/guard";
import { body, fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { scheduleIds } = await body<{ scheduleIds: unknown }>(req);
  const given = scheduleIds === undefined ? [] : idList(scheduleIds, 20);
  if (given === null) return json({ error: "scheduleIds must be a list of schedule ids" }, 400);
  const ids = given.length ? given : openSchedules(getAgency()).map((s) => s.id);
  try {
    return json(await autoMatchView(ids));
  } catch (err) {
    return fail(err);
  }
}
