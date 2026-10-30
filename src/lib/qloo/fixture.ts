/**
 * OFFLINE FIXTURE GRAPH — NOT QLOO DATA.
 *
 * A small deterministic stand-in for the Qloo API, used by unit tests, CI and local
 * development without network access. It mimics Qloo's response *shapes* and gives
 * entities in the same "taste cluster" correlated affinities, so the engine can be
 * exercised end to end. Every id it emits starts with `FX-` and the UI shows a
 * FIXTURE banner whenever QLOO_MODE=fixture. Production always uses the real API.
 */
import { ENTITY_TYPES, type EntityKind, type QlooTransport, urnToKind } from "./types";

type Pool = Partial<Record<EntityKind, string[]>>;

/** Taste clusters → representative entities per kind. */
const CLUSTERS: Record<string, Pool> = {
  jazz_standards: {
    artist: ["Ella Fitzgerald", "Duke Ellington", "Count Basie", "Louis Armstrong", "Billie Holiday", "Nat King Cole", "Tony Bennett", "Norah Jones", "Gregory Porter", "Jon Batiste", "Michael Bublé", "Miles Davis", "John Coltrane"],
    movie: ["Casablanca", "Singin' in the Rain", "La La Land", "Roman Holiday"],
    tv_show: ["The Carol Burnett Show", "The Tonight Show Starring Johnny Carson"],
    book: ["The Great Gatsby"],
    place: ["The Nash", "Valley Bar"],
  },
  swing_crooners: {
    artist: ["Frank Sinatra", "Dean Martin", "Bing Crosby", "Perry Como", "Glenn Miller", "Benny Goodman", "Michael Bublé", "Tony Bennett", "Bruno Mars"],
    movie: ["It's a Wonderful Life", "White Christmas", "Breakfast at Tiffany's"],
    tv_show: ["The Lawrence Welk Show", "I Love Lucy"],
    place: ["Durant's"],
  },
  classic_country: {
    artist: ["Johnny Cash", "Willie Nelson", "Patsy Cline", "Hank Williams", "Loretta Lynn", "Dolly Parton", "Marty Robbins", "Chris Stapleton", "Zach Bryan"],
    movie: ["High Noon", "True Grit", "Walk the Line"],
    tv_show: ["Gunsmoke", "Bonanza", "Yellowstone", "Little House on the Prairie"],
    book: ["Lonesome Dove", "The Grapes of Wrath"],
    place: ["Little Miss BBQ", "The Stockyards Steakhouse", "Rawhide Western Town"],
  },
  modern_country: {
    artist: ["Luke Combs", "Kacey Musgraves", "Chris Stapleton", "Zach Bryan", "Morgan Wallen", "Carrie Underwood"],
    tv_show: ["Yellowstone"],
    movie: ["A Star Is Born"],
    place: ["Little Miss BBQ"],
  },
  ranchera_mexicana: {
    artist: ["Pedro Infante", "Vicente Fernández", "Lola Beltrán", "Javier Solís", "Christian Nodal", "Luis Miguel", "Natalia Lafourcade", "Selena"],
    movie: ["Nosotros los pobres", "Coco", "Selena"],
    tv_show: ["El Chavo del Ocho", "María la del Barrio"],
    book: ["One Hundred Years of Solitude", "Like Water for Chocolate"],
    place: ["Barrio Café", "Carolina's Mexican Food", "Los Dos Molinos"],
  },
  latin_pop: {
    artist: ["Selena", "Bad Bunny", "Karol G", "Peso Pluma", "Luis Miguel", "Christian Nodal", "Natalia Lafourcade", "Shakira"],
    movie: ["Coco", "Encanto", "Selena"],
    tv_show: ["Jane the Virgin", "María la del Barrio"],
    book: ["The House on Mango Street"],
    place: ["Barrio Café", "Carolina's Mexican Food"],
  },
  soul_motown: {
    artist: ["Aretha Franklin", "Ray Charles", "Sam Cooke", "Etta James", "The Supremes", "Leon Bridges", "Amy Winehouse", "Bruno Mars", "Beyoncé", "SZA"],
    movie: ["Dreamgirls", "Green Book", "Ray"],
    tv_show: ["Soul Train", "Abbott Elementary"],
    book: ["Becoming"],
    place: ["Lo-Lo's Chicken & Waffles"],
  },
  pop_now: {
    artist: ["Taylor Swift", "Beyoncé", "Adele", "Ed Sheeran", "Billie Eilish", "Harry Styles", "Lady Gaga", "Rihanna", "Drake", "Kendrick Lamar", "Frank Ocean"],
    movie: ["Barbie", "Mamma Mia!", "A Star Is Born", "Top Gun: Maverick"],
    tv_show: ["Stranger Things", "Bridgerton", "Grey's Anatomy", "The Office", "Ted Lasso"],
    book: ["The Seven Husbands of Evelyn Hugo", "Where the Crawdads Sing"],
    place: ["Lux Central", "Postino WineCafé"],
  },
  classic_rock_folk: {
    artist: ["The Beatles", "Simon & Garfunkel", "Elvis Presley", "Fleetwood Mac", "Bob Dylan", "Harry Styles"],
    movie: ["Elvis", "Forrest Gump", "The Graduate"],
    tv_show: ["The Ed Sullivan Show", "M*A*S*H"],
    book: ["To Kill a Mockingbird"],
    place: ["Welcome Diner"],
  },
  musicals_classics: {
    artist: ["Julie Andrews", "Judy Garland", "Barbra Streisand", "Lady Gaga"],
    movie: ["The Sound of Music", "The Wizard of Oz", "West Side Story", "Mamma Mia!", "La La Land", "Gone with the Wind"],
    tv_show: ["The Carol Burnett Show"],
    book: ["Little Women", "Pride and Prejudice", "Gone with the Wind"],
  },
  mystery_procedural: {
    tv_show: ["Murder, She Wrote", "Columbo", "Perry Mason", "Only Murders in the Building", "Grey's Anatomy"],
    book: ["Murder on the Orient Express", "The Girl with the Dragon Tattoo"],
    movie: ["Knives Out", "Rear Window"],
  },
  game_shows: {
    tv_show: ["Jeopardy!", "Wheel of Fortune", "The Price Is Right", "Family Feud"],
  },
  cooking: {
    tv_show: ["Chopped", "The Great British Bake Off", "Diners, Drive-Ins and Dives", "Julia Child's The French Chef", "Queer Eye"],
    book: ["Like Water for Chocolate"],
    movie: ["Julie & Julia", "Chef"],
    place: ["Pizzeria Bianco", "Matt's Big Breakfast", "Chompie's", "Pho Thanh", "Welcome Diner"],
  },
  sitcom_comfort: {
    tv_show: ["The Golden Girls", "I Love Lucy", "The Andy Griffith Show", "M*A*S*H", "The Office", "Abbott Elementary", "Ted Lasso"],
    movie: ["Some Like It Hot"],
  },
  family_drama: {
    tv_show: ["This Is Us", "Little House on the Prairie", "The Crown", "Grey's Anatomy"],
    movie: ["The Notebook", "Titanic", "Forrest Gump"],
    book: ["Where the Crawdads Sing", "Educated", "The Alchemist", "Little Women"],
  },
  family_animation: {
    movie: ["Coco", "Encanto", "The Lion King", "Up"],
    book: ["Harry Potter and the Sorcerer's Stone"],
  },
  heavy_alt: {
    artist: ["Metallica", "Slipknot", "Tool", "Rage Against the Machine"],
    movie: ["Mad Max: Fury Road", "John Wick"],
    tv_show: ["Breaking Bad", "The Walking Dead"],
    place: ["Crescent Ballroom"],
  },
  edm_club: {
    artist: ["Skrillex", "Calvin Harris", "Marshmello"],
    tv_show: ["Love Island"],
    place: ["Bar Smith"],
  },
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const fixtureId = (kind: EntityKind, name: string) => `FX-${kind}-${slug(name)}`;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const unit = (s: string) => (hash(s) % 10_000) / 10_000;

interface FxEntity {
  id: string;
  name: string;
  kind: EntityKind;
  clusters: Set<string>;
}

const REGISTRY = new Map<string, FxEntity>();
const BY_NAME = new Map<string, FxEntity[]>();
const clusterNames = Object.keys(CLUSTERS);

function register(name: string, kind: EntityKind, cluster: string) {
  const id = fixtureId(kind, name);
  let e = REGISTRY.get(id);
  if (!e) {
    e = { id, name, kind, clusters: new Set() };
    REGISTRY.set(id, e);
    const key = name.toLowerCase();
    BY_NAME.set(key, [...(BY_NAME.get(key) ?? []), e]);
  }
  e.clusters.add(cluster);
  return e;
}

for (const [cluster, pool] of Object.entries(CLUSTERS)) {
  for (const [kind, names] of Object.entries(pool) as [EntityKind, string[]][]) {
    for (const n of names) register(n, kind, cluster);
  }
}

/** Unknown names are placed deterministically into one cluster so search always resolves. */
function unknownEntity(name: string, kind: EntityKind): FxEntity {
  const cluster = clusterNames[hash(name) % clusterNames.length];
  return register(name, kind, cluster);
}

function search(params: Record<string, string>) {
  const q = (params.query ?? "").trim().toLowerCase();
  const kind = urnToKind(params.types) ?? "artist";
  const take = Number(params.take ?? 6);
  if (!q) return { results: [] };
  const exact = (BY_NAME.get(q) ?? []).filter((e) => e.kind === kind);
  const partial = [...REGISTRY.values()].filter(
    (e) => e.kind === kind && e.name.toLowerCase().includes(q) && !exact.includes(e),
  );
  let hits = [...exact, ...partial];
  if (hits.length === 0) hits = [unknownEntity(params.query.trim(), kind)];
  return {
    results: hits.slice(0, take).map((e) => ({
      entity_id: e.id,
      name: e.name,
      types: [ENTITY_TYPES[e.kind]],
      popularity: 0.5 + unit(e.id) / 2,
      properties: { short_description: "Offline fixture entity (not Qloo data)" },
    })),
  };
}

function insights(params: Record<string, string>) {
  const kind = urnToKind(params["filter.type"]);
  if (!kind) throw new Error("fixture: filter.type required");
  const take = Number(params.take ?? 50);
  const seeds = (params["signal.interests.entities"] ?? "")
    .split(",")
    .map((id) => REGISTRY.get(id))
    .filter((e): e is FxEntity => Boolean(e));
  const weight = new Map<string, number>();
  for (const s of seeds) for (const c of s.clusters) weight.set(c, (weight.get(c) ?? 0) + 1 / s.clusters.size);
  const total = [...weight.values()].reduce((a, b) => a + b, 0) || 1;
  const seedKey = seeds.map((s) => s.id).sort().join(",");

  const scored: { e: FxEntity; aff: number; by: string[] }[] = [];
  for (const e of REGISTRY.values()) {
    if (e.kind !== kind) continue;
    let w = 0;
    for (const c of e.clusters) w += (weight.get(c) ?? 0) / total;
    const by = seeds.filter((s) => [...s.clusters].some((c) => e.clusters.has(c))).map((s) => s.id);
    // Weak background affinity for everything else, so profiles are never empty.
    const aff = w > 0 ? 0.45 + 0.5 * Math.min(1, w) * (0.75 + 0.25 * unit(e.id + seedKey)) : 0.05 + 0.2 * unit(e.id + seedKey);
    // Like the real graph, unrelated entities rarely make a 50-item list.
    if (w > 0 || unit(e.id + seedKey) < 0.12) scored.push({ e, aff: Math.min(0.99, aff), by });
  }
  scored.sort((a, b) => b.aff - a.aff);
  return {
    success: true,
    results: {
      entities: scored.slice(0, take).map(({ e, aff, by }) => ({
        entity_id: e.id,
        name: e.name,
        type: ENTITY_TYPES[e.kind],
        popularity: 0.5 + unit(e.id) / 2,
        properties: { short_description: "Offline fixture entity (not Qloo data)" },
        query: {
          affinity: Number(aff.toFixed(4)),
          explainability: { signal: { interests: { entities: by.map((id) => ({ entity_id: id })) } } },
        },
      })),
    },
  };
}

export const fixtureTransport: QlooTransport = async (path, params) => {
  if (path === "/search") return search(params);
  if (path === "/v2/insights") return insights(params);
  throw new Error(`fixture: unsupported path ${path}`);
};
