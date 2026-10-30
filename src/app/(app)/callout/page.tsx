"use client";
import { useRef, useState } from "react";
import type { BridgeKit } from "@/lib/agent/bridgekit";
import type { CalloutResult, TraceEvent } from "@/lib/agent/loop";
import { BridgeKitView } from "@/components/BridgeKitView";
import { Avatar, BridgeChip, ErrorState, PageHeader, ScoreRing, Spinner } from "@/components/ui";
import { fetchJson, post, useJson } from "@/components/useJson";

interface Board {
  demo: { calloutShiftId: string; calloutCaregiverId: string; heroClientId: string };
}
interface Approval {
  kit: BridgeKit;
  familyDraft: { to: string; text: string };
  sent: { draft: { caregiverName: string; text: string; phone: string } };
}

const TOOL_LABEL: Record<string, string> = {
  get_shift: "Look up shift",
  find_available_caregivers: "Filter hard constraints",
  rank_candidates: "Qloo compatibility + rank",
  score_pair: "Inspect bridges",
  draft_offer: "Draft offer",
  send_offer: "Request send",
  qloo_search: "Qloo search",
};

type Row =
  | { kind: "say"; text: string }
  | { kind: "tool"; id: string; tool: string; input: Record<string, unknown>; summary?: string; ms?: number; error?: boolean }
  | { kind: "notice"; text: string };

