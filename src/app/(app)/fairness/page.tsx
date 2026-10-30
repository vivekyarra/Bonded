"use client";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { FairnessReport } from "@/lib/audit/fairness";
import { OfferRateChart, RetentionChart } from "@/components/Charts";
import { ErrorState, Info, PageHeader, SegmentedLinks, Skeleton, Stat } from "@/components/ui";
import { useJson } from "@/components/useJson";
import { INSIGHT_TABS } from "@/components/insights";
import { CountUp } from "@/components/motion";

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

const STATUS = {
  pass: { icon: ShieldCheck, text: "Balanced", cls: "from-good to-teal" },
  watch: { icon: ShieldQuestion, text: "Watch", cls: "from-warn to-coral" },
  alert: { icon: ShieldAlert, text: "Alert", cls: "from-bad to-coral" },
} as const;

export default function FairnessPage() {
  const d = useJson<Data>("/api/audit/fairness");
  const f = d.data?.fairness;
  const r = d.data?.results;
  const s = f ? STATUS[f.status] : null;
  const day90 = r?.curves.find((c) => c.day === 90);

  return (
    <div className="fit-page">
      <PageHeader title="Insights" subtitle="Fair offers and better matches" actions={<SegmentedLinks items={INSIGHT_TABS} active="/fairness" />} />
      {d.error && <ErrorState error={d.error} onRetry={d.reload} />}
      {d.loading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      )}

      {f && s && r && (
        <div className="fit-fill grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <section className="glass fit-scroll h-fit max-h-full animate-rise">
            <div className={`flex flex-wrap items-center gap-3 bg-gradient-to-r px-5 py-3.5 text-white dark:text-bg ${s.cls}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 dark:bg-black/10">
                <s.icon size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider opacity-85">Shift-offer audit</p>
                <p className="font-display text-xl font-bold">{s.text}</p>
              </div>
              <p className="max-w-[260px] text-[13px] leading-snug opacity-90">
                {f.status === "pass"
                  ? "Offer rates are balanced across self-reported groups."
                  : f.status === "watch"
                    ? "A gap below the four-fifths line, but not statistically significant. Keep monitoring."
                    : "A significant gap in offer rates. Review weights and rotation before the next cycle."}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px]">Offer rate by group</h2>
                  <Info>{f.method} Groups are optional self-reports, stored separately and never used in matching.</Info>
                </div>
                <OfferRateChart rows={f.rows} floor={Math.round(Math.max(...f.rows.map((x) => x.rate), 0) * 80)} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="glass-inset p-3">
                  <p className="label">p-value</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums">{f.chi.pPermutation}</p>
                  <p className="text-[12.5px] text-muted">permutation test</p>
                </div>
                <div className="glass-inset p-3">
                  <p className="label">4/5 ratio</p>
                  <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${f.impactRatio >= 0.8 ? "text-good" : "text-warn"}`}>{f.impactRatio}</p>
                  <p className="text-[12.5px] text-muted">min ÷ max rate</p>
                </div>
                <div className="glass-inset p-3">
                  <p className="label">Offers</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums">{f.totalOffers}</p>
                  <p className="text-[12.5px] text-muted">this cycle</p>
                </div>
                <div className="glass-inset p-3">
                  <p className="label">No offer</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                    {f.caregiversWithoutOffers}
                    <span className="text-base text-muted">/{f.eligibleCaregivers}</span>
                  </p>
                  <p className="text-[12.5px] text-muted">eligible caregivers</p>
                </div>
              </div>
            </div>
          </section>

          <section className="fit-scroll animate-rise space-y-4 [animation-delay:120ms]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px]">Before vs after Bonded</h2>
              <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-[12.5px] font-bold uppercase tracking-wider text-warn">Projected</span>
              <Info>
                Today's {r.matches} regular matches were assigned by nearest available caregiver. Bonded re-solves the same schedules with the same constraints. {r.model}
              </Info>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Average match today" value={<CountUp to={r.avgTasteBefore} />} sub="nearest available caregiver" />
              <Stat label="With Bonded" value={<CountUp to={r.avgTasteAfter} />} sub={`${r.avgTasteAfter - r.avgTasteBefore} points better`} tone="coral" />
              {day90 && <Stat label="Still together at 90 days" value={<CountUp to={day90.bonded} suffix="%" />} sub={`versus ${day90.proximity}% today`} tone="teal" />}
            </div>
            <div className="glass p-4">
              <RetentionChart data={r.curves} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
