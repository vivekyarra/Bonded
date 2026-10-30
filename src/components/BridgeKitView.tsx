import { ExternalLink, MessageCircleHeart, Music2, NotebookPen, Play, Sparkles } from "lucide-react";
import type { BridgeKit } from "@/lib/agent/bridgekit";
import { Avatar, DomainIcon, PhoneFrame, ScoreRing } from "./ui";

export function BridgeKitView({ kit }: { kit: BridgeKit }) {
  return (
    <PhoneFrame>
      <div className="flex items-center justify-between text-[12.5px] font-medium text-muted">
        <span className="flex items-center gap-1">
          <Sparkles size={12} className="text-coralink" /> Bridge Kit
        </span>
        <span>for {kit.caregiverFirstName}</span>
      </div>

      <div className="glass mt-3 flex items-center gap-3 rounded-[22px] p-3.5">
        <Avatar name={kit.clientFirstName} size={50} ring="teal" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] text-muted">Your visit with</p>
          <p className="truncate font-display text-[22px] font-bold leading-tight">{kit.clientFirstName}</p>
        </div>
        <ScoreRing value={kit.tasteScore} size={46} stroke={5} />
      </div>

      <h3 className="mt-6 flex items-center gap-2 text-[16px]">
        <MessageCircleHeart size={17} className="text-coralink" /> Three ways in
      </h3>
      <ol className="mt-2.5 space-y-2.5">
        {kit.openers.map((o, i) => (
          <li key={o.bridgeId} className="flex animate-rise gap-2.5" style={{ animationDelay: `${i * 90}ms` }}>
            <DomainIcon domain={o.domain} size={30} />
            <div className="glass min-w-0 flex-1 rounded-[18px] rounded-tl-md px-3.5 py-2.5">
              <p className="text-[12.5px] font-semibold text-coralink">{o.bridgeName}</p>
              <p className="mt-0.5 text-[15px] leading-snug">{o.text}</p>
            </div>
          </li>
        ))}
        {!kit.openers.length && <li className="text-sm text-muted">No bridges yet. Ask about their favourite music.</li>}
      </ol>

      {kit.playlist.length > 0 && (
        <>
          <h3 className="mt-6 flex items-center gap-2 text-[16px]">
            <Music2 size={17} className="text-violet" /> Play together
          </h3>
          <ul className="glass mt-2.5 divide-y divide-ink/[0.06] overflow-hidden rounded-[20px]">
            {kit.playlist.map((t) => (
              <li key={t.qlooId} className="flex items-center gap-3 px-3 py-2.5">
                <a href={t.spotify} target="_blank" rel="noreferrer" aria-label={`Play ${t.name} on Spotify`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet to-coral text-white transition active:scale-90">
                  <Play size={13} fill="currentColor" />
                </a>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{t.name}</span>
                <a href={t.youtube} target="_blank" rel="noreferrer" className="text-muted transition hover:text-ink" aria-label={`${t.name} on YouTube`}>
                  <ExternalLink size={14} />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {kit.activity && (
        <>
          <h3 className="mt-6 flex items-center gap-2 text-[16px]">
            <Sparkles size={17} className="text-teal" /> Do together
          </h3>
          <div className="mt-2.5 rounded-[20px] bg-gradient-to-br from-teal to-violet p-4 text-white shadow-lift">
            <p className="text-[16px] font-semibold">{kit.activity.name}</p>
            <p className="mt-1 text-[14.5px] opacity-90">{kit.activity.text}</p>
          </div>
          {kit.alsoTry.length > 0 && <p className="mt-2 px-1 text-xs text-muted">Also: {kit.alsoTry.map((a) => a.name).join(" · ")}</p>}
        </>
      )}

      <h3 className="mt-6 flex items-center gap-2 text-[16px]">
        <NotebookPen size={17} className="text-muted" /> Care notes
      </h3>
      <ul className="glass mt-2.5 space-y-1.5 rounded-[20px] p-3.5 text-[14.5px]">
        {kit.careNotes.map((n) => (
          <li key={n} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
            {n}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-[12.5px] text-muted">
        Grounded in Qloo · wording by {kit.phrasing === "llm" ? "Gemini (checked)" : "template"}
      </p>
    </PhoneFrame>
  );
}
