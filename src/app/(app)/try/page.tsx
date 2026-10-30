"use client";
import { BookOpen, Check, Clapperboard, MapPin, MessageCircleHeart, Music2, Plus, RotateCcw, Sparkles, Tv, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, BridgeChip, ErrorState, ScoreRing, Skeleton } from "@/components/ui";
import { fetchJson, post } from "@/components/useJson";

type Kind = "artist" | "movie" | "tv_show" | "book" | "place";
const KINDS: { value: Kind; label: string; icon: typeof Music2; placeholder: string }[] = [
  { value: "artist", label: "Music", icon: Music2, placeholder: "An artist you love" },
  { value: "tv_show", label: "TV", icon: Tv, placeholder: "A show you rewatch" },
  { value: "movie", label: "Film", icon: Clapperboard, placeholder: "A favourite film" },
  { value: "book", label: "Book", icon: BookOpen, placeholder: "A book you'd recommend" },
  { value: "place", label: "Place", icon: MapPin, placeholder: "A Phoenix spot" },
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
    bridges: { name: string; domain: string; qlooId: string; weaker: boolean }[];
  }[];
  kit: { openers: { bridgeId: string; bridgeName: string; domain: string; text: string }[]; playlist: { qlooId: string; name: string; spotify: string }[] } | null;
}

