"use client";
import { ChevronLeft, ChevronRight, Compass, Minimize2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** The judge path, one click per step. Query flags make each page start its own showcase action. */
export const TOUR = [
  { path: "/board", go: "/board?auto=1", title: "Fill every open schedule", hint: "Bonded proposes the best qualified caregiver for each client" },
  { path: "/match/c01/cg02", go: "/match/c01/cg02", title: "See why Dolores & Maria click", hint: "84 and 23, bridged by Qloo, with evidence for each" },
  { path: "/callout", go: "/callout?run=1", title: "Rosa calls out. The agent handles it.", hint: "Approve the offer and the Bridge Kit lands on Maria's phone" },
  { path: "/kit/c01/cg02", go: "/kit/c01/cg02", title: "What the caregiver sees", hint: "Openers, a shared playlist and something to do together" },
  { path: "/health", go: "/health", title: "Catch a relationship going sour", hint: "Visit notes become early warnings with a suggested fix" },
  { path: "/fairness", go: "/fairness", title: "Taste, never protected traits", hint: "Offer rates audited across self-reported groups" },
  { path: "/evaluation", go: "/evaluation", title: "Why it only works with Qloo", hint: "Gold set: Qloo-powered matching vs an LLM guessing" },
  { path: "/try", go: "/try", title: "Now find your own match", hint: "Pick three favourites" },
] as const;

const KEY = "bonded.tour.min";

export function stepFor(path: string): number {
  const i = TOUR.findIndex((s) => path === s.path || path.startsWith(`${s.path}/`));
  if (i >= 0) return i;
  if (path.startsWith("/match")) return 1;
  if (path.startsWith("/kit")) return 3;
  return -1;
}

export function Tour() {
  const path = usePathname() ?? "";
  const router = useRouter();
  const [min, setMin] = useState(false);
  const [hidden, setHidden] = useState(false);
  const idx = stepFor(path);
  const step = idx >= 0 ? TOUR[idx] : null;

  useEffect(() => {
    try {
      setMin(localStorage.getItem(KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const persist = (v: boolean) => {
    setMin(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const go = useCallback(
    (to: number) => {
      const s = TOUR[Math.max(0, Math.min(TOUR.length - 1, to))];
      router.push(s.go);
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (e.key === "ArrowRight" && idx < TOUR.length - 1) go(idx + 1);
      if (e.key === "ArrowLeft" && idx > 0) go(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, go]);

  if (hidden || !step) return null;

  if (min)
    return (
      <button
        onClick={() => persist(false)}
        className="glass-strong fixed bottom-[96px] right-4 z-40 flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lift transition hover:scale-105 lg:bottom-6 lg:right-6"
        aria-label="Open guided tour"
      >
        <Compass size={15} className="text-teal" /> Tour {idx + 1}/{TOUR.length}
      </button>
    );

  const last = idx === TOUR.length - 1;
  return (
    // Phones: floats above the tab bar. Laptops: the same floating card, but in its own row
    // under the page, so it can never cover a form or button.
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-40 flex justify-center px-3 lg:pointer-events-auto lg:static lg:z-auto lg:shrink-0 lg:px-8 lg:pb-3 lg:pt-1">
      <div role="region" aria-label="Guided tour" className="glass-strong pointer-events-auto flex w-full max-w-[640px] animate-sheet items-center gap-3 rounded-[20px] p-1.5 pl-2.5 shadow-lift">
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal font-display text-sm font-bold text-white dark:text-bg sm:flex">
          {idx + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {TOUR.map((s, i) => (
              <button
                key={s.path}
                onClick={() => go(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-teal" : i < idx ? "w-1.5 bg-teal/50" : "w-1.5 bg-ink/15"}`}
              />
            ))}
            <span className="ml-1 text-[12.5px] font-semibold uppercase tracking-wider text-muted">
              {idx + 1}/{TOUR.length}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[14.5px] font-semibold leading-tight">{step.title}</p>
          <p className="hidden truncate text-xs text-muted sm:block">{step.hint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button className="btn-icon btn-ghost h-9 w-9" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Previous step (←)">
            <ChevronLeft size={17} />
          </button>
          {last ? (
            <Link href="/" className="btn-primary h-9 px-4">
              Finish
            </Link>
          ) : (
            <button className="btn-primary h-9 px-4" onClick={() => go(idx + 1)} aria-label="Next step (→)">
              Next <ChevronRight size={16} />
            </button>
          )}
          <button className="hidden h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-ink/[0.06] hover:text-ink sm:flex" onClick={() => persist(true)} aria-label="Minimise tour">
            <Minimize2 size={14} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-ink/[0.06] hover:text-ink sm:hidden" onClick={() => setHidden(true)} aria-label="Close tour">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
