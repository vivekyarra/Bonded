"use client";
import Link from "next/link";
import { useState } from "react";
import { TasteRadar } from "@/components/TasteRadar";
import { Avatar, BridgeChip, CachedBadge, ErrorState, ScoreRing, Spinner } from "@/components/ui";
import { fetchJson, post, useJson } from "@/components/useJson";

interface Seed {
  qlooId: string;
  name: string;
  kind: string;
  source: string;
}
interface Bridge {
  entityId: string;
  name: string;
  domain: string;
  strength: number;
  affinityA: number | null;
  affinityB: number | null;
  seedsA: string[];
  seedsB: string[];
  weaker: boolean;
  sharedSeed: boolean;
}
interface Detail {
  client: { id: string; name: string; age: number; area: string; seeds: Seed[]; unresolved: string[]; eraAnswer?: string };
  caregiver: { id: string; name: string; age: number; area: string; seeds: Seed[]; unresolved: string[]; blurb: string };
  score: { tasteScore: number; raw: number; seedBonus: number; bridges: Bridge[]; friction: { domain: string; text: string }[]; perDomain: Record<string, { overlap: number; weight: number; shared: number }> };
  radar: { domain: string; client: number; caregiver: number }[];
  why: {
    weights: { taste: number; continuity: number; travel: number };
    domainWeights: Record<string, number>;
    taste: number;
    continuity: number;
    travelMin: number;
    travelScore: number;
    composite: number;
    eligibility: { eligible: boolean; reasons: string[] } | null;
  };
  cached: boolean;
}
type Llm = { available: true; score: number; sharedInterests: string[]; rationale: string } | { available: false; reason: string };

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);

function SeedList({ seeds, unresolved }: { seeds: Seed[]; unresolved: string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {seeds.map((s) => (
        <li key={s.qlooId} className="rounded-full border border-line px-2.5 py-0.5 text-xs" title={`Qloo ID ${s.qlooId}`}>
          {s.name}
          {s.source === "era" && <span className="ml-1 text-muted">(era)</span>}
        </li>
      ))}
      {unresolved.map((u) => (
        <li key={u} className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted line-through" title="Not found in Qloo, so not used">
          {u}
        </li>
      ))}
    </ul>
  );
}

