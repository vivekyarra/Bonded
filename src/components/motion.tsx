"use client";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || !("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, seen };
}

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, seen } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)] ${seen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Counts from 0 to `to` once visible. Formats with thousands separators. */
export function CountUp({ to, duration = 1400, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>(0.5);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced()) return setV(to);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {v.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/** A slow, seamless horizontal ribbon. Pauses on hover; static when motion is reduced. */
export function Marquee({ items, reverse = false, speed = 60, label }: { items: ReactNode[]; reverse?: boolean; speed?: number; label: string }) {
  return (
    <div className="marquee group relative overflow-hidden" aria-label={label} role="region">
      <div className={`marquee-track flex w-max gap-3 group-hover:[animation-play-state:paused] ${reverse ? "marquee-reverse" : ""}`} style={{ "--marquee-s": `${speed}s` } as CSSProperties}>
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 gap-3" aria-hidden={copy === 1}>
            {items.map((it, i) => (
              <li key={i} className="shrink-0">
                {it}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/** A vertical line that draws itself as the section scrolls past. */
export function ScrollLine({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) return setP(1);
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        setP(Math.max(0, Math.min(1, (vh * 0.75 - r.top) / Math.max(1, r.height))));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} className={`absolute w-[2px] rounded-full bg-ink/10 ${className}`} aria-hidden>
      <div className="w-full rounded-full bg-gradient-to-b from-teal to-coral" style={{ height: `${p * 100}%`, transition: "height .15s linear" }} />
    </div>
  );
}
