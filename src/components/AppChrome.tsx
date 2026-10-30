"use client";
import { Compass, FlaskConical, HeartPulse, LayoutGrid, Scale, Search, Siren, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CommandPalette } from "./CommandPalette";
import { ToastProvider } from "./Toast";
import { Tour } from "./Tour";

export interface ChromeFlags {
  fixture: boolean;
  qlooReady: boolean;
  llm: string | null;
}

const NAV = [
  { href: "/board", label: "Matches", icon: LayoutGrid, tab: true },
  { href: "/callout", label: "Call-outs", icon: Siren, tab: true },
  { href: "/health", label: "Health", icon: HeartPulse, tab: true },
  { href: "/fairness", label: "Fairness", icon: Scale, tab: true },
  { href: "/evaluation", label: "Why it works", icon: FlaskConical, tab: false },
  { href: "/try", label: "Try it yourself", icon: Sparkles, tab: true },
];

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Bonded home">
      <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#1b2a5e] to-[#33447f] shadow-sm ring-1 ring-inset ring-white/10">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
          <circle cx="12.5" cy="16" r="7.5" fill="none" stroke="#fff" strokeWidth="2.6" />
          <circle cx="19.5" cy="16" r="7.5" fill="none" stroke="#d6ba84" strokeWidth="2.6" />
        </svg>
      </span>
      {!compact && <span className="font-serif text-[24px] leading-none tracking-tight">Bonded</span>}
    </Link>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-good shadow-[0_0_8px_rgb(var(--good))]" : "bg-warn"}`} />
      {label}
    </span>
  );
}

export function AppChrome({ children, flags }: { children: ReactNode; flags: ChromeFlags }) {
  const path = usePathname() ?? "";
  const active = (href: string) => path.startsWith(href) || (href === "/board" && path.startsWith("/match")) || (href === "/fairness" && path.startsWith("/evaluation"));
  return (
    <ToastProvider>
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-[232px] flex-col rounded-[28px] p-4 lg:flex">
        <div className="px-1.5 pt-1">
          <Logo />
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event("bonded:palette"))}
          className="mt-6 flex items-center gap-2.5 rounded-2xl bg-ink/[0.05] px-3 py-2.5 text-left text-sm text-muted transition hover:bg-ink/[0.08] hover:text-ink"
        >
          <Search size={16} />
          <span className="flex-1">Search</span>
          <kbd className="rounded-md bg-surface/80 px-1.5 py-0.5 text-[12.5px] font-medium shadow-sm">⌘K</kbd>
        </button>
        <nav aria-label="Main" className="mt-4 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = path.startsWith(href) || (href === "/board" && path.startsWith("/match"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15.5px] font-medium transition ${on ? "bg-teal text-white shadow-[0_8px_20px_-10px_rgb(var(--teal))] dark:text-bg" : "text-ink/75 hover:bg-ink/[0.05] hover:text-ink"}`}
              >
                <Icon size={18} strokeWidth={2.1} className={on ? "" : "text-muted group-hover:text-ink"} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <Link href="/board?auto=1" className="flex items-center gap-3 rounded-2xl border border-coral/30 bg-coralsoft/60 px-3 py-2.5 text-sm font-semibold text-coralink transition hover:bg-coralsoft">
            <Compass size={17} /> Guided demo
            <span className="ml-auto text-[12.5px] font-normal text-muted">← →</span>
          </Link>
          <div className="glass-inset p-3">
            <p className="text-[14px] font-semibold">Sunrise Home Care</p>
            <p className="text-xs text-muted">Phoenix, AZ · demo agency</p>
            <div className="mt-2.5 space-y-1.5">
              <StatusDot ok={flags.qlooReady && !flags.fixture} label={flags.fixture ? "Qloo: offline fixture" : flags.qlooReady ? "Qloo: live" : "Qloo: not configured"} />
              <StatusDot ok={Boolean(flags.llm)} label={flags.llm ? `Agent: ${flags.llm}` : "Agent: deterministic"} />
            </div>
          </div>
          <p className="px-1 text-[12.5px] leading-snug text-muted">All people are fictional. Messages are simulated.</p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="glass-strong sticky top-0 z-30 flex items-center justify-between border-b border-white/40 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] dark:border-white/5 lg:hidden">
        <Logo />
        <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[12.5px] font-medium text-muted">Demo · fictional</span>
      </header>

      {flags.fixture && (
        <div className="sticky top-0 z-20 flex justify-center pt-2 lg:pl-[248px]">
          <span className="rounded-full bg-warn px-3 py-1 text-[12.5px] font-semibold text-white shadow dark:text-bg">Fixture mode: offline test data, not Qloo</span>
        </div>
      )}
      {!flags.fixture && !flags.qlooReady && (
        <div className="sticky top-0 z-20 flex justify-center pt-2 lg:pl-[248px]">
          <span className="rounded-full bg-bad px-3 py-1 text-[12.5px] font-semibold text-white shadow">QLOO_API_KEY is not set on the server</span>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <main className="mx-auto max-w-[1180px] px-4 pb-48 pt-5 sm:px-6 lg:px-8 lg:pb-32 lg:pt-8">{children}</main>
      </div>

      <Tour />
      <CommandPalette />

      {/* Mobile tab bar (Telegram / iOS style) */}
      <nav aria-label="Main" className="glass-strong fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex justify-around rounded-[26px] px-1.5 py-1.5 shadow-lift lg:hidden">
        {NAV.filter((n) => n.tab).map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`flex min-w-[60px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[12.5px] font-medium transition ${on ? "text-teal" : "text-muted"}`}>
              <span className={`flex h-7 w-11 items-center justify-center rounded-full transition ${on ? "bg-tealsoft" : ""}`}>
                <Icon size={19} strokeWidth={on ? 2.4 : 2} />
              </span>
              {label === "Try it yourself" ? "Try it" : label}
            </Link>
          );
        })}
      </nav>
    </ToastProvider>
  );
}
