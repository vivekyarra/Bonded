"use client";
import { BarChart3, CalendarClock, Check, FileText, Filter, Heart, Search, Send, ShieldCheck, Siren, Sparkles, UserSearch, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BridgeKit } from "@/lib/agent/bridgekit";
import type { CalloutResult, TraceEvent } from "@/lib/agent/loop";
import { BridgeKitView } from "@/components/BridgeKitView";
import { useToast } from "@/components/Toast";
import { Avatar, BridgeChip, ErrorState, PageHeader, ScoreRing } from "@/components/ui";
import { fetchJson, post, useJson } from "@/components/useJson";

interface Board {
  demo: { calloutShiftId: string };
}
interface Approval {
  kit: BridgeKit;
  familyDraft: { to: string; text: string };
  sent: { draft: { caregiverName: string; text: string; phone: string } };
}

const TOOL: Record<string, { label: string; icon: typeof Search }> = {
  get_shift: { label: "Look up shift", icon: CalendarClock },
  find_available_caregivers: { label: "Apply hard constraints", icon: Filter },
  rank_candidates: { label: "Qloo taste + rank", icon: BarChart3 },
  score_pair: { label: "Inspect bridges", icon: Heart },
  draft_offer: { label: "Draft offer", icon: FileText },
  send_offer: { label: "Hold for approval", icon: ShieldCheck },
  qloo_search: { label: "Qloo search", icon: Search },
};

type Row =
  | { kind: "say"; text: string }
  | { kind: "tool"; id: string; tool: string; summary?: string; ms?: number; error?: boolean }
  | { kind: "notice"; text: string };

