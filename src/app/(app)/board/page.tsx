"use client";
import Link from "next/link";
import { useState } from "react";
import { Avatar, BridgeChip, Empty, ErrorState, PageHeader, ScoreRing, Spinner } from "@/components/ui";
import { fetchJson, post, useJson } from "@/components/useJson";

interface Board {
  agency: { name: string; city: string; caregivers: number; clients: number; today: string };
  open: { scheduleId: string; schedule: string; client: { id: string; name: string; age: number; area: string; needs: string[]; favourites: string[] } }[];
  demo: { calloutShiftId: string };
}

interface Proposal {
  scheduleId: string;
  schedule: string;
  client: { id: string; name: string; age: number; area: string };
  caregiver: { id: string; name: string; age: number } | null;
  candidate: { composite: number; taste: number; continuity: number; travelMin: number; bridges: { name: string; domain: string; weaker: boolean }[]; reasons: string[] } | null;
  alternatives: { caregiverId: string; name: string; composite: number; taste: number }[];
  eligibleCount: number;
}

type Decision = "approved" | "rejected";

export default function BoardPage() {
  const board = useJson<Board>("/api/board");
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  async function autoMatch() {
    setRunning(true);
    setError(null);
    setProposals(null);
    try {
      const res = await fetchJson<{ proposals: Proposal[] }>("/api/match/auto", post({ scheduleIds: board.data?.open.map((o) => o.scheduleId) }));
      setProposals(res.proposals);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow={board.data ? `${board.data.agency.name} · ${board.data.agency.city}` : "Match Board"} title="Match Board">
        Hard constraints first (availability, travel, skills, languages, pets, hours). Then Qloo taste, continuity and travel rank who's left. Bonded proposes;
        you decide.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <section aria-label="Open schedules">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Open schedules</h2>
            {board.data && <span className="chip-teal">{board.data.open.length} open</span>}
          </div>
          {board.loading && <Spinner label="Loading schedules" />}
          {board.error && <ErrorState error={board.error} onRetry={board.reload} />}
          <ul className="space-y-3">
            {board.data?.open.map((o) => (
              <li key={o.scheduleId} className="card p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={o.client.name} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {o.client.name}, {o.client.age}
                    </p>
                    <p className="text-xs text-muted">
                      {o.schedule} · {o.client.area}
                    </p>
                  </div>
                </div>
                <p className="mt-2 truncate text-xs text-muted" title={o.client.favourites.join(", ")}>
                  Loves {o.client.favourites.slice(0, 3).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Proposed matches">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl">Proposed matches</h2>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={autoMatch} disabled={running || !board.data}>
                {running ? "Matching…" : proposals ? "Re-run auto-match" : "Auto-match"}
              </button>
              <Link href="/callout" className="btn-danger">
                Simulate a call-out
              </Link>
            </div>
          </div>

          {running && (
            <div className="card p-6">
              <Spinner label="Resolving favourites with Qloo, expanding taste profiles, solving the assignment…" />
              <p className="mt-2 text-xs text-muted">First run on a cold cache can take ~20 s; after that it's instant.</p>
            </div>
          )}
          {error && <ErrorState error={error} onRetry={autoMatch} />}
          {!running && !proposals && !error && (
            <Empty title="Click Auto-match to fill the open schedules">Each card shows the taste score and the top two bridges Qloo found.</Empty>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {proposals?.map((p, i) => (
              <article
                key={p.scheduleId}
                className={`card animate-rise p-5 ${decisions[p.scheduleId] === "rejected" ? "opacity-50" : ""}`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <p className="label">{p.schedule}</p>
                {p.caregiver && p.candidate ? (
                  <>
                    <Link href={`/match/${p.client.id}/${p.caregiver.id}`} className="group mt-3 flex items-center gap-3" aria-label={`Match detail for ${p.client.name} and ${p.caregiver.name}`}>
                      <div className="text-center">
                        <Avatar name={p.client.name} size={44} ring="teal" />
                        <p className="mt-1 max-w-[90px] truncate text-xs font-semibold">{p.client.name.split(" ")[0]}, {p.client.age}</p>
                      </div>
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-teal to-coral" />
                      <ScoreRing value={p.candidate.taste} />
                      <div className="h-0.5 flex-1 bg-gradient-to-r from-coral to-teal" />
                      <div className="text-center">
                        <Avatar name={p.caregiver.name} size={44} ring="coral" />
                        <p className="mt-1 max-w-[90px] truncate text-xs font-semibold">{p.caregiver.name}, {p.caregiver.age}</p>
                      </div>
                    </Link>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.candidate.bridges.slice(0, 2).map((b) => (
                        <BridgeChip key={b.name} {...b} />
                      ))}
                      {!p.candidate.bridges.length && <span className="text-xs text-muted">No strong bridges: matched on constraints and travel.</span>}
                    </div>
                    <p className="mt-3 text-xs text-muted">
                      Overall {p.candidate.composite} · {p.candidate.travelMin} min away · {p.eligibleCount} eligible
                      {p.candidate.continuity ? " · worked together before" : ""}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      {decisions[p.scheduleId] ? (
                        <span className={decisions[p.scheduleId] === "approved" ? "chip-teal" : "chip"}>
                          {decisions[p.scheduleId] === "approved" ? "Approved by scheduler" : "Rejected"}
                        </span>
                      ) : (
                        <>
                          <button className="btn-primary px-4 py-1.5" onClick={() => setDecisions((d) => ({ ...d, [p.scheduleId]: "approved" }))}>
                            Approve
                          </button>
                          <button className="btn-ghost px-4 py-1.5" onClick={() => setDecisions((d) => ({ ...d, [p.scheduleId]: "rejected" }))}>
                            Reject
                          </button>
                        </>
                      )}
                      <Link href={`/match/${p.client.id}/${p.caregiver.id}`} className="ml-auto text-sm font-semibold text-teal">
                        Details →
                      </Link>
                    </div>
                    {decisions[p.scheduleId] === "rejected" && p.alternatives.length > 0 && (
                      <p className="mt-2 text-xs text-muted">
                        Next best: {p.alternatives.map((a) => `${a.name} (${a.composite})`).join(", ")}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted">No eligible caregiver passes every hard constraint. Escalate to the on-call scheduler.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
