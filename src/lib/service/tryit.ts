import { getAgency } from "../agency/sunrise";
import { clientName } from "../agency/query";
import { guestKit } from "../agent/bridgekit";
import { scorePair } from "../compat/score";
import type { SeedInput } from "../compat/types";
import { isEntityKind } from "./guard";
import { guestProfile, personProfile } from "./engine";

/** "Try it yourself": a judge's favourites vs all 60 clients. Nothing is stored. */
export async function tryIt(favourites: SeedInput[]) {
  const seeds = favourites
    .filter((f) => f && typeof f === "object" && typeof f.name === "string" && f.name.trim() && isEntityKind(f.kind))
    .slice(0, 8)
    .map((f) => ({ name: f.name.trim().slice(0, 80), kind: f.kind, source: "intake" as const }));
  if (seeds.length < 3) throw new Error("Name at least 3 favourites.");
  const guest = await guestProfile(seeds);
  if (!guest.seeds.length) throw new Error("Qloo couldn't resolve any of those favourites. Pick from the suggestions.");
  const clients = getAgency().clients;
  const scored = await Promise.all(
    clients.map(async (c) => {
      const p = await personProfile("client", c.id);
      return { c, s: scorePair(p, guest) };
    }),
  );
  scored.sort((a, b) => b.s.tasteScore - a.s.tasteScore || b.s.bridges.length - a.s.bridges.length);
  const top = scored.slice(0, 3).map(({ c, s }) => ({
    client: { id: c.id, name: clientName(c), firstName: c.firstName, age: c.age, area: c.home.area, favourites: c.seeds.map((x) => x.name) },
    tasteScore: s.tasteScore,
    bridges: s.bridges.map((b) => ({ name: b.name, domain: b.domain, qlooId: b.entityId, affinityClient: b.affinityA, affinityYou: b.affinityB, weaker: b.weaker })),
  }));
  return {
    resolved: guest.seeds.map((s) => ({ name: s.name, qlooId: s.qlooId, kind: s.kind })),
    unresolved: guest.unresolved,
    top,
    kit: top[0] ? guestKit(top[0].client.firstName, scored[0].s.bridges) : null,
    stored: false,
  };
}
