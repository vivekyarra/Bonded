import type { ReactNode } from "react";

const PALETTE = ["#0e5e60", "#e26d5a", "#5b6abf", "#b7791f", "#2f855a", "#9b4f96", "#2b6cb0", "#c05621"];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, size = 40, ring }: { name: string; size?: number; ring?: "teal" | "coral" }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${ring === "coral" ? "ring-2 ring-coral ring-offset-2 ring-offset-surface" : ring === "teal" ? "ring-2 ring-teal ring-offset-2 ring-offset-surface" : ""}`}
      style={{ width: size, height: size, background: PALETTE[h % PALETTE.length], fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function ScoreRing({ value, size = 56, label = "taste" }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 60 ? "rgb(var(--teal))" : v >= 35 ? "rgb(var(--warn))" : "rgb(var(--bad))";
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label} score ${v} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">{Math.round(v)}</span>
    </div>
  );
}

const DOMAIN_ICON: Record<string, string> = { music: "♪", tv: "▣", film: "◐", food: "◆", books: "❦" };

export function BridgeChip({ name, domain, weaker }: { name: string; domain: string; weaker?: boolean }) {
  return (
    <span className={weaker ? "chip-teal opacity-80" : "chip"} title={weaker ? "Weaker bridge (found with both people's combined signal)" : `Shared ${domain}`}>
      <span aria-hidden>{DOMAIN_ICON[domain] ?? "•"}</span>
      {name}
    </span>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-teal" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="card border-bad/40 p-5" role="alert">
      <p className="font-semibold text-bad">Something went wrong</p>
      <p className="mt-1 text-sm text-muted">{error}</p>
      {onRetry && (
        <button className="btn-ghost mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-serif text-lg">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function CachedBadge({ cached }: { cached?: boolean }) {
  if (!cached) return null;
  return <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">cached</span>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="label mb-2">{eyebrow}</p>}
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-3xl text-muted">{children}</div>}
    </header>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[2.5rem] border-[10px] border-ink/90 bg-bg shadow-2xl">
      <div className="mx-auto mt-2 h-1.5 w-20 rounded-full bg-ink/30" />
      <div className="max-h-[720px] overflow-y-auto px-4 pb-6 pt-3">{children}</div>
    </div>
  );
}
