import type { SeedInput } from "../compat/types";
import type { EntityKind } from "../qloo/types";

/**
 * Hand-written taste archetypes used to give synthetic people realistic favourites.
 * These are only *inputs*: every name is resolved through Qloo /search at profile-build
 * time, and anything Qloo cannot find is dropped (and reported as unresolved).
 */
export type Archetype = Partial<Record<EntityKind, string[]>>;

export const CLIENT_ARCHETYPES: Record<string, Archetype> = {
  jazz: {
    artist: ["Ella Fitzgerald", "Duke Ellington", "Count Basie", "Louis Armstrong", "Billie Holiday", "Nat King Cole", "Miles Davis"],
    movie: ["Casablanca", "Singin' in the Rain", "Roman Holiday"],
    tv_show: ["The Carol Burnett Show", "Jeopardy!"],
    book: ["The Great Gatsby"],
  },
  crooner: {
    artist: ["Frank Sinatra", "Dean Martin", "Bing Crosby", "Perry Como", "Tony Bennett", "Glenn Miller"],
    movie: ["It's a Wonderful Life", "White Christmas", "Breakfast at Tiffany's"],
    tv_show: ["The Lawrence Welk Show", "I Love Lucy", "Wheel of Fortune"],
    place: ["Durant's"],
  },
  country: {
    artist: ["Johnny Cash", "Willie Nelson", "Patsy Cline", "Hank Williams", "Loretta Lynn", "Marty Robbins", "Dolly Parton"],
    movie: ["High Noon", "True Grit"],
    tv_show: ["Gunsmoke", "Bonanza", "Little House on the Prairie"],
    book: ["Lonesome Dove", "The Grapes of Wrath"],
    place: ["The Stockyards Steakhouse"],
  },
  ranchera: {
    artist: ["Pedro Infante", "Vicente Fernández", "Lola Beltrán", "Javier Solís", "Luis Miguel"],
    movie: ["Nosotros los pobres"],
    tv_show: ["El Chavo", "María la del Barrio"],
    book: ["One Hundred Years of Solitude", "Like Water for Chocolate"],
    place: ["Carolina's Mexican Food", "Los Dos Molinos"],
  },
  soul: {
    artist: ["Aretha Franklin", "Ray Charles", "Sam Cooke", "Etta James", "The Supremes"],
    movie: ["Ray", "Dreamgirls"],
    tv_show: ["Soul Train", "The Price Is Right"],
    book: ["Becoming"],
    place: ["Lo-Lo's Chicken & Waffles"],
  },
  sixties: {
    artist: ["The Beatles", "Simon & Garfunkel", "Elvis Presley", "Fleetwood Mac", "Bob Dylan"],
    movie: ["The Graduate", "Forrest Gump"],
    tv_show: ["M*A*S*H", "The Andy Griffith Show"],
    book: ["To Kill a Mockingbird"],
    place: ["Welcome Diner"],
  },
  musicals: {
    artist: ["Julie Andrews", "Judy Garland", "Barbra Streisand"],
    movie: ["The Sound of Music", "The Wizard of Oz", "West Side Story", "Gone with the Wind"],
    tv_show: ["The Golden Girls"],
    book: ["Little Women", "Pride and Prejudice"],
  },
  mystery: {
    tv_show: ["Murder, She Wrote", "Columbo", "Perry Mason", "Jeopardy!"],
    book: ["Murder on the Orient Express"],
    movie: ["Rear Window"],
    artist: ["Glenn Miller", "Nat King Cole"],
  },
  cooking: {
    tv_show: ["The French Chef", "The Great British Baking Show", "Antiques Roadshow"],
    movie: ["Julie & Julia"],
    place: ["Pizzeria Bianco", "Matt's Big Breakfast", "Chompie's"],
    artist: ["Perry Como", "Andy Williams"],
  },
};

