"use client";
import { Check, ChevronRight, MapPin, RotateCcw, Siren, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { Avatar, BridgeChip, Empty, ErrorState, PageHeader, ScoreRing, Skeleton, SkeletonCards } from "@/components/ui";
import { fetchJson, post, useJson } from "@/components/useJson";

interface Board {
  agency: { name: string; city: string; caregivers: number; clients: number; today: string };
  open: { scheduleId: string; schedule: string; client: { id: string; name: string; age: number; area: string; needs: string[]; favourites: string[] } }[];
}

interface Proposal {
  scheduleId: string;
  schedule: string;
  client: { id: string; name: string; age: number; area: string };
  caregiver: { id: string; name: string; age: number } | null;
  candidate: { composite: number; taste: number; continuity: number; travelMin: number; bridges: { entityId: string; name: string; domain: string; weaker: boolean }[] } | null;
  alternatives: { caregiverId: string; name: string; composite: number; taste: number }[];
  eligibleCount: number;
}

type Decision = "approved" | "rejected";

export default function BoardPage() {
  const board = useJson<Board>("/api/board");
  const toast = useToast();
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [slow, setSlow] = useState(false);

  // `?auto=1` (guided tour, landing CTA, ⌘K) starts auto-match as soon as the board loads.
  useEffect(() => {
    if (!board.data || proposals || running) return;
    if (new URLSearchParams(window.location.search).get("auto") !== "1") return;
    window.history.replaceState(null, "", "/board");
    void autoMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.data]);

  useEffect(() => {
    if (!running) return setSlow(false);
    const t = setTimeout(() => setSlow(true), 3500);
    return () => clearTimeout(t);
  }, [running]);

  async function autoMatch() {
    setRunning(true);
    setError(null);
    setDecisions({});
    try {
      const res = await fetchJson<{ proposals: Proposal[] }>("/api/match/auto", post({ scheduleIds: board.data?.open.map((o) => o.scheduleId) }));
      setProposals(res.proposals);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  function decide(p: Proposal, d: Decision) {
    setDecisions((x) => ({ ...x, [p.scheduleId]: d }));
    if (d === "approved") toast(`${p.caregiver?.name.split(" ")[0]} assigned to ${p.client.name.split(" ")[0]}`);
  }

  const pending = proposals?.filter((p) => p.caregiver && !decisions[p.scheduleId]) ?? [];
  const approved = Object.values(decisions).filter((d) => d === "approved").length;

  return (
    <div className="fit-page">
      <PageHeader
        title="Matches"
        subtitle={board.data ? `${board.data.open.length} open schedules · ${board.data.agency.caregivers} caregivers` : "Open schedules"}
        info="Hard constraints first: availability, travel, skills, languages, pets, hours. Then Bonded ranks who's left by 60% Qloo taste, 25% continuity, 15% travel. You approve every assignment."
        actions={
          <>
            <Link href="/callout" className="btn-ghost">
              <Siren size={16} className="text-bad" /> Cover a call-out
            </Link>
            <button className="btn-primary" onClick={autoMatch} disabled={running || !board.data}>
              {proposals ? <RotateCcw size={16} /> : <Sparkles size={16} />}
              {running ? "Finding matches…" : proposals ? "Find again" : "Find matches"}
            </button>
          </>
        }
      />

      <div className="fit-fill grid gap-5 lg:grid-cols-[272px_1fr]">
        <section aria-label="Open schedules" className="glass fit-scroll h-fit max-h-full p-2">
          <p className="label px-3 pb-1 pt-2">Open schedules</p>
          {board.loading && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-1">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {board.error && <ErrorState error={board.error} onRetry={board.reload} />}
          <ul>
            {board.data?.open.map((o) => {
              const p = proposals?.find((x) => x.scheduleId === o.scheduleId);
              const d = decisions[o.scheduleId];
              return (
                <li key={o.scheduleId} className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-ink/[0.04]">
                  <Avatar name={o.client.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[14.5px] font-semibold">{o.client.name}</p>
                      <span className="shrink-0 text-[12.5px] text-muted">{o.client.age}</span>
                    </div>
                    <p className="truncate text-[13px] text-muted">{d === "approved" && p?.caregiver ? `✓ ${p.caregiver.name}` : o.schedule}</p>
                  </div>
                  {d === "approved" && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-good" aria-label="assigned" />}
                  {!d && p?.caregiver && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-teal" aria-label="proposal ready" />}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Proposed matches" className="flex min-h-0 flex-col">
          {running && (
            <>
              {slow && (
                <p className="mb-3 flex items-center gap-2 text-sm text-muted" role="status">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-teal" /> Building taste profiles with Qloo. The first run takes a few seconds.
                </p>
              )}
              <SkeletonCards n={6} />
            </>
          )}
          {error && !running && <ErrorState error={error} onRetry={autoMatch} />}
          {!running && !proposals && !error && (
            <Empty
              icon={<Sparkles size={26} />}
              title="Fill every open schedule"
              action={
                <button className="btn-primary mt-2" onClick={autoMatch} disabled={!board.data}>
                  <Sparkles size={16} /> Find matches
                </button>
              }
            >
              Bonded proposes the best qualified caregiver for each client, with the shared tastes that make it click.
            </Empty>
          )}

          {!running && proposals && (
            <>
              <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">
                  <span className="font-semibold text-ink">{approved}</span> of {proposals.length} approved
                </p>
                {pending.length > 1 && (
                  <button
                    className="btn-ghost min-h-[34px] px-3 py-1.5"
                    onClick={() => {
                      setDecisions((x) => ({ ...x, ...Object.fromEntries(pending.map((p) => [p.scheduleId, "approved" as const])) }));
                      toast(`${pending.length} assignments approved`);
                    }}
                  >
                    <Check size={15} /> Approve all
                  </button>
                )}
              </div>
              <div className="fit-scroll -mx-1 grid content-start gap-4 px-1 pb-1 md:grid-cols-2 xl:grid-cols-3">
                {proposals.map((p, i) => {
                  const d = decisions[p.scheduleId];
                  return (
                    <article
                      key={p.scheduleId}
                      className={`glass group animate-rise p-4 transition duration-300 hover:border-ink/20 ${d === "rejected" ? "opacity-55" : ""} ${d === "approved" ? "ring-2 ring-good/50" : ""}`}
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="label">{p.schedule}</span>
                        {d === "approved" && <span className="flex animate-pop items-center gap-1 text-xs font-semibold text-good"><Check size={14} /> Assigned</span>}
                        {d === "rejected" && <span className="text-xs font-semibold text-muted">Skipped</span>}
                      </div>
                      {p.caregiver && p.candidate ? (
                        <>
                          <Link href={`/match/${p.client.id}/${p.caregiver.id}`} className="mt-3 flex items-center gap-2" aria-label={`Open match: ${p.client.name} and ${p.caregiver.name}`}>
                            <div className="w-[68px] text-center">
                              <Avatar name={p.client.name} size={40} ring="teal" />
                              <p className="mt-1 truncate text-[13.5px] font-semibold">{p.client.name.split(" ")[0]}</p>
                              <p className="text-[12.5px] text-muted">{p.client.age}</p>
                            </div>
                            <div className="relative flex flex-1 items-center">
                              <div className="bridge-line h-[3px] w-full rounded-full opacity-70" />
                              <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-surface p-0.5">
                                <ScoreRing value={p.candidate.taste} size={48} />
                              </span>
                            </div>
                            <div className="w-[68px] text-center">
                              <Avatar name={p.caregiver.name} size={40} ring="coral" />
                              <p className="mt-1 truncate text-[13.5px] font-semibold">{p.caregiver.name.split(" ")[0]}</p>
                              <p className="text-[12.5px] text-muted">{p.caregiver.age}</p>
                            </div>
                          </Link>
                          <div className="mt-3 flex min-h-[24px] flex-wrap gap-1.5">
                            {p.candidate.bridges.slice(0, 2).map((b) => (
                              <BridgeChip key={b.entityId} name={b.name} domain={b.domain} weaker={b.weaker} />
                            ))}
                            {!p.candidate.bridges.length && <span className="text-xs text-muted">No strong shared taste yet</span>}
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap text-xs text-muted">
                            <span className="flex items-center gap-1">
                              <MapPin size={13} /> {p.candidate.travelMin} min
                            </span>
                            <span>{p.eligibleCount} qualified</span>
                            {p.candidate.continuity > 0 && <span>Worked together</span>}
                          </div>
                          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                            {!d ? (
                              <>
                                <button className="btn-primary min-h-[36px] flex-1 py-1.5" onClick={() => decide(p, "approved")}>
                                  <Check size={15} /> Approve
                                </button>
                                <button className="btn-icon btn-ghost h-9 min-h-[36px] w-9 shrink-0" onClick={() => decide(p, "rejected")} aria-label="Skip" title="Skip">
                                  <X size={15} />
                                </button>
                              </>
                            ) : (
                              <button className="btn-ghost min-h-[36px] flex-1 py-1.5" onClick={() => setDecisions(({ [p.scheduleId]: _drop, ...rest }) => (void _drop, rest))}>
                                Undo
                              </button>
                            )}
                            <Link href={`/match/${p.client.id}/${p.caregiver.id}`} className="btn-icon btn-ghost h-9 min-h-[36px] w-9 shrink-0" aria-label="See match details" title="See match details">
                              <ChevronRight size={17} />
                            </Link>
                          </div>
                          {d === "rejected" && p.alternatives.length > 0 && (
                            <p className="mt-3 text-xs text-muted">Next best: {p.alternatives.map((a) => a.name).join(", ")}</p>
                          )}
                        </>
                      ) : (
                        <p className="mt-4 text-sm text-muted">No qualified caregiver is free. Escalate to on-call.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
