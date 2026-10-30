"use client";
import { Bot, Database, GitMerge, Search, Sparkles, Waypoints } from "lucide-react";
import type { EvalSummary } from "@/lib/eval/run";
import { INSIGHT_TABS } from "@/components/insights";
import { ErrorState, Info, PageHeader, ScoreRing, SegmentedLinks, Skeleton } from "@/components/ui";
import { useJson } from "@/components/useJson";
import { CountUp } from "@/components/motion";

interface Data {
  status: "ok" | "not_run";
  results?: EvalSummary;
  gold: { id: string; note: string; compatible: boolean; a: string[]; b: string[] }[];
}

const STEPS = [
  { icon: Search, title: "Resolve", body: "Each favourite → Qloo /search → entity ID" },
  { icon: Waypoints, title: "Expand", body: "/v2/insights per domain, top 50 with affinity" },
  { icon: GitMerge, title: "Overlap", body: "Weighted Jaccard across music, TV, film, places, books" },
  { icon: Sparkles, title: "Bridges", body: "Entities both people score highly, with evidence" },
  { icon: Database, title: "Cache", body: "Every response cached; nothing guessed" },
];

const pct = (x: number) => Math.round(x * 100);

export default function EvaluationPage() {
  const d = useJson<Data>("/api/eval");
  const r = d.data?.results;
  const rows = new Map(r?.rows.map((x) => [x.id, x]));

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="Why it only works with Qloo" actions={<SegmentedLinks items={INSIGHT_TABS} active="/evaluation" />} />
      {d.error && <ErrorState error={d.error} onRetry={d.reload} />}
      {d.loading && <Skeleton className="h-64 rounded-3xl" />}

      {d.data && (
        <>
          {r ? (
          <section className="grid animate-rise gap-4 sm:grid-cols-2">
            <div className="glass relative overflow-hidden p-6 ring-2 ring-teal/30">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal/20 blur-2xl" />
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-violet text-white">
                  <Sparkles size={16} />
                </span>
                <p className="font-semibold">Bonded · Qloo</p>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <ScoreRing value={r ? pct(r.bonded.separation) : null} size={104} stroke={9} label="separation" />
                <div>
                  <p className="font-display text-4xl font-bold">{r ? <CountUp to={pct(r.bonded.separation)} suffix="%" /> : "—"}</p>
                  <p className="text-sm text-muted">separation</p>
                  {r && <p className="mt-1 text-xs text-muted">{pct(r.bonded.accuracy)}% accuracy at {r.threshold}</p>}
                </div>
              </div>
            </div>
            <div className="glass relative overflow-hidden p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink/[0.07]">
                  <Bot size={17} />
                </span>
                <p className="font-semibold">LLM only{r?.model ? ` · ${r.model}` : ""}</p>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <ScoreRing value={r?.llm ? pct(r.llm.separation) : null} size={104} stroke={9} label="LLM separation" />
                <div>
                  <p className="font-display text-4xl font-bold">{r?.llm ? `${pct(r.llm.separation)}%` : "—"}</p>
                  <p className="text-sm text-muted">separation</p>
                  {r?.llm ? <p className="mt-1 text-xs text-muted">{pct(r.llm.accuracy)}% accuracy at {r.threshold}</p> : <p className="mt-1 text-xs text-muted">Run with GEMINI_API_KEY</p>}
                </div>
              </div>
            </div>
          </section>
          ) : (
            <div className="glass flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tealsoft text-teal">
                <Sparkles size={20} />
              </span>
              <p className="text-sm text-muted">
                No evaluation on this deployment yet. Run <code className="font-mono">npm run eval</code> or the “Live Qloo check & evaluation” workflow.
              </p>
            </div>
          )}

          <section className="glass animate-rise p-5 [animation-delay:100ms]">
            <h2 className="text-[17px]">How Bonded uses Qloo</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-5">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="glass-inset relative p-4">
                  <span className="absolute right-3 top-3 text-[12.5px] font-bold text-muted">{i + 1}</span>
                  <Icon size={20} className="text-teal" />
                  <p className="mt-2 font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="glass animate-rise p-2 [animation-delay:160ms]">
            <div className="flex items-center gap-2 px-3 pb-1 pt-3">
              <h2 className="text-[17px]">Gold set</h2>
              <Info>20 hand-written pairs, labelled before any run: 10 obviously compatible, 10 obviously not. Separation = share of (compatible, incompatible) pairs ranked correctly.</Info>
            </div>
            <ul className="divide-y divide-ink/[0.06]">
              {d.data.gold.map((g) => {
                const row = rows.get(g.id);
                return (
                  <li key={g.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 sm:grid-cols-[1fr_auto_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{g.note}</p>
                      <p className="truncate text-xs text-muted">
                        {g.a.join(", ")} ↔ {g.b.join(", ")}
                      </p>
                    </div>
                    <span className={`justify-self-end rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${g.compatible ? "bg-good/10 text-good" : "bg-ink/[0.06] text-muted"}`}>
                      {g.compatible ? "match" : "no match"}
                    </span>
                    <div className="col-span-2 flex items-center gap-4 text-xs tabular-nums sm:col-span-1">
                      <span className="w-20">
                        <span className="text-muted">Bonded </span>
                        <span className="font-semibold">{row?.bonded ?? "—"}</span>
                      </span>
                      <span className="w-16">
                        <span className="text-muted">LLM </span>
                        <span className="font-semibold">{row?.llm ?? "—"}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