export const CAREGIVER_ARCHETYPES: Record<string, Archetype> = {
  latin: {
    artist: ["Bad Bunny", "Karol G", "Peso Pluma", "Christian Nodal", "Natalia Lafourcade"],
    movie: ["Coco", "Encanto", "Selena"],
    tv_show: ["Jane the Virgin"],
    book: ["The House on Mango Street"],
    place: ["Barrio Café"],
  },
  pop: {
    artist: ["Taylor Swift", "Harry Styles", "Adele", "Ed Sheeran", "Billie Eilish", "Lady Gaga"],
    movie: ["Barbie", "Mamma Mia!", "A Star Is Born"],
    tv_show: ["Bridgerton", "Grey's Anatomy", "Ted Lasso"],
    book: ["The Seven Husbands of Evelyn Hugo"],
    place: ["Postino Central"],
  },
  rnb: {
    artist: ["Beyoncé", "SZA", "Leon Bridges", "Bruno Mars", "Frank Ocean", "Amy Winehouse"],
    movie: ["Green Book", "Black Panther"],
    tv_show: ["Abbott Elementary", "Queer Eye"],
    book: ["Becoming"],
    place: ["Lo-Lo's Chicken & Waffles"],
  },
  countrynow: {
    artist: ["Chris Stapleton", "Luke Combs", "Kacey Musgraves", "Zach Bryan", "Morgan Wallen"],
    movie: ["Top Gun: Maverick", "Walk the Line"],
    tv_show: ["Yellowstone"],
    book: ["Where the Crawdads Sing"],
    place: ["Little Miss BBQ"],
  },
  crossoverjazz: {
    artist: ["Michael Bublé", "Norah Jones", "Gregory Porter", "Jon Batiste", "Tony Bennett"],
    movie: ["La La Land", "Elvis"],
    tv_show: ["The Great British Baking Show", "Only Murders in the Building"],
    book: ["The Alchemist"],
    place: ["The Nash"],
  },
  foodie: {
    tv_show: ["Chopped", "Diners, Drive-Ins and Dives", "The Great British Baking Show", "Queer Eye"],
    movie: ["Chef", "Julie & Julia"],
    place: ["Pizzeria Bianco", "Pho Thanh", "Matt's Big Breakfast"],
    artist: ["Bruno Mars", "Norah Jones"],
  },
  family: {
    tv_show: ["This Is Us", "The Crown", "Wheel of Fortune", "Jeopardy!"],
    movie: ["The Notebook", "Titanic", "Forrest Gump"],
    book: ["Educated", "Little Women"],
    artist: ["Adele", "Elvis Presley"],
  },
  heavy: {
    artist: ["Metallica", "Slipknot", "Tool", "Rage Against the Machine"],
    movie: ["Mad Max: Fury Road", "John Wick"],
    tv_show: ["Breaking Bad", "The Walking Dead"],
    place: ["Crescent Ballroom"],
  },
  club: {
    artist: ["Skrillex", "Calvin Harris", "Marshmello", "Drake"],
    tv_show: ["Love Island"],
    place: ["Bar Smith"],
  },
};

/** Draw a seed list (3–8 favourites) from one or two archetypes. */
export function drawSeeds(rand: () => number, archetypes: Archetype[], count: number): SeedInput[] {
  const pool: SeedInput[] = [];
  for (const a of archetypes) {
    for (const [kind, names] of Object.entries(a) as [EntityKind, string[]][]) {
      for (const name of names) pool.push({ name, kind, source: "intake" });
    }
  }
  // Fisher–Yates with the seeded RNG, then make sure music is always represented.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out: SeedInput[] = [];
  const seen = new Set<string>();
  const music = pool.find((s) => s.kind === "artist");
  if (music) {
    out.push(music);
    seen.add(music.name);
  }
  for (const s of pool) {
    if (out.length >= count) break;
    if (seen.has(s.name)) continue;
    const sameKind = out.filter((o) => o.kind === s.kind).length;
    if (sameKind >= 3) continue;
    seen.add(s.name);
    out.push(s);
  }
  return out;
}