function FavInput({ value, onChange, onRemove, index }: { value: Fav; onChange: (f: Fav) => void; onRemove?: () => void; index: number }) {
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (value.picked || value.query.trim().length < 2) {
      setHits([]);
      setFailed(false);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetchJson<{ results: Hit[] }>(`/api/qloo/search?q=${encodeURIComponent(value.query.trim())}&type=${value.kind}`);
        if (mine !== seq.current) return; // a newer keystroke won
        setHits(res.results);
        setFailed(false);
        setCursor(0);
        setOpen(true);
      } catch {
        if (mine === seq.current) setFailed(true);
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [value.query, value.kind, value.picked]);

  const pick = (h: Hit) => {
    onChange({ ...value, picked: h });
    setOpen(false);
  };
  const meta = KINDS.find((k) => k.value === value.kind)!;

  return (
    <div className="glass-inset relative p-2 sm:p-2.5">
      <div className="no-scrollbar flex gap-1 overflow-x-auto pb-2" role="radiogroup" aria-label={`Type of favourite ${index + 1}`}>
        {KINDS.map(({ value: k, label, icon: Icon }) => (
          <button
            key={k}
            role="radio"
            aria-checked={value.kind === k}
            onClick={() => onChange({ kind: k, query: "", picked: null })}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${value.kind === k ? "bg-teal text-white shadow-sm dark:text-bg" : "text-muted hover:bg-ink/[0.05] hover:text-ink"}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
        {onRemove && (
          <button onClick={onRemove} className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/[0.06] hover:text-ink" aria-label="Remove">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="relative">
        <label className="sr-only" htmlFor={`fav-${index}`}>
          Favourite {index + 1}
        </label>
        <input
          id={`fav-${index}`}
          className={`w-full rounded-2xl border bg-surface/80 px-4 py-3 text-[16px] outline-none transition placeholder:text-muted/70 focus:border-teal focus:ring-4 focus:ring-teal/15 ${value.picked ? "border-teal/60 font-medium" : "border-ink/10"}`}
          placeholder={meta.placeholder}
          value={value.picked ? value.picked.name : value.query}
          maxLength={80}
          onChange={(e) => onChange({ ...value, query: e.target.value, picked: null })}
          onFocus={() => hits.length && !value.picked && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !hits.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => (c + 1) % hits.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => (c - 1 + hits.length) % hits.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(hits[cursor]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`fav-list-${index}`}
          aria-autocomplete="list"
          aria-activedescendant={open && hits[cursor] ? `fav-${index}-opt-${cursor}` : undefined}
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {searching && <span className="block h-4 w-4 animate-spin rounded-full border-2 border-ink/10 border-t-teal" />}
          {value.picked && (
            <span className="flex h-6 w-6 animate-pop items-center justify-center rounded-full bg-teal text-white dark:text-bg">
              <Check size={14} strokeWidth={3} />
            </span>
          )}
        </span>
        {open && !value.picked && (
          <ul id={`fav-list-${index}`} role="listbox" className="glass-strong absolute z-20 mt-2 w-full animate-rise overflow-hidden rounded-2xl p-1 shadow-lift">
            {hits.map((h, i) => (
              <li key={h.id} id={`fav-${index}-opt-${i}`} role="option" aria-selected={i === cursor}>
                <button className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${i === cursor ? "bg-teal/10" : ""}`} onMouseDown={() => pick(h)} onMouseEnter={() => setCursor(i)}>
                  <span className="truncate">{h.name}</span>
                  {h.year && <span className="ml-2 shrink-0 text-xs text-muted">{h.year}</span>}
                </button>
              </li>
            ))}
            {!hits.length && <li className="px-3 py-2.5 text-sm text-muted">No match in Qloo. Try another spelling.</li>}
          </ul>
        )}
      </div>
      {failed && <p className="mt-1.5 px-1 text-xs text-bad">Search is unavailable right now.</p>}
    </div>
  );
}

const fresh = (): Fav[] => [
  { kind: "artist", query: "", picked: null },
  { kind: "tv_show", query: "", picked: null },
  { kind: "movie", query: "", picked: null },
];

export default function TryPage() {
  const [favs, setFavs] = useState<Fav[]>(fresh);
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = favs.filter((f) => f.picked).length;
  const ready = picked >= 3;

  async function go() {
    if (!ready || loading) return;
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

  const best = res?.top[0];

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-teal via-violet to-coral text-white shadow-lift">
          <Sparkles size={26} />
        </span>
        <h1 className="mt-4 text-[32px] sm:text-[40px]">Who would you click with?</h1>
        <p className="mt-1 text-muted">Pick three favourites. We'll find your match among 60 clients.</p>
      </header>

      {!res && (
        <div className="glass mx-auto max-w-2xl animate-rise space-y-2.5 p-3 sm:p-4">
          {favs.map((f, i) => (
            <FavInput
              key={i}
              index={i}
              value={f}
              onChange={(nf) => setFavs((all) => all.map((x, j) => (j === i ? nf : x)))}
              onRemove={favs.length > 3 ? () => setFavs((all) => all.filter((_, j) => j !== i)) : undefined}
            />
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            {favs.length < 6 && (
              <button className="btn-ghost" onClick={() => setFavs((all) => [...all, { kind: "book", query: "", picked: null }])}>
                <Plus size={15} /> Add
              </button>
            )}
            <span className="text-xs text-muted">{picked}/3 picked · nothing is stored</span>
            <button className="btn-primary ml-auto px-6 py-3" onClick={go} disabled={!ready || loading}>
              <Sparkles size={16} /> {loading ? "Matching…" : "Find my match"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mx-auto mt-6 max-w-2xl space-y-3" role="status" aria-label="Matching">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-20 rounded-3xl" />
        </div>
      )}
      {error && (
        <div className="mx-auto mt-6 max-w-2xl">
          <ErrorState error={error} onRetry={go} />
        </div>
      )}

      {res && best && (
        <div className="space-y-5">
          <section className="glass relative animate-rise overflow-hidden p-6 text-center sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal/10 via-transparent to-coral/15" />
            <p className="label relative">Your best match</p>
            <div className="relative mt-5 flex items-center justify-center gap-4">
              <div className="text-center">
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-violet to-coral text-xl font-bold text-white shadow-lift">You</span>
              </div>
              <div className="relative w-24 sm:w-40">
                <div className="bridge-line h-[3px] rounded-full" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="glass-strong block animate-pop rounded-full p-1 shadow-lift">
                    <ScoreRing value={best.tasteScore} size={64} stroke={6} />
                  </span>
                </span>
              </div>
              <div className="text-center">
                <Avatar name={best.client.name} size={72} ring="teal" />
              </div>
            </div>
            <h2 className="relative mt-5 text-2xl">
              {best.client.firstName}, {best.client.age}
            </h2>
            <p className="relative text-sm text-muted">
              {best.client.area} · loves {best.client.favourites.slice(0, 3).join(", ")}
            </p>
            <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
              {best.bridges.map((b, i) => (
                <span key={b.qlooId} className="animate-pop" style={{ animationDelay: `${300 + i * 90}ms` }}>
                  <BridgeChip name={b.name} domain={b.domain} weaker={b.weaker} />
                </span>
              ))}
              {!best.bridges.length && <span className="text-sm text-muted">Different worlds. That's a conversation too.</span>}
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
            <section className="glass p-2">
              <p className="label px-3 pb-1 pt-3">Runners-up</p>
              <ul>
                {res.top.slice(1).map((t) => (
                  <li key={t.client.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                    <Avatar name={t.client.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {t.client.firstName}, {t.client.age}
                      </p>
                      <p className="truncate text-xs text-muted">{t.bridges.slice(0, 2).map((b) => b.name).join(" · ") || t.client.area}</p>
                    </div>
                    <ScoreRing value={t.tasteScore} size={40} stroke={4} />
                  </li>
                ))}
              </ul>
            </section>
            {res.kit && (
              <section className="glass p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <MessageCircleHeart size={18} className="text-coralink" /> Your first visit with {best.client.firstName}
                </p>
                <ol className="mt-3 space-y-2">
                  {res.kit.openers.map((o) => (
                    <li key={o.bridgeId} className="rounded-[18px] rounded-tl-md bg-ink/[0.05] px-3.5 py-2.5 text-[15px]">
                      {o.text}
                    </li>
                  ))}
                </ol>
                {res.kit.playlist.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {res.kit.playlist.map((p) => (
                      <a key={p.qlooId} href={p.spotify} target="_blank" rel="noreferrer" className="chip transition hover:brightness-95">
                        <Music2 size={12} /> {p.name}
                      </a>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
          {res.unresolved.length > 0 && <p className="text-center text-xs text-muted">Not found in Qloo: {res.unresolved.join(", ")}</p>}
          <div className="text-center">
            <button
              className="btn-ghost"
              onClick={() => {
                setRes(null);
                setFavs(fresh());
              }}
            >
              <RotateCcw size={15} /> Try other favourites
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