export default function MatchDetail({ params }: { params: { clientId: string; caregiverId: string } }) {
  const d = useJson<Detail>("/api/compat/pair", post(params));
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<"bonded" | "llm">("bonded");
  const [llm, setLlm] = useState<Llm | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  async function showLlm() {
    setMode("llm");
    if (llm) return;
    setLlmLoading(true);
    try {
      setLlm(await fetchJson<Llm>("/api/compare/llm", post(params)));
    } catch (e) {
      setLlm({ available: false, reason: e instanceof Error ? e.message : String(e) });
    } finally {
      setLlmLoading(false);
    }
  }

  if (d.loading) return <Spinner label="Asking Qloo for both taste profiles…" />;
  if (d.error || !d.data) return <ErrorState error={d.error ?? "No data"} onRetry={d.reload} />;
  const { client, caregiver, score, radar, why } = d.data;

  return (
    <div className="space-y-6">
      <Link href="/board" className="text-sm text-muted hover:text-ink">
        ← Match Board
      </Link>
      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex min-w-[200px] flex-1 items-center gap-3">
            <Avatar name={client.name} size={56} ring="teal" />
            <div>
              <p className="label">Client</p>
              <h1 className="text-2xl">
                {client.name}, {client.age}
              </h1>
              <p className="text-xs text-muted">{client.area}</p>
            </div>
          </div>
          <ScoreRing value={score.tasteScore} size={84} />
          <div className="flex min-w-[200px] flex-1 items-center justify-end gap-3 text-right">
            <div>
              <p className="label">Caregiver</p>
              <h2 className="text-2xl">
                {caregiver.name}, {caregiver.age}
              </h2>
              <p className="text-xs text-muted">{caregiver.blurb || caregiver.area}</p>
            </div>
            <Avatar name={caregiver.name} size={56} ring="coral" />
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className="label">{client.name.split(" ")[0]}'s favourites (resolved by Qloo)</p>
            <SeedList seeds={client.seeds} unresolved={client.unresolved} />
            {client.eraAnswer && <p className="mt-2 text-xs text-muted">Era question: “{client.eraAnswer}”</p>}
          </div>
          <div className="md:text-right">
            <p className="label">{caregiver.name.split(" ")[0]}'s favourites</p>
            <SeedList seeds={caregiver.seeds} unresolved={caregiver.unresolved} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2" role="tablist" aria-label="Comparison">
        <button role="tab" aria-selected={mode === "bonded"} className={mode === "bonded" ? "btn-primary" : "btn-ghost"} onClick={() => setMode("bonded")}>
          Bonded match (Qloo)
        </button>
        <button role="tab" aria-selected={mode === "llm"} className={mode === "llm" ? "btn-primary" : "btn-ghost"} onClick={showLlm}>
          LLM-only match
        </button>
        <CachedBadge cached={d.data.cached} />
      </div>

      {mode === "llm" ? (
        <section className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <p className="label">LLM-only (Claude, raw favourites, no Qloo)</p>
            {llmLoading && <Spinner label="Asking the LLM to guess…" />}
            {llm && !llm.available && <p className="mt-3 text-sm text-muted">{llm.reason}</p>}
            {llm && llm.available && (
              <>
                <div className="mt-3 flex items-center gap-4">
                  <ScoreRing value={llm.score} size={64} label="LLM" />
                  <p className="text-sm">{llm.rationale}</p>
                </div>
                <p className="label mt-4">Claimed shared interests</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {llm.sharedInterests.map((s) => (
                    <li key={s} className="rounded-full border border-dashed border-bad/50 px-2.5 py-0.5 text-xs" title="No Qloo ID: unverified">
                      {s} <span className="text-bad">· no Qloo ID</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted">The LLM guesses from the names alone. None of these claims carries a Qloo ID or affinity evidence.</p>
              </>
            )}
          </div>
          <div className="card p-6">
            <p className="label">Bonded (Qloo taste graph)</p>
            <div className="mt-3 flex items-center gap-4">
              <ScoreRing value={score.tasteScore} size={64} />
              <p className="text-sm">
                Computed overlap of two Qloo-expanded profiles across {Object.values(score.perDomain).filter((x) => x.weight > 0).length} domains, with{" "}
                {score.bridges.length} bridges, each with a Qloo ID and both affinities.
              </p>
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {score.bridges.map((b) => (
                <li key={b.entityId} className="flex items-center justify-between gap-2">
                  <BridgeChip name={b.name} domain={b.domain} weaker={b.weaker} />
                  <code className="truncate text-[11px] text-muted">{b.entityId}</code>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="card p-6">
            <h2 className="text-xl">Bridges</h2>
            <p className="text-sm text-muted">Entities Qloo scores highly for both people, ranked by the weaker of the two affinities.</p>
            {!score.bridges.length && <p className="mt-4 text-sm text-muted">Qloo found no shared ground for this pair.</p>}
            <ul className="mt-4 divide-y divide-line">
              {score.bridges.map((b) => (
                <li key={b.entityId} className="py-3">
                  <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(open === b.entityId ? null : b.entityId)} aria-expanded={open === b.entityId}>
                    <span className="flex items-center gap-2">
                      <BridgeChip name={b.name} domain={b.domain} weaker={b.weaker} />
                      {b.sharedSeed && <span className="text-[11px] font-semibold text-teal">both named it</span>}
                      {b.weaker && <span className="text-[11px] text-muted">weaker bridge</span>}
                    </span>
                    <span className="text-xs text-muted">{open === b.entityId ? "Hide" : "Evidence"}</span>
                  </button>
                  {open === b.entityId && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-bg p-3 text-xs">
                      <dt className="text-muted">Qloo ID</dt>
                      <dd className="break-all font-mono">{b.entityId}</dd>
                      <dt className="text-muted">Affinity · {client.name.split(" ")[0]}</dt>
                      <dd className="tabular-nums">{pct(b.affinityA)}</dd>
                      <dt className="text-muted">Affinity · {caregiver.name.split(" ")[0]}</dt>
                      <dd className="tabular-nums">{pct(b.affinityB)}</dd>
                      <dt className="text-muted">Produced by (client)</dt>
                      <dd>{b.seedsA.join(", ") || "profile signal"}</dd>
                      <dt className="text-muted">Produced by (caregiver)</dt>
                      <dd>{b.seedsB.join(", ") || "profile signal"}</dd>
                    </dl>
                  )}
                </li>
              ))}
            </ul>
            {score.friction.length > 0 && (
              <div className="mt-5 rounded-xl border border-warn/40 bg-warn/5 p-4">
                <p className="label text-warn">Friction notes (not blockers)</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {score.friction.map((f) => (
                    <li key={f.domain}>{f.text}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={`/kit/${client.id}/${caregiver.id}`} className="btn-primary mt-5">
              Open Bridge Kit
            </Link>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl">Taste overlap by domain</h2>
              <p className="text-sm text-muted">How much of each person's Qloo profile the other person shares.</p>
              <TasteRadar data={radar} clientLabel={client.name.split(" ")[0]} caregiverLabel={caregiver.name.split(" ")[0]} />
            </div>
            <div className="card p-6">
              <h2 className="text-xl">Why this match</h2>
              <table className="mt-3 w-full text-sm">
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="py-2">Taste (Qloo)</td>
                    <td className="text-right tabular-nums">{why.taste}</td>
                    <td className="text-right text-muted">× {why.weights.taste}</td>
                  </tr>
                  <tr>
                    <td className="py-2">Continuity</td>
                    <td className="text-right tabular-nums">{why.continuity}</td>
                    <td className="text-right text-muted">× {why.weights.continuity}</td>
                  </tr>
                  <tr>
                    <td className="py-2">Travel ({why.travelMin} min)</td>
                    <td className="text-right tabular-nums">{why.travelScore}</td>
                    <td className="text-right text-muted">× {why.weights.travel}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="py-2">Overall</td>
                    <td className="text-right tabular-nums">{why.composite}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted">
                Taste = weighted overlap across domains (music {why.domainWeights.music}, TV {why.domainWeights.tv}, film {why.domainWeights.film}, food &
                places {why.domainWeights.food}, books {why.domainWeights.books}), renormalised over domains with data.
              </p>
              {why.eligibility && (
                <p className={`mt-3 text-xs ${why.eligibility.eligible ? "text-good" : "text-bad"}`}>
                  {why.eligibility.eligible ? "Passes every hard constraint for this client's schedule." : `Hard constraints: ${why.eligibility.reasons.join("; ")}`}
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