function Burst() {
  const dots = Array.from({ length: 14 }, (_, i) => i);
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {dots.map((i) => {
        const a = (i / dots.length) * Math.PI * 2;
        return (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={
              {
                background: ["rgb(var(--teal))", "rgb(var(--coral))", "rgb(var(--violet))", "rgb(var(--warn))"][i % 4],
                "--x": `${Math.cos(a) * 52}px`,
                "--y": `${Math.sin(a) * 52}px`,
                animation: `burst .9s ${i * 12}ms cubic-bezier(.2,.8,.2,1) both`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}

export default function CalloutPage() {
  const board = useJson<Board>("/api/board");
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CalloutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [approving, setApproving] = useState(false);
  const [familySent, setFamilySent] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const t0 = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const traceBox = useRef<HTMLOListElement | null>(null);

  useEffect(() => () => abort.current?.abort(), []);
  // `?run=1` (guided tour, ⌘K) starts the agent as soon as the page is ready.
  useEffect(() => {
    if (!board.data || running || result) return;
    if (new URLSearchParams(window.location.search).get("run") !== "1") return;
    window.history.replaceState(null, "", "/callout");
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.data]);
  useEffect(() => {
    // Keep the newest step visible inside the trace panel without scrolling the page.
    const el = traceBox.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [rows.length]);
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  function apply(e: TraceEvent) {
    if (e.type === "start") setMode(e.mode === "llm" ? `Gemini · ${e.model}` : "Deterministic agent");
    else if (e.type === "say") setRows((r) => [...r, { kind: "say", text: e.text }]);
    else if (e.type === "notice") setRows((r) => [...r, { kind: "notice", text: e.text }]);
    else if (e.type === "tool") setRows((r) => [...r, { kind: "tool", id: e.id, tool: e.tool }]);
    else if (e.type === "tool_result") setRows((r) => r.map((x) => (x.kind === "tool" && x.id === e.id ? { ...x, summary: e.summary, ms: e.ms, error: e.error } : x)));
    else if (e.type === "result") {
      setResult(e.result);
      setSelected(e.result.pendingApproval);
    } else if (e.type === "error") setError(e.text);
  }

  async function run() {
    if (!board.data || running) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setRows([]);
    setResult(null);
    setApproval(null);
    setFamilySent(false);
    setError(null);
    setRunning(true);
    t0.current = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - t0.current), 100);
    try {
      const res = await fetch("/api/agent/callout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shiftId: board.data.demo.calloutShiftId }), signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(`The agent couldn't start (${res.status})`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) if (p.startsWith("data: ")) apply(JSON.parse(p.slice(6)) as TraceEvent);
      }
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      clearInterval(timer);
      setElapsed(Date.now() - t0.current);
      setRunning(false);
    }
  }

  async function approve() {
    if (!selected || approving) return;
    setApproving(true);
    try {
      const a = await fetchJson<Approval>("/api/agent/approve", post({ draftId: selected, approved_by_human: true }));
      setApproval(a);
      toast(`${a.sent.draft.caregiverName.split(" ")[0]} accepted the shift`);
      setTimeout(() => setSheet(true), 700);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Approval failed", "error");
    } finally {
      setApproving(false);
    }
  }

  async function notifyFamily() {
    if (!result || !approval) return;
    try {
      await fetchJson("/api/agent/notify", post({ clientId: result.clientId, caregiverId: approval.kit.caregiverId, shiftId: result.shiftId, approved_by_human: true }));
      setFamilySent(true);
      toast("Family notified");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't notify", "error");
    }
  }

  const draft = result?.drafts.find((d) => d.draftId === selected);
  const idle = !running && !result && !error;

  return (
    <div className="fit-page">
      <PageHeader
        title="Call-outs"
        subtitle="Rosa can't make Dolores's 9am visit tomorrow"
        info="The agent applies every hard constraint, ranks qualified caregivers by Qloo taste, drafts offers, and waits for you. It cannot contact anyone without your approval."
        actions={
          <>
            {mode && <span className="glass-strong rounded-full px-3 py-1.5 text-xs font-medium text-muted">{mode}</span>}
            {(running || result) && <span className="text-sm tabular-nums text-muted">{(elapsed / 1000).toFixed(1)}s</span>}
            <button className="btn-danger" onClick={run} disabled={running || !board.data}>
              <Siren size={16} /> {running ? "Agent working…" : result ? "Run again" : "Handle call-out"}
            </button>
          </>
        }
      />

      {error && <ErrorState error={error} onRetry={run} />}

      {idle && (
        <div className="glass mx-auto flex max-w-xl animate-rise flex-col items-center p-8 text-center sm:p-10">
          <div className="flex items-center">
            <Avatar name="Dolores Alvarez" size={64} ring="teal" />
            <span className="-ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white ring-4 ring-bg">
              <X size={18} />
            </span>
          </div>
          <p className="mt-5 font-display text-xl font-semibold">Dolores needs someone tomorrow</p>
          <p className="mt-1 text-sm text-muted">9am–1pm · Maryvale · meds and meals</p>
          <button className="btn-danger mt-6 px-7 py-3 text-[16px]" onClick={run} disabled={!board.data}>
            <Siren size={17} /> Handle call-out
          </button>
        </div>
      )}

      {!idle && !error && (
        <div className="fit-fill grid gap-4 lg:grid-cols-[1fr_1.05fr]">
          <section aria-label="Agent trace" className="glass flex min-h-0 flex-col p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px]">Agent</h2>
              {running && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-teal">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-teal" /> live
                </span>
              )}
            </div>
            <ol ref={traceBox} className="mt-4 max-h-[560px] min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 lg:max-h-none" aria-live="polite">
              {rows.map((r, i) =>
                r.kind === "tool" ? (
                  <li key={r.id} className="flex animate-rise gap-3">
                    {(() => {
                      const Icon = (TOOL[r.tool] ?? TOOL.qloo_search).icon;
                      return (
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${r.summary === undefined ? "animate-pulse bg-warn/15 text-warn" : r.error ? "bg-bad/15 text-bad" : "bg-tealsoft text-teal"}`}>
                          <Icon size={17} />
                        </span>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {TOOL[r.tool]?.label ?? r.tool}
                        {r.ms !== undefined && <span className="text-[12.5px] font-normal text-muted">{r.ms}ms</span>}
                      </p>
                      <p className={`text-[14px] leading-snug ${r.error ? "text-bad" : "text-muted"}`}>{r.summary ?? "…"}</p>
                    </div>
                  </li>
                ) : (
                  <li key={i} className={`animate-rise pl-12 text-[14px] ${r.kind === "notice" ? "text-warn" : "italic text-ink/70"}`}>
                    {r.text}
                  </li>
                ),
              )}
            </ol>
            {result?.summary && (
              <div className="mt-4 flex gap-2.5 rounded-2xl bg-gradient-to-br from-teal/15 to-violet/10 p-4 text-sm">
                <Sparkles size={17} className="mt-0.5 shrink-0 text-teal" />
                <p>{result.summary}</p>
              </div>
            )}
          </section>

          <section aria-label="Candidates" className="min-h-0 space-y-4 lg:overflow-y-auto lg:pr-1">
            {!result && running && (
              <div className="glass space-y-3 p-5">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="skeleton h-16" />
                ))}
              </div>
            )}
            {draft && !approval && (
              <div className="glass animate-rise p-5">
                <p className="label">Offer to {draft.caregiverName}</p>
                <div className="mt-3 flex justify-end">
                  <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-gradient-to-b from-teal/90 to-teal px-4 py-2.5 text-[15px] leading-snug text-white shadow-sm">{draft.text}</div>
                </div>
                <p className="mt-1 text-right text-[12.5px] text-muted">{draft.phone} · SMS preview</p>
                <button className="btn-primary mt-4 w-full py-3" onClick={approve} disabled={approving}>
                  <Send size={16} /> {approving ? "Sending…" : `Approve & send to ${draft.caregiverName.split(" ")[0]}`}
                </button>
              </div>
            )}

            {approval && (
              <div className="glass relative animate-rise overflow-hidden p-5">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-12 w-12 animate-pop items-center justify-center rounded-full bg-good text-white">
                    <Check size={24} strokeWidth={3} />
                    <Burst />
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold">{approval.sent.draft.caregiverName.split(" ")[0]} accepted</p>
                    <p className="text-xs text-muted">Bridge Kit delivered to their phone</p>
                  </div>
                  <button className="btn-ghost ml-auto px-4 py-2" onClick={() => setSheet(true)}>
                    View kit
                  </button>
                </div>
                <div className="mt-5 border-t border-ink/[0.07] pt-4">
                  <p className="label">To {approval.familyDraft.to}</p>
                  <div className="mt-2 max-w-[90%] rounded-[20px] rounded-bl-md bg-ink/[0.06] px-4 py-2.5 text-[15px] leading-snug">{approval.familyDraft.text}</div>
                  {familySent ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-good">
                      <Check size={16} /> Family notified
                    </p>
                  ) : (
                    <button className="btn-ghost mt-3" onClick={notifyFamily}>
                      <Send size={15} /> Approve & notify family
                    </button>
                  )}
                </div>
              </div>
            )}
            {result && (
              <div className="glass p-3">
                <p className="label flex items-center gap-1.5 px-2 pb-2 pt-1">
                  <UserSearch size={13} /> Qualified substitutes
                </p>
                {!result.candidates.length && <p className="p-4 text-sm text-muted">Nobody qualified is free. Escalate to on-call.</p>}
                <ul className="space-y-1">
                  {result.candidates.map((c, i) => {
                    const id = `${result.shiftId}:${c.caregiverId}`;
                    const hasDraft = result.drafts.some((d) => d.draftId === id);
                    const on = selected === id;
                    return (
                      <li key={c.caregiverId} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                        <button
                          className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition ${on ? "bg-teal/10 ring-2 ring-teal/50" : "hover:bg-ink/[0.04]"} disabled:cursor-default`}
                          onClick={() => hasDraft && setSelected(id)}
                          disabled={!hasDraft || Boolean(approval)}
                          aria-pressed={on}
                        >
                          <span className="w-4 text-center text-xs font-bold text-muted">{i + 1}</span>
                          <Avatar name={c.name} size={40} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[16px] font-semibold">{c.name}</span>
                            <span className="mt-1 flex flex-wrap gap-1">
                              {c.bridges.slice(0, 2).map((b) => (
                                <BridgeChip key={b.qlooId} name={b.name} domain={b.domain} weaker={b.weaker} />
                              ))}
                            </span>
                          </span>
                          <span className="flex flex-col items-center gap-0.5">
                            <ScoreRing value={c.taste} size={42} stroke={5} />
                            <span className="text-[12.5px] text-muted">{c.travelMin} min</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

          </section>
        </div>
      )}

      {sheet && approval && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center" onClick={() => setSheet(false)} role="dialog" aria-modal="true" aria-label="Bridge Kit">
          <div className="no-scrollbar max-h-[100dvh] w-full max-w-md animate-sheet overflow-y-auto p-4 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between px-1 text-white">
              <span className="text-sm font-semibold drop-shadow">On {approval.sent.draft.caregiverName.split(" ")[0]}'s phone</span>
              <button className="btn-icon bg-white/20 text-white hover:bg-white/30" onClick={() => setSheet(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <BridgeKitView kit={approval.kit} />
          </div>
        </div>
      )}
    </div>
  );
}
