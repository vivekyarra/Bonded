"use client";
import { AlertTriangle, BookOpen, Clapperboard, Info as InfoIcon, MapPin, Music2, RotateCw, Tv } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

/** Refined duotones: navy, slate, gold, forest, burgundy, steel, plum. */
const PALETTE = [
  ["#1b2a5e", "#3b4f96"],
  ["#3a4458", "#6b7690"],
  ["#8c6a35", "#c3a06a"],
  ["#1e4d3a", "#3f7a5e"],
  ["#6b1f2e", "#9c3d50"],
  ["#2f4a6b", "#5d7ea3"],
  ["#4a2f5c", "#76598a"],
];

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
  const [a, b] = PALETTE[h % PALETTE.length];
  const ringCls = ring === "coral" ? "ring-2 ring-coral/80" : ring === "teal" ? "ring-2 ring-teal/80" : "";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ring-offset-2 ring-offset-transparent ${ringCls}`}
      style={{ width: size, height: size, background: `linear-gradient(140deg, ${a}, ${b})`, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function ScoreRing({ value, size = 56, label = "taste", stroke = 6 }: { value: number | null; size?: number; label?: string; stroke?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(value === null ? 0 : Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(t);
  }, [value]);
  if (value === null)
    return (
      <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: not available`}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={(size - stroke - 2) / 2} fill="none" stroke="rgb(var(--ink) / 0.08)" strokeWidth={stroke} strokeDasharray="4 6" />
        </svg>
        <span className="absolute font-display font-bold text-muted" style={{ fontSize: Math.max(11, size * 0.28) }}>
          —
        </span>
      </div>
    );
  const r = (size - stroke - 2) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const id = `g${size}${Math.round(v)}`;
  const [from, to] = v >= 60 ? ["rgb(var(--teal))", "rgb(var(--violet))"] : v >= 35 ? ["rgb(var(--coral-ink))", "rgb(var(--coral))"] : ["rgb(var(--bad))", "rgb(var(--bad) / 0.7)"];
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label} score ${Math.round(v)} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--ink) / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * c} ${c}`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <span className="absolute font-display font-bold tabular-nums" style={{ fontSize: Math.max(11, size * 0.28) }}>
        {Math.round(v)}
      </span>
    </div>
  );
}

const DOMAIN_META: Record<string, { icon: typeof Music2; label: string; tint: string }> = {
  music: { icon: Music2, label: "Music", tint: "" },
  tv: { icon: Tv, label: "TV", tint: "" },
  film: { icon: Clapperboard, label: "Film", tint: "" },
  food: { icon: MapPin, label: "Place", tint: "" },
  books: { icon: BookOpen, label: "Book", tint: "" },
};

export function DomainIcon({ domain, size = 32 }: { domain: string; size?: number }) {
  const m = DOMAIN_META[domain] ?? DOMAIN_META.music;
  const Icon = m.icon;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-[30%] bg-tealsoft text-teal ring-1 ring-inset ring-teal/10" style={{ width: size, height: size }} role="img" aria-label={m.label}>
      <Icon size={size * 0.46} strokeWidth={1.9} />
    </span>
  );
}

export const domainLabel = (d: string) => DOMAIN_META[d]?.label ?? d;

export function BridgeChip({ name, domain, weaker }: { name: string; domain: string; weaker?: boolean }) {
  const Icon = (DOMAIN_META[domain] ?? DOMAIN_META.music).icon;
  return (
    <span className={weaker ? "chip-teal opacity-80" : "chip"} title={weaker ? `${name}: weaker bridge` : `${domainLabel(domain)}: ${name}`}>
      <Icon size={12} className="shrink-0" aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function SkeletonCards({ n = 4, h = "h-40" }: { n?: number; h?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Loading">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`glass p-5 ${h}`}>
          <Skeleton className="h-3 w-24" />
          <div className="mt-5 flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-2 flex-1" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-2 flex-1" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-6 w-2/3 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/10 border-t-teal" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-3 p-8 text-center" role="alert">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bad/10 text-bad">
        <AlertTriangle size={22} />
      </span>
      <p className="font-display text-lg font-semibold">Couldn't load this</p>
      <p className="max-w-md text-sm text-muted">{error}</p>
      {onRetry && (
        <button className="btn-ghost mt-1" onClick={onRetry}>
          <RotateCw size={15} /> Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tealsoft text-teal">{icon}</span>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function CachedBadge({ cached }: { cached?: boolean }) {
  if (!cached) return null;
  return <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[12.5px] font-semibold uppercase tracking-wider text-muted">cached</span>;
}

/** Small ⓘ that reveals an explanation on hover, focus or tap. Keeps screens clean. */
export function Info({ children, side = "bottom" }: { children: ReactNode; side?: "bottom" | "top" }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/60"
        aria-label="More info"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
      >
        <InfoIcon size={14} />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`glass-strong absolute left-1/2 z-50 w-64 -translate-x-1/2 animate-rise rounded-2xl p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lift ${side === "top" ? "bottom-7" : "top-7"}`}
        >
          {children}
        </span>
      )}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, info }: { title: string; subtitle?: ReactNode; actions?: ReactNode; info?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-[28px] leading-tight sm:text-[34px]">
          {title}
          {info && <Info>{info}</Info>}
        </h1>
        {subtitle && <p className="mt-1 text-[16px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full bg-ink/[0.06] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${value === o.value ? "glass-strong text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SegmentedLinks({ items, active }: { items: { href: string; label: string }[]; active: string }) {
  return (
    <nav aria-label="Section" className="inline-flex rounded-full bg-ink/[0.06] p-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={active === i.href ? "page" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${active === i.href ? "glass-strong text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "teal" | "coral" | "good" | "warn" | "bad" }) {
  const color = tone ? { teal: "text-teal", coral: "text-coralink", good: "text-good", warn: "text-warn", bad: "text-bad" }[tone] : "";
  return (
    <div className="glass p-4 sm:p-5">
      <p className="label">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** iPhone-style frame for caregiver-facing screens. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[380px] rounded-[3rem] bg-gradient-to-b from-[#2b2e36] to-[#0f1117] p-[11px] shadow-lift ring-1 ring-black/5">
      <div className="relative overflow-hidden rounded-[2.4rem] bg-bg">
        <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
        <div className="no-scrollbar max-h-[740px] overflow-y-auto px-4 pb-8 pt-12">{children}</div>
      </div>
    </div>
  );
}
