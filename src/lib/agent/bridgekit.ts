import { getAgency } from "../agency/sunrise";
import { byId, caregiverName } from "../agency/query";
import { AGENCY_LOCATION } from "../compat/profile";
import type { Bridge, PairScore, TasteProfile } from "../compat/types";
import { qloo } from "../qloo/client";
import { DOMAINS, type Domain } from "../qloo/types";
import { claudeJson } from "./claude";
import { stripMarks, validateGroundedText } from "./guards";
import { KIT_SYSTEM } from "./prompts";

export interface KitOpener {
  bridgeId: string;
  bridgeName: string;
  domain: Domain;
  text: string;
}

export interface KitTrack {
  qlooId: string;
  name: string;
  spotify: string;
  youtube: string;
  shared: boolean;
}

export interface KitActivity {
  qlooId: string;
  name: string;
  domain: Domain;
  kind: "watch" | "visit" | "listen" | "read";
  text: string;
}

export interface BridgeKit {
  clientId: string;
  clientFirstName: string;
  caregiverId: string;
  caregiverFirstName: string;
  tasteScore: number;
  openers: KitOpener[];
  playlist: KitTrack[];
  activity: KitActivity | null;
  alsoTry: KitActivity[];
  careNotes: string[];
  phrasing: "claude" | "template";
  guardNotes: string[];
  createdAt: string;
}

const OPENER_TEMPLATES: Record<Domain, (n: string, who: string) => string> = {
  music: (n, who) => `Ask ${who} about [[${n}]]: "Do you have a favourite song of theirs? I've been playing them a lot lately."`,
  tv: (n, who) => `Mention [[${n}]] and ask ${who} who their favourite on the show is.`,
  film: (n, who) => `Ask ${who} if they've seen [[${n}]], and what they'd say about it to someone seeing it for the first time.`,
  food: (n, who) => `Ask ${who} whether they know [[${n}]] and what they'd order there.`,
  books: (n, who) => `Ask ${who} what stayed with them from [[${n}]].`,
};

const ACTIVITY: Record<Domain, { kind: KitActivity["kind"]; text: (n: string) => string }> = {
  tv: { kind: "watch", text: (n) => `Put on an episode of ${n} together and compare favourite moments.` },
  film: { kind: "watch", text: (n) => `Watch ${n} together over an afternoon.` },
  food: { kind: "visit", text: (n) => `Plan a short outing to ${n}, or recreate a favourite dish from there at home.` },
  music: { kind: "listen", text: (n) => `Play a ${n} record and ask which song brings back a memory.` },
  books: { kind: "read", text: (n) => `Read a chapter of ${n} aloud and talk about it.` },
};

