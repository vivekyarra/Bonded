"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "bonded.theme";

/** Light / Dark switch. Light is the default; the choice is saved per browser. */
export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const apply = (t: Theme) => {
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable */
    }
  };

  if (compact)
    return (
      <button
        onClick={() => apply(theme === "dark" ? "light" : "dark")}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:text-ink"
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    );

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-1 rounded-xl bg-ink/[0.05] p-1">
      {(
        [
          { value: "light", label: "Light", icon: Sun },
          { value: "dark", label: "Dark", icon: Moon },
        ] as const
      ).map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          onClick={() => apply(value)}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-medium transition ${theme === value ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
}
