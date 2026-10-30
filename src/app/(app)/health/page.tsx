"use client";
import Link from "next/link";
import { useState } from "react";
import type { HealthFlag, HealthMatch } from "@/lib/agent/health";
import { BridgeChip, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { post, useJson } from "@/components/useJson";

interface Review {
  flags: HealthFlag[];
  matches: HealthMatch[];
  classifiedBy: "claude" | "keywords";
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-xs text-muted">—</span>;
  const w = 90;
  const h = 26;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h / 2 - (v * (h - 6)) / 2}`).join(" ");
  const last = values[values.length - 1];
  const color = last < 0 ? "rgb(var(--bad))" : last === 0 ? "rgb(var(--warn))" : "rgb(var(--teal))";
  return (
    <svg width={w} height={h} role="img" aria-label={`Ratings: ${values.join(", ")}`}>
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="rgb(var(--line))" strokeDasharray="2 3" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

const FACE: Record<number, string> = { 1: "😊", 0: "😐", [-1]: "😟" };

export default function HealthPage() {
  const review = useJson<Review>("/api/agent/health-review", post({}));
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<string | null>(null);

  if (review.loading) return <Spinner label="Running the weekly relationship health review…" />;
  if (review.error || !review.data) return <ErrorState error={review.error ?? "No data"} onRetry={review.reload} />;
  const { flags, matches, classifiedBy } = review.data;
  const flag = flags.find((f) => f.matchKey === (active ?? flags[0]?.matchKey));

  return (
    <div>
      <PageHeader eyebrow="Weekly review · early warning" title="Relationship health">
        After each visit the caregiver taps 😊 😐 😟 and can add a note; families rate weekly. The agent flags matches trending down. Notes are classified into a
        fixed label set ({classifiedBy === "claude" ? "by Claude" : "keyword classifier"}). A human reviews every flag.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Active matches</h2>
            <button className="btn-ghost px-3 py-1.5" onClick={review.reload}>
              Re-run review
            </button>
          </div>
          <ul className="mt-3 max-h-[620px] divide-y divide-line overflow-y-auto">
            {[...matches]
              .sort((a, b) => Number(b.flagged) - Number(a.flagged) || a.trend - b.trend)
              .map((m) => (
                <li key={m.matchKey}>
                  <button
                    className={`flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left ${m.flagged ? "hover:bg-bg" : "cursor-default"} ${active === m.matchKey ? "bg-tealsoft/50" : ""}`}
                    onClick={() => m.flagged && setActive(m.matchKey)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{m.clientName}</span>
                      <span className="block truncate text-xs text-muted">with {m.caregiverName}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Sparkline values={m.ratings} />
                      {m.flagged ? <span className="chip">flag</span> : <span className="w-[42px]" />}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>

        <section>
          {!flag && <p className="text-muted">No matches flagged this week.</p>}
          {flag && (
            <div className="card p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={flag.severity === "high" ? "chip" : "chip-teal"}>{flag.severity === "high" ? "Needs attention" : "Watch"}</span>
                {flag.labels.map((l) => (
                  <span key={l} className="rounded-full border border-line px-2 py-0.5 text-xs">
                    {l.replace("_", " ")}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 text-2xl">
                {flag.clientName} &amp; {flag.caregiverName}
              </h2>
              <p className="text-sm text-muted">
                Trend {flag.trend > 0 ? "+" : ""}
                {flag.trend} per visit · recent average {flag.recentAvg} · {flag.declines} declined shifts
              </p>

              <ol className="mt-4 space-y-2">
                {flag.evidence.map((e, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span aria-label={`rating ${e.rating}`}>{FACE[e.rating]}</span>
                    <span className="w-20 shrink-0 text-xs text-muted">{e.date.slice(5)} · {e.by}</span>
                    <span className="flex-1">{e.note ?? <span className="text-muted">no note</span>}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-5 rounded-xl bg-bg p-4">
                <p className="label">Suggested action</p>
                {flag.suggestedAction.kind === "rematch" && (
                  <div className="mt-2 text-sm">
                    <p>
                      Offer a re-match with <strong>{flag.suggestedAction.caregiverName}</strong>: taste {flag.suggestedAction.taste}/100 vs{" "}
                      {flag.suggestedAction.currentTaste}/100 today.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {flag.suggestedAction.bridges.map((b) => (
                        <BridgeChip key={b.name} name={b.name} domain={b.domain} />
                      ))}
                    </div>
                    <Link href={`/match/${flag.clientId}/${flag.suggestedAction.caregiverId}`} className="mt-3 inline-block font-semibold text-teal">
                      Review the proposed match →
                    </Link>
                  </div>
                )}
                {flag.suggestedAction.kind === "refresh_kit" && (
                  <div className="mt-2 text-sm">
                    <p>The conversation has gone stale. Send a fresh Bridge Kit built on new bridges:</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {flag.suggestedAction.freshBridges.map((b) => (
                        <BridgeChip key={b.name} name={b.name} domain={b.domain} />
                      ))}
                    </div>
                    <Link href={`/kit/${flag.clientId}/${flag.caregiverId}`} className="mt-3 inline-block font-semibold text-teal">
                      Open a fresh Bridge Kit →
                    </Link>
                  </div>
                )}
                {flag.suggestedAction.kind === "check_in" && <p className="mt-2 text-sm">Schedule a supervisor check-in call with the family.</p>}
              </div>

              <div className="mt-5 flex items-center gap-3">
                {reviewed[flag.matchKey] ? (
                  <span className="chip-teal">Reviewed by scheduler</span>
                ) : (
                  <button className="btn-primary" onClick={() => setReviewed((r) => ({ ...r, [flag.matchKey]: true }))}>
                    Mark reviewed
                  </button>
                )}
                <span className="text-xs text-muted">Bonded never re-assigns on its own.</span>
              </div>
            </div>
          )}
          {flags.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {flags.map((f) => (
                <button key={f.matchKey} className={f.matchKey === flag?.matchKey ? "btn-primary px-3 py-1.5" : "btn-ghost px-3 py-1.5"} onClick={() => setActive(f.matchKey)}>
                  {f.clientName.split(" ")[0]} &amp; {f.caregiverName.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
