"use client";
import { AlertTriangle, ArrowLeft, Bot, Check, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TasteRadar } from "@/components/TasteRadar";
import { Avatar, CachedBadge, DomainIcon, domainLabel, ErrorState, Info, ScoreRing, Segmented, Skeleton, Spinner } from "@/components/ui";
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
  score: { tasteScore: number; bridges: Bridge[]; friction: { domain: string; text: string }[]; perDomain: Record<string, { overlap: number; weight: number; shared: number }> };
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
type Llm = { available: true; score: number; sharedInterests: string[]; rationale: string; model?: string } | { available: false; reason: string };
type Tab = "overview" | "bridges" | "overlap" | "why" | "llm";

function Bar({ value, tone }: { value: number | null; tone: "teal" | "coral" }) {
  const v = value === null ? 0 : Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]">
        <div className={`h-full rounded-full ${tone === "teal" ? "bg-teal" : "bg-coral"}`} style={{ width: `${v}%`, transition: "width .8s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
      <span className="w-8 text-right text-[12.5px] tabular-nums text-muted">{value === null ? "—" : `${v}%`}</span>
    </div>
  );
}

function Seeds({ seeds, unresolved, end }: { seeds: Seed[]; unresolved: string[]; end?: boolean }) {
  return (
    <ul className={`flex flex-wrap gap-1.5 ${end ? "sm:justify-end" : ""}`}>
      {seeds.map((s) => (
        <li key={s.qlooId} className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs" title={`Qloo ID ${s.qlooId}`}>
          {s.name}
        </li>
      ))}
      {unresolved.map((u) => (
        <li key={u} className="rounded-full px-2.5 py-1 text-xs text-muted line-through" title="Not found in Qloo, so not used">
          {u}
        </li>
      ))}
    </ul>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="glass p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
        <Skeleton className="mx-auto mt-6 h-4 w-1/2" />
      </div>
      <div className="glass space-y-4 p-6">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}

export default function MatchDetail({ params }: { params: { clientId: string; caregiverId: string } }) {
  const d = useJson<Detail>("/api/compat/pair", post(params));
  const [tab, setTab] = useState<Tab>("bridges");
  const [desktop, setDesktop] = useState(false);
  // Laptops show bridges, overlap and "why" side by side; phones use tabs.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      setDesktop(mq.matches);
      setTab((t) => (mq.matches && ["bridges", "overlap", "why"].includes(t) ? "overview" : !mq.matches && t === "overview" ? "bridges" : t));
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const [llm, setLlm] = useState<Llm | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  async function openTab(t: Tab) {
    setTab(t);
    if (t !== "llm" || llm || llmLoading) return;
    setLlmLoading(true);
    try {
      setLlm(await fetchJson<Llm>("/api/compare/llm", post(params)));
    } catch (e) {
      setLlm({ available: false, reason: e instanceof Error ? e.message : String(e) });
    } finally {
      setLlmLoading(false);
    }
  }

  return (
    <div className="fit-page flex flex-col gap-3">
      <Link href="/board" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink lg:hidden">
        <ArrowLeft size={16} /> Matches
      </Link>
      {d.loading && <DetailSkeleton />}
      {d.error && <ErrorState error={d.error} onRetry={d.reload} />}
      {d.data && <Body data={d.data} tab={tab} openTab={openTab} llm={llm} llmLoading={llmLoading} desktop={desktop} />}
    </div>
  );
}

function Body({ data, tab, openTab, llm, llmLoading, desktop }: { data: Detail; tab: Tab; openTab: (t: Tab) => void; llm: Llm | null; llmLoading: boolean; desktop: boolean }) {
  const { client, caregiver, score, radar, why } = data;
  const cFirst = client.name.split(" ")[0];
  const gFirst = caregiver.name.split(" ")[0];
  return (
    <>
      {/* One compact row: each person with their favourites, the taste score between them. */}
      <section className="glass animate-rise grid shrink-0 items-center gap-4 px-4 py-3.5 sm:grid-cols-[1fr_auto_1fr] sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={client.name} size={44} ring="teal" />
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-tight">{client.name}</h1>
            <p className="text-xs text-muted">
              {client.age} · {client.area} · client
            </p>
            <div className="mt-2">
              <Seeds seeds={client.seeds} unresolved={client.unresolved} />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center px-2">
          <ScoreRing value={score.tasteScore} size={64} stroke={6} />
          <span className="mt-1 text-[11.5px] font-medium text-muted">taste match</span>
        </div>
        <div className="flex min-w-0 items-start gap-3 sm:flex-row-reverse sm:text-right">
          <Avatar name={caregiver.name} size={44} ring="coral" />
          <div className="min-w-0">
            <h2 className="truncate text-lg leading-tight">{caregiver.name}</h2>
            <p className="text-xs text-muted">
              {caregiver.age} · {caregiver.area} · caregiver
            </p>
            <div className="mt-2">
              <Seeds seeds={caregiver.seeds} unresolved={caregiver.unresolved} end />
            </div>
          </div>
        </div>
      </section>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
          <Segmented<Tab>
            label="Match detail"
            value={tab}
            onChange={openTab}
            options={
              desktop
                ? [
                    { value: "overview", label: "Overview" },
                    { value: "llm", label: "Compare with an AI guess" },
                  ]
                : [
                    { value: "bridges", label: "Shared" },
                    { value: "overlap", label: "By topic" },
                    { value: "why", label: "Why" },
                    { value: "llm", label: "AI guess" },
                  ]
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <CachedBadge cached={data.cached} />
          <Link href={`/kit/${client.id}/${caregiver.id}`} className="btn-primary">
            <Smartphone size={16} /> Bridge Kit
          </Link>
        </div>
      </div>

      <div className={tab === "overview" ? "fit-fill grid gap-4 lg:grid-cols-[1.25fr_1fr]" : "space-y-5"}>
      {(tab === "bridges" || tab === "overview") && (
        <section className="glass fit-scroll animate-rise p-2 sm:p-3" aria-label="Shared interests">
          <div className="flex items-center gap-2 px-3 pb-1 pt-2">
            <h3 className="text-lg">Shared interests</h3>
            <Info>Things Qloo finds both people love. Each bar shows how strongly each person leans toward it.</Info>
          </div>
          {!score.bridges.length && <p className="p-6 text-center text-sm text-muted">Qloo found no shared ground for this pair.</p>}
          <ul className="divide-y divide-ink/[0.06]">
            {score.bridges.map((b, i) => (
              <li key={b.entityId} className="grid animate-rise grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-3 py-3 sm:grid-cols-[auto_1fr_200px]" style={{ animationDelay: `${i * 60}ms` }}>
                <DomainIcon domain={b.domain} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-semibold">{b.name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    {domainLabel(b.domain)}
                    {b.sharedSeed && <span className="font-semibold text-teal">· both named it</span>}
                    {b.weaker && <span>· weaker bridge</span>}
                    <span className="font-mono text-[12.5px]" title="Qloo entity ID">
                      {b.entityId.slice(0, 8)}…
                    </span>
                  </p>
                </div>
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <div className="flex items-center gap-2 text-[12.5px] text-muted">
                    <span className="w-14 truncate">{cFirst}</span>
                    <div className="flex-1">
                      <Bar value={b.affinityA} tone="teal" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12.5px] text-muted">
                    <span className="w-14 truncate">{gFirst}</span>
                    <div className="flex-1">
                      <Bar value={b.affinityB} tone="coral" />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {score.friction.length > 0 && (
            <div className="m-2 mt-1 flex gap-3 rounded-2xl bg-warn/10 p-4 text-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" />
              <ul className="space-y-1">
                {score.friction.map((f) => (
                  <li key={f.domain}>{f.text}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

        <div className={`space-y-4 ${tab === "overview" ? "fit-scroll" : ""}`}>
      {(tab === "overlap" || tab === "overview") && (
        <section className="glass animate-rise p-5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg">Shared taste by topic</h3>
            <Info>How much of each person's Qloo-expanded profile the other person also has, weighted by affinity.</Info>
          </div>
          <TasteRadar data={radar} clientLabel={cFirst} caregiverLabel={gFirst} />
        </section>
      )}

      {(tab === "why" || tab === "overview") && (
        <section className={`grid animate-rise gap-4 ${tab === "overview" ? "" : "md:grid-cols-[1fr_1fr]"}`}>
          <div className="glass p-5">
            <h3 className="text-lg">Why this match</h3>
            <div className="mt-4 space-y-3">
              {[
                { k: "Qloo taste", v: why.taste, w: why.weights.taste },
                { k: "Continuity", v: why.continuity, w: why.weights.continuity },
                { k: `Travel · ${why.travelMin} min`, v: why.travelScore, w: why.weights.travel },
              ].map((r) => (
                <div key={r.k}>
                  <div className="flex justify-between text-sm">
                    <span>{r.k}</span>
                    <span className="tabular-nums text-muted">
                      {r.v} × {r.w}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/[0.07]">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal to-violet" style={{ width: `${r.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-baseline justify-between border-t border-ink/[0.07] pt-4">
              <span className="font-semibold">Overall</span>
              <span className="font-display text-3xl font-bold tabular-nums">{why.composite}</span>
            </div>
          </div>
          <div className="glass p-5">
            <h3 className="text-lg">Hard constraints</h3>
            {why.eligibility?.eligible ? (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-good">
                <ShieldCheck size={18} /> Passes every constraint for {cFirst}'s schedule
              </p>
            ) : (
              <ul className="mt-4 space-y-1.5 text-sm text-bad">
                {(why.eligibility?.reasons ?? ["No schedule found"]).map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            )}
            <p className="label mt-6">Domain weights</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(why.domainWeights).map(([k, v]) => (
                <span key={k} className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs">
                  {domainLabel(k)} {Math.round(v * 100)}%
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

        </div>
      </div>

      {tab === "llm" && (
        <section className="grid animate-rise gap-4 md:grid-cols-2">
          <div className="glass p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink/[0.07]">
                <Bot size={17} />
              </span>
              <h3 className="text-lg">AI guess</h3>
              <span className="text-xs text-muted">a chatbot reading names only</span>
            </div>
            {llmLoading && (
              <div className="mt-5">
                <Spinner label="Asking the AI…" />
              </div>
            )}
            {llm && !llm.available && <p className="mt-5 text-sm text-muted">{llm.reason}</p>}
            {llm && llm.available && (
              <>
                <div className="mt-5 flex items-center gap-4">
                  <ScoreRing value={llm.score} size={64} label="LLM" />
                  <p className="text-sm">{llm.rationale}</p>
                </div>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {llm.sharedInterests.map((s) => (
                    <li key={s} className="rounded-full border border-dashed border-bad/50 px-2.5 py-1 text-xs">
                      {s} <span className="text-bad">· unverified</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="glass p-5 ring-2 ring-teal/30">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-violet text-white">
                <Sparkles size={16} />
              </span>
              <h3 className="text-lg">Bonded</h3>
              <span className="text-xs text-muted">measured by Qloo</span>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <ScoreRing value={score.tasteScore} size={64} />
              <p className="text-sm">
                {score.bridges.length} bridges, each with a Qloo ID and both people's affinity.
              </p>
            </div>
            <ul className="mt-4 space-y-1.5">
              {score.bridges.map((b) => (
                <li key={b.entityId} className="flex items-center gap-2 text-sm">
                  <Check size={15} className="text-good" /> {b.name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
