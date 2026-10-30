"use client";
import { ArrowRight, Command, CornerDownLeft, FlaskConical, HeartPulse, LayoutGrid, Scale, Search, Siren, Smartphone, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface Item {
  id: string;
  label: string;
  hint: string;
  group: "Go to" | "Actions" | "Stories";
  href: string;
  icon: typeof Search;
  keywords?: string;
}

const ITEMS: Item[] = [
  { id: "board", label: "Matches", hint: "Open schedules", group: "Go to", href: "/board", icon: LayoutGrid, keywords: "board schedules assign" },
  { id: "callout", label: "Call-outs", hint: "Agent console", group: "Go to", href: "/callout", icon: Siren, keywords: "substitute agent" },
  { id: "health", label: "Health", hint: "Early warnings", group: "Go to", href: "/health", icon: HeartPulse, keywords: "flags review" },
  { id: "fair", label: "Fairness", hint: "Offer-rate audit", group: "Go to", href: "/fairness", icon: Scale, keywords: "audit bias results" },
  { id: "eval", label: "Why it works", hint: "Qloo vs an AI guess", group: "Go to", href: "/evaluation", icon: FlaskConical, keywords: "evaluation llm" },
  { id: "try", label: "Try it yourself", hint: "Find your match", group: "Go to", href: "/try", icon: Sparkles, keywords: "favourites me" },
  { id: "auto", label: "Find matches", hint: "Fill all open schedules", group: "Actions", href: "/board?auto=1", icon: LayoutGrid, keywords: "match propose" },
  { id: "run", label: "Handle Rosa's call-out", hint: "Start the agent", group: "Actions", href: "/callout?run=1", icon: Siren, keywords: "agent substitute" },
  { id: "kit", label: "Open Maria's Bridge Kit", hint: "Caregiver phone view", group: "Actions", href: "/kit/c01/cg02", icon: Smartphone, keywords: "bridge kit phone" },
  { id: "s1", label: "Dolores & Maria", hint: "84 & 23 · the hero match", group: "Stories", href: "/match/c01/cg02", icon: Users, keywords: "alvarez maria hero" },
  { id: "s2", label: "Walter & Travis", hint: "The obvious match", group: "Stories", href: "/match/c02/cg03", icon: Users, keywords: "country" },
  { id: "s3", label: "Harold & Dale", hint: "The demographic trap", group: "Stories", href: "/match/c04/cg05", icon: Users, keywords: "trap" },
  { id: "s4", label: "Eleanor & Kayla", hint: "Trending down", group: "Stories", href: "/match/c05/cg06", icon: Users, keywords: "health" },
  { id: "s5", label: "Dorothy & Jasmine", hint: "91-year-old jazz fan", group: "Stories", href: "/match/c03/cg04", icon: Users, keywords: "jazz" },
];

const GROUPS = ["Actions", "Stories", "Go to"] as const;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !(e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("bonded:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bonded:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
    }
  }, [open]);

  // Sorted in display order, so the highlighted row is always the one Enter opens.
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const hits = t ? ITEMS.filter((i) => `${i.label} ${i.hint} ${i.keywords ?? ""}`.toLowerCase().includes(t)) : ITEMS;
    return GROUPS.flatMap((g) => hits.filter((i) => i.group === g));
  }, [q]);

  if (!open) return null;

  const choose = (i: Item | undefined) => {
    if (!i) return;
    setOpen(false);
    router.push(i.href);
  };

  let n = -1;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/25 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Command menu">
      <div className="glass-strong w-full max-w-xl animate-sheet overflow-hidden rounded-[24px] shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-ink/[0.07] px-4">
          <Search size={18} className="text-muted" />
          <input
            ref={input}
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(results.length - 1, c + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(results[cursor]);
              } else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Jump to a screen, action or match…"
            className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
            aria-label="Search screens, actions and matches"
            type="search"
          />
          <kbd className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[12.5px] text-muted">esc</kbd>
        </div>
        <div id="palette-list" className="max-h-[52vh] overflow-y-auto p-2">
          {!results.length && <p className="px-3 py-6 text-center text-sm text-muted">No results</p>}
          {GROUPS.map((g) => {
            const items = results.filter((r) => r.group === g);
            if (!items.length) return null;
            return (
              <section key={g} aria-label={g}>
                <p className="label px-3 pb-1 pt-2">{g}</p>
                <ul>
                  {items.map((i) => {
                    n = results.indexOf(i);
                    const on = n === cursor;
                    const Icon = i.icon;
                    const myIndex = n;
                    return (
                      <li key={i.id}>
                        <button aria-current={on ? "true" : undefined} onMouseEnter={() => setCursor(myIndex)} onClick={() => choose(i)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${on ? "bg-teal text-white dark:text-bg" : ""}`}>
                          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${on ? "bg-white/20" : "bg-ink/[0.06] text-muted"}`}>
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{i.label}</span>
                            <span className={`block truncate text-xs ${on ? "text-white dark:text-bg" : "text-muted"}`}>{i.hint}</span>
                          </span>
                          {on ? <CornerDownLeft size={15} /> : <ArrowRight size={15} className="text-muted" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-ink/[0.07] px-4 py-2 text-[12.5px] text-muted">
          <span className="flex items-center gap-1">
            <Command size={12} />K to toggle · ↑↓ to move · ↵ to open
          </span>
          <span>← → steps through the tour</span>
        </div>
      </div>
    </div>
  );
}
