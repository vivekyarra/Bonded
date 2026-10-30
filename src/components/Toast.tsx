"use client";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

type Tone = "success" | "info" | "error";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? XCircle : Info;
          return (
            <div key={t.id} className="glass-strong flex animate-sheet items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lift">
              <Icon size={17} className={t.tone === "success" ? "text-good" : t.tone === "error" ? "text-bad" : "text-teal"} />
              {t.text}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
