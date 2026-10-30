import type { ReactNode } from "react";
import { hasLlm, isFixtureMode } from "@/lib/env";
import { qlooConfigured } from "@/lib/qloo/client";
import { AppChrome } from "./AppChrome";

/** Server wrapper: reads configuration (never secrets) and hands flags to the client chrome. */
export function Shell({ children }: { children: ReactNode }) {
  return <AppChrome flags={{ fixture: isFixtureMode(), qlooReady: qlooConfigured(), llm: hasLlm() ? `Gemini` : null }}>{children}</AppChrome>;
}

export { Logo } from "./AppChrome";
