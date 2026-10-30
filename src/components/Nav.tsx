"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/board", label: "Match Board" },
  { href: "/callout", label: "Call-out" },
  { href: "/health", label: "Health" },
  { href: "/fairness", label: "Fairness & Results" },
  { href: "/evaluation", label: "Why Qloo" },
  { href: "/try", label: "Try it" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <nav aria-label="Main" className="relative">
      <button className="btn-ghost px-3 py-1.5 md:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Menu
      </button>
      <ul className={`${open ? "flex" : "hidden"} absolute right-0 top-11 z-20 w-56 flex-col gap-1 rounded-xl2 border border-line bg-surface p-2 shadow-lg md:static md:flex md:w-auto md:flex-row md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
        {LINKS.map((l) => {
          const active = path?.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-full px-3 py-1.5 text-sm font-medium transition ${active ? "bg-tealsoft text-teal" : "text-muted hover:text-ink"}`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