export default function CalloutPage() {
  const board = useJson<Board>("/api/board");
  const [rows, setRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CalloutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [approving, setApproving] = useState(false);
  const [familySent, setFamilySent] = useState(false);
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  function apply(e: TraceEvent) {
    if (e.type === "start") setMode(e.mode === "claude" ? `Claude · ${e.model}` : "Deterministic mode (no Claude key)");
    else if (e.type === "say") setRows((r) => [...r, { kind: "say", text: e.text }]);
    else if (e.type === "notice") setRows((r) => [...r, { kind: "notice", text: e.text }]);
    else if (e.type === "tool") setRows((r) => [...r, { kind: "tool", id: e.id, tool: e.tool, input: e.input }]);
    else if (e.type === "tool_result")
      setRows((r) => r.map((x) => (x.kind === "tool" && x.id === e.id ? { ...x, summary: e.summary, ms: e.ms, error: e.error } : x)));
    else if (e.type === "result") {
      setResult(e.result);
      setSelected(e.result.pendingApproval);
    } else if (e.type === "error") setError(e.text);
  }

  async function run() {
    if (!board.data) return;
    setRows([]);
    setResult(null);
    setApproval(null);
    setFamilySent(false);
    setError(null);
    setRunning(true);
    t0.current = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - t0.current), 100);
    try {
      const res = await fetch("/api/agent/callout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shiftId: board.data.demo.calloutShiftId }) });
      if (!res.ok || !res.body) throw new Error(`Agent failed to start (${res.status})`);
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
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      clearInterval(timer);
      setElapsed(Date.now() - t0.current);
      setRunning(false);
    }
  }

  async function approve() {
    if (!selected) return;
    setApproving(true);
    try {
      setApproval(await fetchJson<Approval>("/api/agent/approve", post({ draftId: selected, approved_by_human: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApproving(false);
    }
  }

  async function notifyFamily() {
    if (!result || !approval) return;
    await fetchJson("/api/agent/notify", post({ clientId: result.clientId, caregiverId: approval.kit.caregiverId, shiftId: result.shiftId, approved_by_human: true }));
    setFamilySent(true);
  }

  const draft = result?.drafts.find((d) => d.draftId === selected);

  return (
    <div>
      <PageHeader eyebrow="Call-out Console" title="Rosa just called out for tomorrow">
        Dolores Alvarez, 84, has a 9am–1pm visit tomorrow. Watch the agent find a qualified substitute who will actually click with her. Nothing is sent until
        you approve.
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button className="btn-danger px-6 py-3 text-base" onClick={run} disabled={running || !board.data}>
          {running ? "Agent running…" : result ? "Run again" : "Simulate a call-out"}
        </button>
        {mode && <span className="chip-teal">{mode}</span>}
        {(running || result) && <span className="text-sm tabular-nums text-muted">{(elapsed / 1000).toFixed(1)} s</span>}
      </div>
      {error && <ErrorState error={error} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section aria-label="Agent trace" className="card p-5">
          <h2 className="text-xl">Agent trace</h2>
          {!rows.length && !running && <p className="mt-3 text-sm text-muted">The live tool-call trace appears here.</p>}
          <ol className="relative mt-4 space-y-3 border-l-2 border-line pl-5" aria-live="polite">
            {rows.map((r, i) =>
              r.kind === "tool" ? (
                <li key={r.id} className="relative animate-rise">
                  <span className={`absolute -left-[27px] top-0 mt-1.5 h-3 w-3 rounded-full ${r.summary === undefined ? "animate-pulse bg-warn" : r.error ? "bg-bad" : "bg-teal"}`} />
                  <p className="text-sm font-semibold">
                    {TOOL_LABEL[r.tool] ?? r.tool} <code className="ml-1 text-[11px] font-normal text-muted">{r.tool}</code>
                    {r.ms !== undefined && <span className="ml-2 text-[11px] font-normal text-muted">{r.ms} ms</span>}
                  </p>
                  <p className={`mt-0.5 text-sm ${r.error ? "text-bad" : "text-muted"}`}>{r.summary ?? "running…"}</p>
                </li>
              ) : (
                <li key={i} className={`animate-rise text-sm ${r.kind === "notice" ? "text-warn" : "italic text-ink/80"}`}>
                  {r.text}
                </li>
              ),
            )}
            {running && (
              <li>
                <Spinner label="Thinking" />
              </li>
            )}
          </ol>
          {result?.summary && (
            <div className="mt-5 rounded-xl bg-tealsoft p-4 text-sm text-ink">
              <p className="label text-teal">Agent recommendation</p>
              <p className="mt-1">{result.summary}</p>
            </div>
          )}
        </section>

        <section aria-label="Candidates and approval" className="space-y-6">
          {result && (
            <div className="card p-5">
              <h2 className="text-xl">Ranked substitutes</h2>
              <p className="text-sm text-muted">Everyone listed passes every hard constraint. Taste only ranks them.</p>
              <ul className="mt-3 space-y-2">
                {result.candidates.map((c, i) => {
                  const draftId = `${result.shiftId}:${c.caregiverId}`;
                  const hasDraft = result.drafts.some((d) => d.draftId === draftId);
                  return (
                    <li key={c.caregiverId}>
                      <button
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected === draftId ? "border-teal bg-tealsoft/50" : "border-line hover:border-teal/40"} disabled:cursor-default`}
                        onClick={() => hasDraft && setSelected(draftId)}
                        disabled={!hasDraft || Boolean(approval)}
                      >
                        <span className="w-4 text-sm font-bold text-muted">{i + 1}</span>
                        <Avatar name={c.name} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{c.name}</span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {c.bridges.slice(0, 2).map((b) => (
                              <BridgeChip key={b.qlooId} name={b.name} domain={b.domain} weaker={b.weaker} />
                            ))}
                          </span>
                        </span>
                        <span className="text-right text-xs text-muted">
                          <ScoreRing value={c.taste} size={44} />
                          <span className="block">{c.travelMin} min</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {draft && !approval && (
            <div className="card p-5">
              <h2 className="text-xl">Draft offer</h2>
              <p className="text-xs text-muted">
                To {draft.caregiverName} · {draft.phone} (simulated)
              </p>
              <div className="mt-3 max-w-sm rounded-2xl rounded-bl-sm bg-tealsoft p-3 text-sm">{draft.text}</div>
              <button className="btn-primary mt-4" onClick={approve} disabled={approving}>
                {approving ? "Sending…" : `Approve & send to ${draft.caregiverName.split(" ")[0]}`}
              </button>
              <p className="mt-2 text-xs text-muted">The agent cannot send this itself: the send tool requires approved_by_human, which only this button sets.</p>
            </div>
          )}

          {approval && (
            <div className="card p-5">
              <p className="chip-teal">Offer sent (simulated) · {approval.sent.draft.caregiverName} accepted</p>
              <h2 className="mt-3 text-xl">Family notice (draft)</h2>
              <p className="text-xs text-muted">To {approval.familyDraft.to}</p>
              <div className="mt-2 rounded-2xl bg-coralsoft p-3 text-sm">{approval.familyDraft.text}</div>
              {familySent ? (
                <p className="mt-3 text-sm font-semibold text-good">Family notified (simulated).</p>
              ) : (
                <button className="btn-ghost mt-3" onClick={notifyFamily}>
                  Approve & notify family
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {approval && (
        <section className="mt-10">
          <h2 className="mb-1 text-2xl">{approval.sent.draft.caregiverName.split(" ")[0]}'s Bridge Kit</h2>
          <p className="mb-5 text-sm text-muted">Generated the moment the offer was accepted, on the caregiver's phone before the visit.</p>
          <BridgeKitView kit={approval.kit} />
        </section>
      )}
    </div>
  );
}
