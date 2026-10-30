"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass max-w-sm p-8 text-center" role="alert">
        <p className="font-display text-lg font-semibold">Something went wrong</p>
        <p className="mt-1 text-sm text-muted">Please try again.</p>
        <button className="btn-primary mt-6" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
