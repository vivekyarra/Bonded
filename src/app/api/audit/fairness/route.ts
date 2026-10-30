import { fairnessAudit } from "@/lib/audit/fairness";
import { simulatedResults } from "@/lib/audit/results";
import { quickPairScore } from "@/lib/service/engine";
import { fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const [fairness, results] = await Promise.all([fairnessAudit(quickPairScore), simulatedResults(quickPairScore)]);
    return json({ fairness, results });
  } catch (err) {
    return fail(err);
  }
}
