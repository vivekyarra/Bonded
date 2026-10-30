"use client";
import Link from "next/link";
import type { EvalSummary } from "@/lib/eval/run";
import { ErrorState, PageHeader, Spinner } from "@/components/ui";
import { useJson } from "@/components/useJson";

interface Data {
  status: "ok" | "not_run";
  results?: EvalSummary;
  gold: { id: string; note: string; compatible: boolean; a: string[]; b: string[] }[];
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function EvaluationPage() {
  const d = useJson<Data>("/api/eval");
  if (d.loading) return <Spinner />;
  if (d.error || !d.data) return <ErrorState error={d.error ?? "No data"} onRetry={d.reload} />;
  const r = d.data.results;
  const rows = new Map(r?.rows.map((x) => [x.id, x]));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="The “only works because of Qloo” test" title="Why Qloo">
        An LLM can guess that two people “might both like music”. Qloo computes taste overlap across domains and generations. We test both on a hand-written gold
        set of 20 pairs, half obviously compatible, half obviously not.
      </PageHeader>

      {r ? (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="card border-coral p-6">
            <p className="label">Bonded · Qloo taste graph</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums text-coral">{pct(r.bonded.separation)}</p>
            <p className="mt-1 text-sm text-muted">separation · {pct(r.bonded.accuracy)} accuracy at {r.threshold}</p>
          </div>
          <div className="card p-6">
            <p className="label">LLM-only · raw favourites{r.model ? ` · ${r.model}` : ""}</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums">{r.llm ? pct(r.llm.separation) : "—"}</p>
            <p className="mt-1 text-sm text-muted">{r.llm ? `separation · ${pct(r.llm.accuracy)} accuracy at ${r.threshold}` : "Baseline not run (no ANTHROPIC_API_KEY at eval time)."}</p>
          </div>
          <p className="text-xs text-muted sm:col-span-2">
            Separation = share of (compatible, incompatible) pairs where the compatible pair scores higher (ROC AUC; 50% is chance). Run {new Date(r.ranAt).toLocaleString()} against Qloo {r.qlooMode}.
          </p>
        </section>
      ) : (
        <div className="card p-6">
          <p className="font-serif text-lg">Evaluation not run on this deployment yet</p>
          <p className="mt-1 text-sm text-muted">
            Run <code>npm run eval</code> with <code>QLOO_API_KEY</code> (and <code>ANTHROPIC_API_KEY</code> for the baseline), or the “Warm Qloo cache” GitHub workflow, then
            redeploy. The gold set is below.
          </p>
        </div>
      )}

      <section className="card overflow-x-auto p-6">
        <h2 className="text-xl">Gold set</h2>
        <table className="mt-3 w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 font-medium">Pair</th>
              <th className="font-medium">Label</th>
              <th className="font-medium">Older person</th>
              <th className="font-medium">Younger person</th>
              <th className="font-medium">Bonded</th>
              <th className="font-medium">LLM-only</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {d.data.gold.map((g) => {
              const row = rows.get(g.id);
              return (
                <tr key={g.id} className="align-top">
                  <td className="py-2 pr-2">
                    <span className="font-semibold">{g.id}</span> <span className="text-muted">{g.note}</span>
                  </td>
                  <td>
                    <span className={g.compatible ? "chip-teal" : "chip"}>{g.compatible ? "compatible" : "incompatible"}</span>
                  </td>
                  <td className="pr-2 text-xs">{g.a.join(", ")}</td>
                  <td className="pr-2 text-xs">{g.b.join(", ")}</td>
                  <td className="tabular-nums">
                    {row?.bonded ?? "—"}
                    {row?.bridges.length ? <span className="block text-[11px] text-muted">{row.bridges.join(", ")}</span> : null}
                  </td>
                  <td className="tabular-nums">{row?.llm ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card p-6">
        <h2 className="text-xl">How Bonded uses the Qloo API</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          <li>
            <strong>Resolve seeds:</strong> every favourite goes through <code>GET /search</code>; unresolved names are dropped, never guessed.
          </li>
          <li>
            <strong>Expand profiles:</strong> one <code>GET /v2/insights</code> per domain (artist, TV, film, place in Phoenix, book) with all of the person's
            seeds as <code>signal.interests.entities</code>, top 50 with affinity.
          </li>
          <li>
            <strong>Score:</strong> weighted Jaccard per domain (Σ min / Σ max affinity), domain weights music .30 / TV .25 / film .15 / food .20 / books .10,
            plus a small seed bonus.
          </li>
          <li>
            <strong>Bridges:</strong> shared entities ranked by min(affinity) so they matter to both people; max two per domain; union-signal fallback labelled
            “weaker”.
          </li>
          <li>
            <strong>Cache:</strong> every response is cached by request hash (7-day TTL) and a warm snapshot ships with the deploy.
          </li>
        </ol>
        <Link href="/board" className="mt-4 inline-block text-sm font-semibold text-teal">
          See it on the Match Board →
        </Link>
      </section>
    </div>
  );
}
