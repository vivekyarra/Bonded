"use client";
import { ChevronRight, Compass, FlaskConical, HeartPulse, LayoutGrid, Scale, Search, Siren, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
import { ToastProvider } from "./Toast";
import { Tour } from "./Tour";

export interface ChromeFlags {
  fixture: boolean;
  qlooReady: boolean;
  llm: string | null;
}

const NAV = [
  { href: "/board", label: "Matches", icon: LayoutGrid, tab: true, group: "Scheduling" },
  { href: "/callout", label: "Call-outs", icon: Siren, tab: true, group: "Scheduling" },
  { href: "/health", label: "Health", icon: HeartPulse, tab: true, group: "Scheduling" },
  { href: "/fairness", label: "Fairness", icon: Scale, tab: true, group: "Insights" },
  { href: "/evaluation", label: "Why it works", icon: FlaskConical, tab: false, group: "Insights" },
  { href: "/try", label: "Try it yourself", icon: Sparkles, tab: true, group: "Insights" },
];
const GROUPS = ["Scheduling", "Insights"] as const;

/** Breadcrumb trail for the top bar. */
function crumbs(path: string): string[] {
  if (path.startsWith("/match")) return ["Matches", "Match detail"];
  if (path.startsWith("/kit")) return ["Matches", "Bridge Kit"];
  const n = NAV.find((x) => path.startsWith(x.href));
  return n ? [n.label] : [];
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Bonded home">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1e306e]">
        <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden>
          <circle cx="12.5" cy="16" r="7.5" fill="none" stroke="#fff" strokeWidth="2.8" />
          <circle cx="19.5" cy="16" r="7.5" fill="none" stroke="#d6ba84" strokeWidth="2.8" />
        </svg>
      </span>
      {!compact && <span className="text-[16px] font-semibold tracking-tight">Bonded</span>}
    </Link>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-[12px] font-medium text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-good" : "bg-warn"}`} />
      {label}
    </span>
  );
}

export function AppChrome({ children, flags }: { children: ReactNode; flags: ChromeFlags }) {
  const path = usePathname() ?? "";
  const active = (href: string) => path.startsWith(href) || (href === "/board" && (path.startsWith("/match") || path.startsWith("/kit")));
  const qloo = flags.fixture ? { ok: false, label: "Qloo · offline fixture" } : flags.qlooReady ? { ok: true, label: "Qloo · live" } : { ok: false, label: "Qloo · not configured" };
  const trail = crumbs(path);
  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Phoenix" });
  return (
    <ToastProvider>
      {/* Laptop: a fixed frame. Sidebar and top bar stay put; only the page area scrolls. */}
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
        <aside className="hidden w-[244px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex h-12 items-center border-b border-line px-4">
            <Logo />
          </div>

          {/* Workspace */}
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-coralsoft text-[12px] font-bold text-coralink">SH</span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold leading-tight">Sunrise Home Care</p>
              <p className="truncate text-[12px] text-muted">Phoenix, AZ · 40 caregivers</p>
            </div>
          </div>

          <div className="px-3">
            <button
              onClick={() => window.dispatchEvent(new Event("bonded:palette"))}
              className="flex w-full items-center gap-2 rounded-md border border-line bg-bg px-2.5 py-1.5 text-left text-[13px] text-muted transition hover:border-ink/20 hover:text-ink"
            >
              <Search size={14} />
              <span className="flex-1">Search people, pages</span>
              <kbd className="rounded border border-line bg-surface px-1 text-[11px] font-medium">Ctrl K</kbd>
            </button>
          </div>

          <nav aria-label="Main" className="mt-4 flex-1 space-y-4 overflow-y-auto px-3">
            {GROUPS.map((g) => (
              <div key={g}>
                <p className="px-2.5 pb-1 text-[11.5px] font-semibold text-muted">{g}</p>
                <div className="space-y-px">
                  {NAV.filter((n) => n.group === g).map(({ href, label, icon: Icon }) => {
                    const on = active(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={on ? "page" : undefined}
                        className={`group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium transition ${on ? "bg-ink/[0.06] text-ink" : "text-ink/70 hover:bg-ink/[0.04] hover:text-ink"}`}
                      >
                        <Icon size={16} strokeWidth={2} className={on ? "text-teal" : "text-muted group-hover:text-ink"} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <div>
              <p className="px-2.5 pb-1 text-[11.5px] font-semibold text-muted">Help</p>
              <Link href="/board?auto=1" className="group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium text-ink/70 transition hover:bg-ink/[0.04] hover:text-ink">
                <Compass size={16} className="text-muted group-hover:text-ink" /> Guided demo
                <span className="ml-auto text-[11px] text-muted">← →</span>
              </Link>
            </div>
          </nav>

          {/* Signed-in scheduler */}
          <div className="border-t border-line p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3a4458] text-[12px] font-semibold text-white">AR</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight">Ana Ruiz</p>
                <p className="truncate text-[12px] text-muted">Scheduler · demo</p>
              </div>
            </div>
            <div className="mt-3">
              <ThemeToggle />
            </div>
            <p className="mt-2.5 px-0.5 text-[11px] leading-snug text-muted">All people are fictional. Messages are simulated.</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] lg:hidden">
            <Logo />
            <div className="flex items-center gap-2">
              <StatusPill ok={qloo.ok} label={qloo.label} />
              <ThemeToggle compact />
            </div>
          </header>

          {/* Laptop top bar */}
          <div className="hidden h-12 shrink-0 items-center justify-between border-b border-line bg-surface px-8 lg:flex">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
              <span className="text-muted">Sunrise Home Care</span>
              {trail.map((c, i) => (
                <span key={c} className="flex items-center gap-1.5">
                  <ChevronRight size={13} className="text-muted/70" />
                  <span className={i === trail.length - 1 ? "font-medium text-ink" : "text-muted"}>{c}</span>
                </span>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <StatusPill ok={qloo.ok} label={qloo.label} />
              <StatusPill ok={Boolean(flags.llm)} label={flags.llm ? `Agent · ${flags.llm}` : "Agent · deterministic"} />
              <span className="ml-1 text-[12.5px] tabular-nums text-muted" suppressHydrationWarning>
                {today}
              </span>
            </div>
          </div>

          <div data-scroll className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {/* Bottom padding on laptops keeps the floating tour bar clear of the page. */}
            <main className="mx-auto max-w-[1240px] px-4 pb-44 pt-5 sm:px-6 lg:h-full lg:px-8 lg:pb-[104px] lg:pt-6">{children}</main>
          </div>
        </div>
      </div>
      <Tour />
      <CommandPalette />

      {/* Mobile tab bar */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex justify-around rounded-2xl border border-line bg-surface px-1.5 py-1.5 shadow-lift lg:hidden">
        {NAV.filter((n) => n.tab).map(({ href, label, icon: Icon }) => {
          const on = active(href) || (href === "/fairness" && path.startsWith("/evaluation"));
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`flex min-w-[60px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[12px] font-medium transition ${on ? "text-teal" : "text-muted"}`}>
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
