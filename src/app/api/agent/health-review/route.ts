import { healthReview } from "@/lib/agent/health";
import { fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    return json(await healthReview());
  } catch (err) {
    return fail(err);
  }
}
