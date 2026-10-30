"use client";
import { ArrowLeft, Check, HeartPulse, RefreshCw, Sparkles, UserRoundCog } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HealthFlag, HealthMatch } from "@/lib/agent/health";
import { useToast } from "@/components/Toast";
import { Avatar, BridgeChip, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { post, useJson } from "@/components/useJson";

interface Review {
  flags: HealthFlag[];
  matches: HealthMatch[];
  classifiedBy: "llm" | "keywords";
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 64;
  const h = 22;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h / 2 - (v * (h - 6)) / 2}`).join(" ");
  const last = values[values.length - 1];
  const color = last < 0 ? "rgb(var(--bad))" : last === 0 ? "rgb(var(--warn))" : "rgb(var(--teal))";
  return (
    <svg width={w} height={h} role="img" aria-label={`Recent ratings ${values.join(", ")}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const FACE: Record<number, string> = { 1: "😊", 0: "😐", [-1]: "😟" };
const LABEL_TONE: Record<string, string> = {
  conflict: "bg-bad/10 text-bad",
  disengagement: "bg-warn/15 text-warn",
  stale_conversation: "bg-violet/10 text-violet",
  rapport: "bg-good/10 text-good",
};

export default function HealthPage() {
  const review = useJson<Review>("/api/agent/health-review", post({}));
  const toast = useToast();
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);

  useEffect(() => {
    if (!active && review.data?.flags[0]) setActive(review.data.flags[0].matchKey);
  }, [review.data, active]);

  const data = review.data;
  const flag = data?.flags.find((f) => f.matchKey === active);
  const sorted = data ? [...data.matches].sort((a, b) => Number(b.flagged) - Number(a.flagged) || a.trend - b.trend) : [];

  return (
    <div>
      <PageHeader
        title="Health"
        subtitle={data ? `${data.flags.length} relationships need a look · ${data.matches.length} active` : "Weekly relationship review"}
        info={`After each visit the caregiver taps 😊 😐 😟; families rate weekly. Bonded flags matches trending down and labels notes from a fixed set (${data?.classifiedBy === "llm" ? "Gemini" : "keyword classifier"}). A human reviews every flag.`}
        actions={
          <button className="btn-ghost" onClick={review.reload} disabled={review.loading}>
            <RefreshCw size={15} className={review.loading ? "animate-spin" : ""} /> Re-run review
          </button>
        }
      />
      {review.error && <ErrorState error={review.error} onRetry={review.reload} />}
      {review.loading && !data && (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="glass space-y-3 p-4">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
          <Skeleton className="h-[520px] rounded-3xl" />
        </div>
      )}

      {data && (
        <div className="grid gap-5 lg:h-[calc(100dvh-264px)] lg:min-h-[480px] lg:grid-cols-[320px_1fr]">
          <section aria-label="Active matches" className={`glass overflow-hidden p-2 lg:flex lg:min-h-0 lg:flex-col ${mobileDetail ? "hidden lg:flex" : ""}`}>
            <ul className="max-h-[640px] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
              {sorted.map((m) => {
                const f = data.flags.find((x) => x.matchKey === m.matchKey);
                const on = active === m.matchKey;
                return (
                  <li key={m.matchKey}>
                    <button
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${on ? "bg-teal text-white dark:text-bg" : "hover:bg-ink/[0.04]"} ${!f ? "cursor-default" : ""}`}
                      onClick={() => {
                        if (!f) return;
                        setActive(m.matchKey);
                        setMobileDetail(true);
                      }}
                      aria-current={on ? "true" : undefined}
                    >
                      <span className="relative">
                        <Avatar name={m.clientName} size={42} />
                        {f && !reviewed[m.matchKey] && <span className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-bg ${f.severity === "high" ? "bg-bad" : "bg-warn"}`} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-semibold">{m.clientName}</span>
                        <span className={`block truncate text-[14px] ${on ? "text-white dark:text-bg/80" : "text-muted"}`}>
                          {reviewed[m.matchKey] ? "✓ Reviewed" : `with ${m.caregiverName}`}
                        </span>
                      </span>
                      <Sparkline values={m.ratings} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-label="Flag detail" className={`min-h-0 ${mobileDetail ? "" : "hidden lg:block"}`}>
            {!flag && (
              <div className="glass flex h-full min-h-[300px] flex-col items-center justify-center gap-2 p-8 text-center">
                <HeartPulse size={28} className="text-good" />
                <p className="font-display text-lg font-semibold">All relationships look healthy</p>
              </div>
            )}
            {flag && (
              <div className="glass flex animate-rise flex-col overflow-hidden lg:h-full" key={flag.matchKey}>
                <div className="flex items-center gap-3 border-b border-ink/[0.07] p-4">
                  <button className="btn-icon btn-ghost lg:hidden" onClick={() => setMobileDetail(false)} aria-label="Back">
                    <ArrowLeft size={17} />
                  </button>
                  <div className="flex -space-x-3">
                    <Avatar name={flag.clientName} size={40} />
                    <Avatar name={flag.caregiverName} size={40} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {flag.clientName.split(" ")[0]} & {flag.caregiverName}
                    </p>
                    <p className="text-xs text-muted">
                      {flag.declines > 0 ? `${flag.declines} declined shifts · ` : ""}trend {flag.trend > 0 ? "+" : ""}
                      {flag.trend}/visit
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${flag.severity === "high" ? "bg-bad/10 text-bad" : "bg-warn/15 text-warn"}`}>
                    {flag.severity === "high" ? "Needs attention" : "Watch"}
                  </span>
                </div>

                <ol tabIndex={0} aria-label="Visit notes" className="space-y-2.5 bg-ink/[0.02] p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/50 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                  {flag.evidence.map((e, i) => {
                    const family = e.by === "family";
                    return (
                      <li key={i} className={`flex animate-rise ${family ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 50}ms` }}>
                        <div className={`max-w-[82%] rounded-[20px] px-3.5 py-2 shadow-sm ${family ? "rounded-br-md bg-gradient-to-b from-teal to-teal/85 text-white dark:text-bg" : "rounded-bl-md bg-surface"}`}>
                          <p className="text-[15px] leading-snug">
                            <span className="mr-1.5">{FACE[e.rating]}</span>
                            {e.note ?? <span className={family ? "" : "text-muted"}>No note</span>}
                          </p>
                          <p className={`mt-0.5 flex flex-wrap items-center gap-1 text-[12.5px] ${family ? "text-white/90 dark:text-bg/80" : "text-muted"}`}>
                            {family ? "Family" : "Caregiver"} · {e.date.slice(5)}
                            {e.labels
                              .filter((l) => l !== "none")
                              .map((l) => (
                                <span key={l} className={`rounded-full px-1.5 py-px font-semibold ${family ? "bg-white/20" : `${LABEL_TONE[l] ?? "bg-ink/[0.06]"} dark:bg-transparent dark:px-0`}`}>
                                  {l.replace("_", " ")}
                                </span>
                              ))}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="border-t border-ink/[0.07] p-4">
                  <div className="flex gap-3 rounded-2xl bg-gradient-to-br from-teal/10 to-violet/10 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-violet text-white">
                      {flag.suggestedAction.kind === "rematch" ? <UserRoundCog size={18} /> : <Sparkles size={17} />}
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      {flag.suggestedAction.kind === "rematch" && (
                        <>
                          <p className="font-semibold">
                            Offer {flag.suggestedAction.caregiverName} instead · {flag.suggestedAction.taste} vs {flag.suggestedAction.currentTaste}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {flag.suggestedAction.bridges.map((b) => (
                              <BridgeChip key={b.name} name={b.name} domain={b.domain} />
                            ))}
                          </div>
                          <Link href={`/match/${flag.clientId}/${flag.suggestedAction.caregiverId}`} className="mt-3 inline-block font-semibold text-teal">
                            Review match →
                          </Link>
                        </>
                      )}
                      {flag.suggestedAction.kind === "refresh_kit" && (
                        <>
                          <p className="font-semibold">Refresh the conversation with new bridges</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {flag.suggestedAction.freshBridges.map((b) => (
                              <BridgeChip key={b.name} name={b.name} domain={b.domain} />
                            ))}
                          </div>
                          <Link href={`/kit/${flag.clientId}/${flag.caregiverId}`} className="mt-3 inline-block font-semibold text-teal">
                            Open fresh Bridge Kit →
                          </Link>
                        </>
                      )}
                      {flag.suggestedAction.kind === "check_in" && <p className="font-semibold">Schedule a supervisor check-in with the family</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">Bonded never reassigns on its own</span>
                    {reviewed[flag.matchKey] ? (
                      <span className="flex items-center gap-1 text-sm font-semibold text-good">
                        <Check size={16} /> Reviewed
                      </span>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setReviewed((r) => ({ ...r, [flag.matchKey]: true }));
                          toast("Marked as reviewed");
                          const next = data.flags.find((f) => f.matchKey !== flag.matchKey && !reviewed[f.matchKey]);
                          if (next) setTimeout(() => setActive(next.matchKey), 400);
                        }}
                      >
                        <Check size={15} /> Mark reviewed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
