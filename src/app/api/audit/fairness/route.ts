import { getAgency } from "@/lib/agency/sunrise";
import { fairnessAudit } from "@/lib/audit/fairness";
import { simulatedResults } from "@/lib/audit/results";
import { quickPairScore } from "@/lib/service/engine";
import { fail, json } from "@/lib/service/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The audit is deterministic for a given agency day, so compute it once and share it. */
let memo: { day: string; result: Promise<unknown> } | null = null;

export async function GET() {
  const day = getAgency().demo.today;
  if (!memo || memo.day !== day) {
    const result = Promise.all([fairnessAudit(quickPairScore), simulatedResults(quickPairScore)]).then(([fairness, results]) => ({ fairness, results }));
    memo = { day, result };
    result.catch(() => {
      if (memo?.result === result) memo = null;
    });
  }
  try {
    return json(await memo.result);
  } catch (err) {
    return fail(err);
  }
}
