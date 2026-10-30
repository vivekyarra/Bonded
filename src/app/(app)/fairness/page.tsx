"use client";
import type { FairnessReport } from "@/lib/audit/fairness";
import { OfferRateChart, RetentionChart } from "@/components/Charts";
import { ErrorState, PageHeader, Spinner } from "@/components/ui";
import { useJson } from "@/components/useJson";

interface Data {
  fairness: FairnessReport;
  results: {
    simulated: true;
    model: string;
    matches: number;
    covered: number;
    avgTasteBefore: number;
    avgTasteAfter: number;
    curves: { day: number; proximity: number; bonded: number }[];
  };
}

export default function FairnessPage() {
  const d = useJson<Data>("/api/audit/fairness");
  if (d.loading) return <Spinner label="Ranking every schedule and auditing offer rates…" />;
  if (d.error || !d.data) return <ErrorState error={d.error ?? "No data"} onRetry={d.reload} />;
  const { fairness: f, results: r } = d.data;
  const top = Math.max(...f.rows.map((x) => x.rate), 0);
  const day90 = r.curves.find((c) => c.day === 90);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Owner view · legal shield" title="Fairness & Results">
        Matching never sees protected traits. Caregivers may optionally self-report a demographic group; it is stored separately and joined only here, after
        matching, to check that shift offers stay balanced.
      </PageHeader>

      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl">Shift-offer fairness audit</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${f.pass ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>{f.pass ? "PASS" : "ALERT"}</span>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <OfferRateChart rows={f.rows} floor={Math.round(top * 80)} />
          <dl className="grid grid-cols-2 content-start gap-4 text-sm">
            <div>
              <dt className="label">Permutation p-value</dt>
              <dd className="text-2xl font-semibold tabular-nums">{f.chi.pPermutation}</dd>
              <dd className="text-[11px] text-muted">naive chi-square p {f.chi.p}</dd>
            </div>
            <div>
              <dt className="label">Impact ratio (4/5 rule)</dt>
              <dd className="text-2xl font-semibold tabular-nums">{f.impactRatio}</dd>
            </div>
            <div>
              <dt className="label">Offers simulated</dt>
              <dd className="text-2xl font-semibold tabular-nums">{f.totalOffers}</dd>
            </div>
            <div>
              <dt className="label">Eligible caregivers with no offer</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {f.caregiversWithoutOffers}/{f.eligibleCaregivers}
              </dd>
            </div>
            <p className="col-span-2 text-xs text-muted">{f.method}</p>
          </dl>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 font-medium">Self-reported group</th>
              <th className="font-medium">Caregivers</th>
              <th className="font-medium">Eligible opportunities</th>
              <th className="font-medium">Offers</th>
              <th className="font-medium">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {f.rows.map((row) => (
              <tr key={row.group}>
                <td className="py-1.5">{row.group}</td>
                <td className="tabular-nums">{row.caregivers}</td>
                <td className="tabular-nums">{row.opportunities}</td>
                <td className="tabular-nums">{row.offers}</td>
                <td className="tabular-nums">{Math.round(row.rate * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!f.pass && <p className="mt-3 text-sm font-semibold text-bad">Offer rates differ across groups. Review the taste weights and offer rotation with a human before the next scheduling cycle.</p>}
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl">Results: before vs after Bonded</h2>
          <span className="rounded-full bg-warn/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-warn">Simulated</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          The {r.matches} current regular matches were assigned the way agencies do it today: nearest eligible caregiver. Bonded re-solves the same schedules with
          the same hard constraints and hours caps.
        </p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <dl className="grid grid-cols-2 content-start gap-4">
            <div className="rounded-xl bg-bg p-4">
              <dt className="label">Avg taste today</dt>
              <dd className="text-3xl font-semibold tabular-nums">{r.avgTasteBefore}</dd>
            </div>
            <div className="rounded-xl bg-coralsoft p-4">
              <dt className="label">Avg taste with Bonded</dt>
              <dd className="text-3xl font-semibold tabular-nums text-coral">{r.avgTasteAfter}</dd>
            </div>
            {day90 && (
              <div className="col-span-2 rounded-xl bg-bg p-4 text-sm">
                Simulated 90-day match retention: <strong>{day90.proximity}%</strong> today vs <strong>{day90.bonded}%</strong> with Bonded.
              </div>
            )}
            <p className="col-span-2 text-xs text-muted">
              {r.model} Real outcome data (30/60/90-day retention, call-outs filled, time to fill, cancellations) replaces this once an agency pilots Bonded.
            </p>
          </dl>
          <RetentionChart data={r.curves} />
        </div>
      </section>
    </div>
  );
}
