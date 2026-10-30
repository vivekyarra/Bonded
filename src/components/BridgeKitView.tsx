import type { BridgeKit } from "@/lib/agent/bridgekit";
import { Avatar, BridgeChip, PhoneFrame, ScoreRing } from "./ui";

export function BridgeKitView({ kit }: { kit: BridgeKit }) {
  return (
    <PhoneFrame>
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>Bonded · Bridge Kit</span>
        <span>for {kit.caregiverFirstName}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={kit.clientFirstName} size={52} ring="teal" />
        <div className="flex-1">
          <p className="label">Your visit with</p>
          <p className="font-serif text-2xl leading-tight">{kit.clientFirstName}</p>
        </div>
        <ScoreRing value={kit.tasteScore} size={48} />
      </div>

      <h3 className="mt-5 text-lg">Three ways in</h3>
      <ol className="mt-2 space-y-2">
        {kit.openers.map((o, i) => (
          <li key={o.bridgeId} className="rounded-2xl bg-surface p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-coral">{i + 1}</span>
              <BridgeChip name={o.bridgeName} domain={o.domain} />
            </div>
            <p className="mt-1.5 text-[15px] leading-snug">{o.text}</p>
          </li>
        ))}
        {!kit.openers.length && <li className="text-sm text-muted">Qloo found no bridges for this pair yet. Ask about their week and their favourite music.</li>}
      </ol>

      {kit.playlist.length > 0 && (
        <>
          <h3 className="mt-5 text-lg">A playlist you'll both like</h3>
          <p className="text-xs text-muted">About 30 minutes: one or two songs from each.</p>
          <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface shadow-sm">
            {kit.playlist.map((t) => (
              <li key={t.qlooId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="truncate">
                  ♪ {t.name}
                  {t.shared && <span className="ml-1 text-[10px] font-semibold uppercase text-coral">shared</span>}
                </span>
                <span className="flex shrink-0 gap-2 text-xs">
                  <a className="text-teal underline" href={t.spotify} target="_blank" rel="noreferrer">
                    Spotify
                  </a>
                  <a className="text-teal underline" href={t.youtube} target="_blank" rel="noreferrer">
                    YouTube
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {kit.activity && (
        <>
          <h3 className="mt-5 text-lg">Do together</h3>
          <div className="mt-2 rounded-2xl bg-coralsoft p-3 text-[15px]">
            <p className="font-semibold text-coral">{kit.activity.name}</p>
            <p className="mt-0.5">{kit.activity.text}</p>
          </div>
          {kit.alsoTry.length > 0 && <p className="mt-2 text-xs text-muted">Also: {kit.alsoTry.map((a) => a.name).join(" · ")}</p>}
        </>
      )}

      <h3 className="mt-5 text-lg">Care notes</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {kit.careNotes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <p className="mt-5 text-[10px] text-muted">
        Every song, show and place above comes from Qloo and carries a Qloo ID. Wording: {kit.phrasing === "claude" ? "Claude, validated against the bridge list" : "template"}.
        Care notes come from the client record, not Qloo.
      </p>
    </PhoneFrame>
  );
}
