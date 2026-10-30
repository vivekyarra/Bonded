import type { SeedInput } from "../compat/types";

/**
 * Hand-written gold set (spec §7 step 5): 20 synthetic pairs, half obviously compatible,
 * half obviously not. Person A is an older client, person B a younger caregiver.
 * Labels are written by people before any engine run, never tuned to the results.
 */
export interface GoldPair {
  id: string;
  compatible: boolean;
  note: string;
  a: SeedInput[];
  b: SeedInput[];
}

const s = (name: string, kind: SeedInput["kind"]): SeedInput => ({ name, kind, source: "intake" });

export const GOLD_SET: GoldPair[] = [
  { id: "g01", compatible: true, note: "Ranchera grandmother, regional-Mexican caregiver", a: [s("Pedro Infante", "artist"), s("Vicente Fernández", "artist"), s("El Chavo", "tv_show")], b: [s("Christian Nodal", "artist"), s("Selena", "movie"), s("Coco", "movie")] },
  { id: "g02", compatible: true, note: "Jazz era vs modern vocal jazz", a: [s("Ella Fitzgerald", "artist"), s("Count Basie", "artist"), s("Casablanca", "movie")], b: [s("Norah Jones", "artist"), s("Gregory Porter", "artist"), s("La La Land", "movie")] },
  { id: "g03", compatible: true, note: "Outlaw country across generations", a: [s("Johnny Cash", "artist"), s("Willie Nelson", "artist"), s("Gunsmoke", "tv_show")], b: [s("Chris Stapleton", "artist"), s("Zach Bryan", "artist"), s("Yellowstone", "tv_show")] },
  { id: "g04", compatible: true, note: "Soul then and now", a: [s("Aretha Franklin", "artist"), s("Sam Cooke", "artist"), s("Soul Train", "tv_show")], b: [s("Leon Bridges", "artist"), s("Amy Winehouse", "artist"), s("Bruno Mars", "artist")] },
  { id: "g05", compatible: true, note: "Crooners", a: [s("Frank Sinatra", "artist"), s("Dean Martin", "artist"), s("White Christmas", "movie")], b: [s("Michael Bublé", "artist"), s("Tony Bennett", "artist"), s("Elvis", "movie")] },
  { id: "g06", compatible: true, note: "Cooking television", a: [s("The French Chef", "tv_show"), s("Julie & Julia", "movie"), s("Perry Como", "artist")], b: [s("The Great British Baking Show", "tv_show"), s("Chopped", "tv_show"), s("Chef", "movie")] },
  { id: "g07", compatible: true, note: "Cosy mysteries", a: [s("Murder, She Wrote", "tv_show"), s("Columbo", "tv_show"), s("Murder on the Orient Express", "book")], b: [s("Only Murders in the Building", "tv_show"), s("Knives Out", "movie"), s("Norah Jones", "artist")] },
  { id: "g08", compatible: true, note: "Classic and modern country women", a: [s("Patsy Cline", "artist"), s("Loretta Lynn", "artist"), s("Dolly Parton", "artist")], b: [s("Kacey Musgraves", "artist"), s("Carrie Underwood", "artist"), s("Dolly Parton", "artist")] },
  { id: "g09", compatible: true, note: "Sixties rock and its heirs", a: [s("The Beatles", "artist"), s("Fleetwood Mac", "artist"), s("Forrest Gump", "movie")], b: [s("Harry Styles", "artist"), s("Fleetwood Mac", "artist"), s("Elvis", "movie")] },
  { id: "g10", compatible: true, note: "Musicals", a: [s("The Sound of Music", "movie"), s("Julie Andrews", "artist"), s("West Side Story", "movie")], b: [s("Mamma Mia!", "movie"), s("La La Land", "movie"), s("Lady Gaga", "artist")] },
  { id: "g11", compatible: false, note: "Lawrence Welk vs nu-metal", a: [s("The Lawrence Welk Show", "tv_show"), s("Perry Como", "artist"), s("Bing Crosby", "artist")], b: [s("Slipknot", "artist"), s("Tool", "artist"), s("John Wick", "movie")] },
  { id: "g12", compatible: false, note: "Westerns vs reality dating and EDM", a: [s("Gunsmoke", "tv_show"), s("Marty Robbins", "artist"), s("Lonesome Dove", "book")], b: [s("Love Island", "tv_show"), s("Skrillex", "artist"), s("Marshmello", "artist")] },
  { id: "g13", compatible: false, note: "Big band vs metal", a: [s("Glenn Miller", "artist"), s("Benny Goodman", "artist"), s("I Love Lucy", "tv_show")], b: [s("Metallica", "artist"), s("Rage Against the Machine", "artist"), s("Mad Max: Fury Road", "movie")] },
  { id: "g14", compatible: false, note: "Golden Girls vs prestige crime and drill", a: [s("The Golden Girls", "tv_show"), s("Barbra Streisand", "artist"), s("Little Women", "book")], b: [s("Breaking Bad", "tv_show"), s("The Walking Dead", "tv_show"), s("Slipknot", "artist")] },
  { id: "g15", compatible: false, note: "Ranchera vs EDM club", a: [s("Lola Beltrán", "artist"), s("Javier Solís", "artist"), s("María la del Barrio", "tv_show")], b: [s("Calvin Harris", "artist"), s("Skrillex", "artist"), s("Love Island", "tv_show")] },
  { id: "g16", compatible: false, note: "Jazz and Jeopardy vs metal and zombies", a: [s("Duke Ellington", "artist"), s("Miles Davis", "artist"), s("Jeopardy!", "tv_show")], b: [s("Tool", "artist"), s("The Walking Dead", "tv_show"), s("John Wick", "movie")] },
  { id: "g17", compatible: false, note: "Little House vs club", a: [s("Little House on the Prairie", "tv_show"), s("Hank Williams", "artist"), s("The Grapes of Wrath", "book")], b: [s("Drake", "artist"), s("Marshmello", "artist"), s("Love Island", "tv_show")] },
  { id: "g18", compatible: false, note: "Musicals vs action and metal", a: [s("Singin' in the Rain", "movie"), s("Judy Garland", "artist"), s("The Wizard of Oz", "movie")], b: [s("Mad Max: Fury Road", "movie"), s("Metallica", "artist"), s("Breaking Bad", "tv_show")] },
  { id: "g19", compatible: false, note: "Antiques and crooners vs EDM", a: [s("Antiques Roadshow", "tv_show"), s("Andy Williams", "artist"), s("Nat King Cole", "artist")], b: [s("Skrillex", "artist"), s("Calvin Harris", "artist"), s("Bar Smith", "place")] },
  { id: "g20", compatible: false, note: "Classic Hollywood vs nu-metal", a: [s("Roman Holiday", "movie"), s("Breakfast at Tiffany's", "movie"), s("Henry Mancini", "artist")], b: [s("Slipknot", "artist"), s("Rage Against the Machine", "artist"), s("The Walking Dead", "tv_show")] },
];