const searchLinks = (name: string) => ({
  spotify: `https://open.spotify.com/search/${encodeURIComponent(name)}`,
  youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`,
});

function templateOpeners(bridges: Bridge[], who: string): KitOpener[] {
  return bridges.slice(0, 3).map((b) => ({
    bridgeId: b.entityId,
    bridgeName: b.name,
    domain: b.domain,
    text: OPENER_TEMPLATES[b.domain](b.name, who),
  }));
}

function knownNames(a: TasteProfile, b: TasteProfile): string[] {
  const names = new Set<string>();
  for (const p of [a, b]) for (const d of DOMAINS) for (const e of Object.values(p.domains[d])) names.add(e.name);
  for (const p of [...getAgency().clients, ...getAgency().caregivers]) for (const s of p.seeds) names.add(s.name);
  return [...names];
}

/** LLM phrasing with closed-set validation: regenerate once, then fall back to templates. */
async function phraseOpeners(bridges: Bridge[], who: string, known: string[]): Promise<{ openers: KitOpener[]; claude: boolean; notes: string[] }> {
  const picks = bridges.slice(0, 3);
  const allowed = picks.map((b) => b.name);
  const notes: string[] = [];
  const input = JSON.stringify({ client: who, shared_interests: picks.map((b) => ({ id: b.entityId, name: b.name, domain: b.domain })) });
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await claudeJson<{ openers: { id: string; text: string }[] }>(KIT_SYSTEM, `Write one opener per shared interest.\n${input}`, {
      type: "object",
      properties: {
        openers: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, text: { type: "string" } },
            required: ["id", "text"],
            additionalProperties: false,
          },
        },
      },
      required: ["openers"],
      additionalProperties: false,
    });
    if (!out) break;
    const openers: KitOpener[] = [];
    let ok = out.openers.length === picks.length;
    for (const o of out.openers) {
      const b = picks.find((x) => x.entityId === o.id);
      const g = validateGroundedText(o.text, allowed, known);
      if (!b || !g.ok) {
        ok = false;
        notes.push(`Attempt ${attempt + 1} rejected: ${b ? g.problems.join("; ") : `unknown bridge id ${o.id}`}`);
        break;
      }
      openers.push({ bridgeId: b.entityId, bridgeName: b.name, domain: b.domain, text: o.text });
    }
    if (ok) return { openers, claude: true, notes };
  }
  return { openers: templateOpeners(picks, who), claude: false, notes };
}

async function buildPlaylist(a: TasteProfile, b: TasteProfile, bridges: Bridge[]): Promise<KitTrack[]> {
  const tracks: KitTrack[] = [];
  const seen = new Set<string>();
  const add = (id: string, name: string, shared: boolean) => {
    if (seen.has(id) || tracks.length >= 8) return;
    seen.add(id);
    tracks.push({ qlooId: id, name, shared, ...searchLinks(name) });
  };
  for (const br of bridges.filter((x) => x.domain === "music")) add(br.entityId, br.name, true);
  const shared = Object.values(a.domains.music)
    .filter((e) => b.domains.music[e.id])
    .map((e) => ({ e, s: Math.min(e.affinity, b.domains.music[e.id].affinity) }))
    .sort((x, y) => y.s - x.s);
  for (const { e } of shared) add(e.id, e.name, true);
  if (tracks.length < 6) {
    // Ask Qloo for artists recommended for the pair as a whole (union of both people's seeds).
    const ids = [...new Set([...a.seeds, ...b.seeds].map((s) => s.qlooId))];
    if (ids.length) {
      try {
        const res = await qloo().insights({ kind: "artist", entityIds: ids, take: 12 });
        for (const e of res.data) add(e.id, e.name, false);
      } catch {
        /* playlist stays shorter */
      }
    }
  }
  return tracks;
}

async function pickActivities(a: TasteProfile, b: TasteProfile, bridges: Bridge[]): Promise<KitActivity[]> {
  const order: Domain[] = ["tv", "film", "food", "books", "music"];
  const out: KitActivity[] = [];
  for (const d of order) {
    const br = bridges.find((x) => x.domain === d);
    if (br) out.push({ qlooId: br.entityId, name: br.name, domain: d, kind: ACTIVITY[d].kind, text: ACTIVITY[d].text(br.name) });
  }
  if (!out.some((x) => x.domain === "food")) {
    const ids = [...new Set([...a.seeds, ...b.seeds].map((s) => s.qlooId))];
    try {
      const res = await qloo().insights({ kind: "place", entityIds: ids, take: 5, locationQuery: AGENCY_LOCATION });
      const place = res.data[0];
      if (place) out.push({ qlooId: place.id, name: place.name, domain: "food", kind: "visit", text: ACTIVITY.food.text(place.name) });
    } catch {
      /* optional */
    }
  }
  return out;
}

export async function buildBridgeKit(
  clientId: string,
  caregiverId: string,
  pair: PairScore,
  profiles: { client: TasteProfile; caregiver: TasteProfile },
): Promise<BridgeKit> {
  const q = byId(getAgency());
  const client = q.client(clientId);
  const cg = q.caregiver(caregiverId);
  const { openers, claude: usedClaude, notes } = await phraseOpeners(pair.bridges, client.firstName, knownNames(profiles.client, profiles.caregiver));
  const [playlist, activities] = await Promise.all([
    buildPlaylist(profiles.client, profiles.caregiver, pair.bridges),
    pickActivities(profiles.client, profiles.caregiver, pair.bridges),
  ]);
  return {
    clientId,
    clientFirstName: client.firstName,
    caregiverId,
    caregiverFirstName: caregiverName(cg),
    tasteScore: pair.tasteScore,
    openers: openers.map((o) => ({ ...o, text: stripMarks(o.text) })),
    playlist,
    activity: activities[0] ?? null,
    alsoTry: activities.slice(1, 3),
    careNotes: client.careNotes,
    phrasing: usedClaude ? "claude" : "template",
    guardNotes: notes,
    createdAt: new Date().toISOString(),
  };
}

/** Bridge Kit for a guest (Try-it page): templates only, no agency record. */
export function guestKit(clientFirstName: string, bridges: Bridge[]) {
  return {
    openers: templateOpeners(bridges, clientFirstName).map((o) => ({ ...o, text: stripMarks(o.text) })),
    playlist: bridges.filter((b) => b.domain === "music").map((b) => ({ qlooId: b.entityId, name: b.name, shared: true, ...searchLinks(b.name) })),
  };
}

