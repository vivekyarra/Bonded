import Link from "next/link";
import type { ReactNode } from "react";
import { hasClaude, isFixtureMode } from "@/lib/env";
import { qlooConfigured } from "@/lib/qloo/client";
import { Nav } from "./Nav";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Bonded home">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <circle cx="12" cy="16" r="8.5" fill="none" stroke="rgb(var(--teal))" strokeWidth="3" />
        <circle cx="20" cy="16" r="8.5" fill="none" stroke="rgb(var(--coral))" strokeWidth="3" />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight">Bonded</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const fixture = isFixtureMode();
  return (
    <>
      <div className="bg-teal px-4 py-1.5 text-center text-xs font-medium text-white dark:text-bg">
        Demo agency · Sunrise Home Care, Phoenix AZ · <strong>every person is fictional</strong> · messages are simulated, never sent
      </div>
      {fixture && (
        <div className="bg-warn px-4 py-1.5 text-center text-xs font-semibold text-white dark:text-bg">
          FIXTURE MODE — offline test graph, not Qloo data. Set QLOO_MODE=live with QLOO_API_KEY for real results.
        </div>
      )}
      {!fixture && !qlooConfigured() && (
        <div className="bg-bad px-4 py-1.5 text-center text-xs font-semibold text-white">QLOO_API_KEY is not set on the server — taste features are unavailable.</div>
      )}
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <Nav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted">
          <span>Bonded · Qloo Agentic Hackathon 2026 · MIT licensed</span>
          <span>
            Taste data: Qloo Taste AI{fixture ? " (fixture)" : ""} · Agent: {hasClaude() ? "Claude" : "deterministic mode"}
          </span>
        </div>
      </footer>
    </>
  );
}
