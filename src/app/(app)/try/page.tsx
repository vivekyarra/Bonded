"use client";
import { useEffect, useState } from "react";
import { Avatar, BridgeChip, ErrorState, PageHeader, ScoreRing, Spinner } from "@/components/ui";
import { fetchJson, post } from "@/components/useJson";

type Kind = "artist" | "movie" | "tv_show" | "book" | "place";
const KINDS: { value: Kind; label: string }[] = [
  { value: "artist", label: "Music artist" },
  { value: "tv_show", label: "TV show" },
  { value: "movie", label: "Film" },
  { value: "book", label: "Book" },
  { value: "place", label: "Restaurant / place" },
];

interface Hit {
  id: string;
  name: string;
  year?: string;
}
interface Fav {
  kind: Kind;
  query: string;
  picked: Hit | null;
}
interface Result {
  resolved: { name: string; qlooId: string }[];
  unresolved: string[];
  top: {
    client: { id: string; name: string; firstName: string; age: number; area: string; favourites: string[] };
    tasteScore: number;
    bridges: { name: string; domain: string; qlooId: string; affinityClient: number | null; affinityYou: number | null; weaker: boolean }[];
  }[];
  kit: { openers: { bridgeId: string; bridgeName: string; domain: string; text: string }[]; playlist: { qlooId: string; name: string; spotify: string }[] } | null;
}

function FavInput({ value, onChange, index }: { value: Fav; onChange: (f: Fav) => void; index: number }) {
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (value.picked || value.query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetchJson<{ results: Hit[] }>(`/api/qloo/search?q=${encodeURIComponent(value.query)}&type=${value.kind}`);
        setHits(res.results);
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value.query, value.kind, value.picked]);

  return (
    <div className="relative grid gap-2 sm:grid-cols-[170px_1fr]">
      <label className="sr-only" htmlFor={`kind-${index}`}>
        Type of favourite {index + 1}
      </label>
      <select id={`kind-${index}`} className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" value={value.kind} onChange={(e) => onChange({ kind: e.target.value as Kind, query: "", picked: null })}>
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <div className="relative">
        <label className="sr-only" htmlFor={`fav-${index}`}>
          Favourite {index + 1}
        </label>
        <input
          id={`fav-${index}`}
          className={`w-full rounded-xl border bg-surface px-3 py-2.5 text-sm ${value.picked ? "border-teal" : "border-line"}`}
          placeholder={index === 0 ? "e.g. Aretha Franklin" : index === 1 ? "e.g. The Great British Bake Off" : "Start typing…"}
          value={value.picked ? value.picked.name : value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value, picked: null })}
          onFocus={() => hits.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`fav-list-${index}`}
        />
        {searching && <span className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-line border-t-teal" />}
        {value.picked && <span className="absolute right-3 top-2.5 text-xs font-semibold text-teal">✓ Qloo</span>}
        {open && hits.length > 0 && !value.picked && (
          <ul id={`fav-list-${index}`} role="listbox" className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {hits.map((h) => (
              <li key={h.id} role="option" aria-selected={false}>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-tealsoft" onMouseDown={() => onChange({ ...value, picked: h })}>
                  {h.name}
                  {h.year && <span className="ml-1 text-xs text-muted">({h.year})</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function TryPage() {
  const [favs, setFavs] = useState<Fav[]>([
    { kind: "artist", query: "", picked: null },
    { kind: "tv_show", query: "", picked: null },
    { kind: "movie", query: "", picked: null },
  ]);
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = favs.filter((f) => f.picked).length >= 3;

  async function go() {
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      setRes(await fetchJson<Result>("/api/tryit", post({ favourites: favs.filter((f) => f.picked).map((f) => ({ name: f.picked!.name, kind: f.kind })) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Two-minute intake" title="Try it yourself">
        Name three favourites and pick each from Qloo's suggestions. Bonded will find which of Sunrise's 60 clients you'd click with, and hand you a Bridge Kit.
        Nothing you type is stored.
      </PageHeader>

      <div className="card max-w-3xl space-y-3 p-6">
        {favs.map((f, i) => (
          <FavInput key={i} index={i} value={f} onChange={(nf) => setFavs((all) => all.map((x, j) => (j === i ? nf : x)))} />
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {favs.length < 6 && (
            <button className="btn-ghost" onClick={() => setFavs((all) => [...all, { kind: "artist", query: "", picked: null }])}>
              + Add another
            </button>
          )}
          <button className="btn-primary" onClick={go} disabled={!ready || loading}>
            {loading ? "Matching…" : "Find my best match"}
          </button>
          {!ready && <span className="text-xs text-muted">Pick at least 3 from the suggestions.</span>}
        </div>
      </div>

      <div className="mt-8">
        {loading && <Spinner label="Expanding your taste with Qloo and comparing with 60 clients…" />}
        {error && <ErrorState error={error} onRetry={go} />}
        {res && (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section className="space-y-4">
              <h2 className="text-2xl">Your best matches</h2>
              {res.top.map((t, i) => (
                <article key={t.client.id} className={`card animate-rise p-5 ${i === 0 ? "border-coral" : ""}`} style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="flex items-center gap-4">
                    <Avatar name={t.client.name} size={48} ring={i === 0 ? "coral" : undefined} />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-xl">
                        {t.client.firstName}, {t.client.age}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {t.client.area} · loves {t.client.favourites.slice(0, 3).join(", ")}
                      </p>
                    </div>
                    <ScoreRing value={t.tasteScore} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.bridges.map((b) => (
                      <span key={b.qlooId} title={`Qloo ID ${b.qlooId}`}>
                        <BridgeChip name={b.name} domain={b.domain} weaker={b.weaker} />
                      </span>
                    ))}
                    {!t.bridges.length && <span className="text-xs text-muted">No shared bridges.</span>}
                  </div>
                </article>
              ))}
              {res.unresolved.length > 0 && <p className="text-xs text-muted">Qloo couldn't resolve: {res.unresolved.join(", ")}</p>}
            </section>
            {res.kit && res.top[0] && (
              <section className="card p-5">
                <p className="label">Mini Bridge Kit</p>
                <h2 className="text-xl">Your first visit with {res.top[0].client.firstName}</h2>
                <ol className="mt-3 space-y-2">
                  {res.kit.openers.map((o) => (
                    <li key={o.bridgeId} className="rounded-xl bg-bg p-3 text-sm">
                      {o.text}
                    </li>
                  ))}
                </ol>
                {res.kit.playlist.length > 0 && (
                  <p className="mt-3 text-sm">
                    Play together:{" "}
                    {res.kit.playlist.map((p, i) => (
                      <a key={p.qlooId} href={p.spotify} target="_blank" rel="noreferrer" className="text-teal underline">
                        {p.name}
                        {i < res.kit!.playlist.length - 1 ? ", " : ""}
                      </a>
                    ))}
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
