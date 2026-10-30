/**
 * Sunrise Home Care, Phoenix AZ — a fully synthetic agency for the demo.
 * All people are fictional. Generation is deterministic (seeded RNG); only the calendar
 * dates move so that "tomorrow" is always tomorrow.
 */
import type { SeedInput } from "../compat/types";
import { bookedHours as booked, busySlots, checkEligibility } from "../matcher/constraints";
import { PHOENIX_AREAS, travelMinutes } from "./geo";
import { CAREGIVER_ARCHETYPES, CLIENT_ARCHETYPES, drawSeeds } from "./pools";
import {
  BLOCK_HOURS,
  type Agency,
  type Block,
  type Caregiver,
  type Client,
  type Home,
  type RecurringSchedule,
  type Shift,
  type ShiftDecline,
  type Skill,
  type VisitFeedback,
  type Weekday,
} from "./types";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const s = (name: string, kind: SeedInput["kind"], source: SeedInput["source"] = "intake"): SeedInput => ({ name, kind, source });

/** Phoenix does not observe DST: always UTC−7. */
export function phoenixToday(now = new Date()): string {
  return new Date(now.getTime() - 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay() as Weekday;

function homeIn(area: string, rand: () => number): Home {
  const [lat, lng] = PHOENIX_AREAS[area];
  return { lat: lat + (rand() - 0.5) * 0.03, lng: lng + (rand() - 0.5) * 0.03, area };
}

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const everyDay = (blocks: Block[]) => Object.fromEntries(ALL_DAYS.map((d) => [d, blocks])) as Caregiver["availability"];

// ---------------------------------------------------------------- story people

const STORY_CAREGIVERS: Omit<Caregiver, "phoneMock">[] = [
  {
    id: "cg01", firstName: "Rosa", lastInitial: "M", age: 34, gender: "F",
    home: { lat: 33.497, lng: -112.182, area: "Maryvale" },
    skills: ["medication_reminders", "meal_prep", "companionship", "diabetic_care"],
    languages: ["English", "Spanish"], maxHours: 40, petsOk: true, smokeOk: false,
    availability: everyDay(["morning", "afternoon"]), consentTaste: true,
    seeds: [s("Luis Miguel", "artist"), s("Selena", "artist"), s("Jane the Virgin", "tv_show"), s("Coco", "movie")],
    blurb: "Dolores's regular caregiver for two years.",
  },
  {
    id: "cg02", firstName: "Maria", lastInitial: "G", age: 23, gender: "F",
    home: { lat: 33.512, lng: -112.165, area: "Maryvale" },
    skills: ["medication_reminders", "meal_prep", "companionship"],
    languages: ["English", "Spanish"], maxHours: 32, petsOk: true, smokeOk: false,
    availability: everyDay(["morning", "afternoon"]), consentTaste: true,
    seeds: [s("Bad Bunny", "artist"), s("Selena", "artist"), s("Christian Nodal", "artist"), s("Chopped", "tv_show"), s("Coco", "movie")],
    blurb: "Culinary-school dropout, cooks for her grandmother every Sunday.",
  },
  {
    id: "cg03", firstName: "Travis", lastInitial: "B", age: 29, gender: "M",
    home: { lat: 33.545, lng: -112.17, area: "Glendale" },
    skills: ["lift_transfer", "medication_reminders", "companionship", "meal_prep"],
    languages: ["English"], maxHours: 40, petsOk: true, smokeOk: true,
    availability: { 1: ["morning", "afternoon"], 2: ["morning", "afternoon"], 3: ["morning", "afternoon"], 4: ["morning", "afternoon"], 5: ["morning", "afternoon"] },
    consentTaste: true,
    seeds: [s("Chris Stapleton", "artist"), s("Willie Nelson", "artist"), s("Yellowstone", "tv_show"), s("Lonesome Dove", "book"), s("Little Miss BBQ", "place")],
    blurb: "Former ranch hand, plays guitar on breaks.",
  },
  {
    id: "cg04", firstName: "Jasmine", lastInitial: "W", age: 26, gender: "F",
    home: { lat: 33.585, lng: -112.255, area: "Peoria" },
    skills: ["dementia_care", "medication_reminders", "companionship", "meal_prep"],
    languages: ["English"], maxHours: 36, petsOk: true, smokeOk: false,
    availability: everyDay(["morning", "afternoon"]), consentTaste: true,
    seeds: [s("Norah Jones", "artist"), s("Gregory Porter", "artist"), s("Jon Batiste", "artist"), s("La La Land", "movie"), s("The Great British Bake Off", "tv_show")],
    blurb: "Sings in a community choir; dementia-care certified.",
  },
  {
    id: "cg05", firstName: "Dale", lastInitial: "H", age: 56, gender: "M",
    home: { lat: 33.49, lng: -111.93, area: "Scottsdale" },
    skills: ["lift_transfer", "medication_reminders", "companionship", "wound_care"],
    languages: ["English"], maxHours: 40, petsOk: true, smokeOk: true,
    availability: { 1: ["morning", "afternoon"], 2: ["morning", "afternoon"], 3: ["morning", "afternoon"], 4: ["morning", "afternoon"], 5: ["morning", "afternoon"] },
    consentTaste: true,
    seeds: [s("Metallica", "artist"), s("Rage Against the Machine", "artist"), s("Breaking Bad", "tv_show"), s("John Wick", "movie")],
    blurb: "Retired firefighter turned caregiver.",
  },
  {
    id: "cg06", firstName: "Kayla", lastInitial: "S", age: 21, gender: "F",
    home: { lat: 33.42, lng: -111.83, area: "Mesa" },
    skills: ["medication_reminders", "companionship", "meal_prep"],
    languages: ["English"], maxHours: 30, petsOk: true, smokeOk: false,
    availability: everyDay(["morning", "afternoon"]), consentTaste: true,
    seeds: [s("Skrillex", "artist"), s("Calvin Harris", "artist"), s("Drake", "artist"), s("Love Island", "tv_show")],
    blurb: "Nursing student, works weekends.",
  },
  {
    id: "cg07", firstName: "Devon", lastInitial: "P", age: 38, gender: "M",
    home: { lat: 33.43, lng: -111.945, area: "Tempe" },
    skills: ["medication_reminders", "companionship", "meal_prep", "diabetic_care"],
    languages: ["English"], maxHours: 40, petsOk: true, smokeOk: true,
    availability: { 1: ["morning", "afternoon"], 2: ["morning", "afternoon"], 3: ["morning", "afternoon"], 4: ["morning", "afternoon"], 5: ["morning", "afternoon"], 6: ["morning"] },
    consentTaste: true,
    seeds: [s("Michael Bublé", "artist"), s("Tony Bennett", "artist"), s("Chopped", "tv_show"), s("Pizzeria Bianco", "place")],
    blurb: "Home cook, runs a supper club.",
  },
];

const STORY_CLIENTS: Client[] = [
  {
    id: "c01", firstName: "Dolores", lastName: "Alvarez", age: 84,
    home: { lat: 33.503, lng: -112.19, area: "Maryvale" },
    requiredSkills: ["medication_reminders", "meal_prep"], languagesNeeded: [],
    hasPets: true, smoker: false, genderPrefPersonalCare: "F", consentTaste: true,
    seeds: [s("Pedro Infante", "artist"), s("Vicente Fernández", "artist"), s("María la del Barrio", "tv_show"), s("Nosotros los pobres", "movie"), s("Lola Beltrán", "artist", "era")],
    eraAnswer: "Lola Beltrán, at every wedding in Hermosillo",
    careNotes: ["Metformin with breakfast", "Low-sodium meals", "Small dog (Chato) — friendly", "Prefers Spanish in the morning"],
    family: { name: "Carmen", relation: "daughter" },
  },
  {
    id: "c02", firstName: "Walter", lastName: "Briggs", age: 81,
    home: { lat: 33.538, lng: -112.19, area: "Glendale" },
    requiredSkills: ["lift_transfer", "medication_reminders"], languagesNeeded: [],
    hasPets: false, smoker: true, consentTaste: true,
    seeds: [s("Johnny Cash", "artist"), s("Willie Nelson", "artist"), s("Gunsmoke", "tv_show"), s("Lonesome Dove", "book"), s("The Stockyards Steakhouse", "place")],
    careNotes: ["Two-person assist not needed; gait belt for transfers", "Smokes on the porch"],
    family: { name: "Gary", relation: "son" },
  },
  {
    id: "c03", firstName: "Dorothy", lastName: "Hale", age: 91,
    home: { lat: 33.6, lng: -112.27, area: "Sun City" },
    requiredSkills: ["dementia_care", "medication_reminders"], languagesNeeded: [],
    hasPets: false, smoker: false, consentTaste: true,
    seeds: [s("Ella Fitzgerald", "artist"), s("Duke Ellington", "artist"), s("Count Basie", "artist", "era"), s("Casablanca", "movie"), s("The Carol Burnett Show", "tv_show")],
    eraAnswer: "Count Basie at the Savoy, 1955",
    careNotes: ["Early-stage dementia: music calms afternoon agitation", "Hearing aid in left ear"],
    family: { name: "Ruth", relation: "niece" },
  },
  {
    id: "c04", firstName: "Harold", lastName: "Jensen", age: 79,
    home: { lat: 33.5, lng: -111.92, area: "Scottsdale" },
    requiredSkills: ["medication_reminders"], languagesNeeded: [],
    hasPets: false, smoker: false, consentTaste: true,
    seeds: [s("The Beatles", "artist"), s("Simon & Garfunkel", "artist"), s("M*A*S*H", "tv_show"), s("To Kill a Mockingbird", "book"), s("The Graduate", "movie")],
    careNotes: ["Post hip-replacement, walker at all times"],
    family: { name: "Linda", relation: "wife" },
  },
  {
    id: "c05", firstName: "Eleanor", lastName: "Price", age: 88,
    home: { lat: 33.41, lng: -111.82, area: "Mesa" },
    requiredSkills: ["medication_reminders"], languagesNeeded: [],
    hasPets: false, smoker: false, consentTaste: true,
    seeds: [s("Murder, She Wrote", "tv_show"), s("Columbo", "tv_show"), s("Glenn Miller", "artist"), s("Murder on the Orient Express", "book")],
    careNotes: ["Likes the TV on during lunch", "Eye drops at noon"],
    family: { name: "Paul", relation: "son" },
  },
  {
    id: "c06", firstName: "Frank", lastName: "Russo", age: 77,
    home: { lat: 33.42, lng: -111.935, area: "Tempe" },
    requiredSkills: ["diabetic_care", "meal_prep"], languagesNeeded: [],
    hasPets: false, smoker: false, consentTaste: true,
    seeds: [s("Frank Sinatra", "artist"), s("Dean Martin", "artist"), s("Jeopardy!", "tv_show"), s("Pizzeria Bianco", "place")],
    careNotes: ["Insulin check before lunch", "Former line cook — loves to supervise"],
    family: { name: "Angela", relation: "daughter" },
  },
];

const STORY_SCHEDULES: RecurringSchedule[] = [
  { id: "s01", clientId: "c01", weekdays: ALL_DAYS, block: "morning", caregiverId: "cg01" },
  { id: "s02", clientId: "c02", weekdays: [1, 3, 5], block: "morning" },
  { id: "s03", clientId: "c03", weekdays: [2, 4, 6], block: "afternoon" },
  { id: "s04", clientId: "c04", weekdays: [1, 4], block: "afternoon" },
  { id: "s05", clientId: "c05", weekdays: [1, 3, 5], block: "afternoon", caregiverId: "cg06" },
  { id: "s06", clientId: "c06", weekdays: [2, 4], block: "morning", caregiverId: "cg07" },
];

// ---------------------------------------------------------------- generated people

const CG_NAMES: [string, "F" | "M"][] = [
  ["Aisha", "F"], ["Brianna", "F"], ["Carlos", "M"], ["Danielle", "F"], ["Emily", "F"], ["Fatima", "F"], ["Gabriela", "F"],
  ["Hannah", "F"], ["Imani", "F"], ["Jared", "M"], ["Keanu", "M"], ["Lucia", "F"], ["Mei", "F"], ["Nadia", "F"],
  ["Olivia", "F"], ["Priya", "F"], ["Quinn", "F"], ["Raquel", "F"], ["Samantha", "F"], ["Tanisha", "F"], ["Uriel", "M"],
  ["Valeria", "F"], ["Whitney", "F"], ["Ximena", "F"], ["Yolanda", "F"], ["Zoe", "F"], ["Andre", "M"], ["Beatriz", "F"],
  ["Chantel", "F"], ["Diego", "M"], ["Esperanza", "F"], ["Felicia", "F"], ["Grace", "F"],
];

const CLIENT_NAMES = [
  ["Agnes", "Whitfield"], ["Bernard", "Castillo"], ["Clara", "Mendoza"], ["Douglas", "Reyes"], ["Edith", "Nakamura"],
  ["Floyd", "Okafor"], ["Gloria", "Santos"], ["Herbert", "Lindqvist"], ["Irene", "Delgado"], ["Joseph", "Begay"],
  ["Kathleen", "O'Brien"], ["Leonard", "Washington"], ["Margaret", "Ruiz"], ["Norman", "Fischer"], ["Opal", "Jackson"],
  ["Patricia", "Nguyen"], ["Raymond", "Torres"], ["Shirley", "Abernathy"], ["Theodore", "Grant"], ["Ursula", "Kowalski"],
  ["Virginia", "Morales"], ["Wallace", "Thompson"], ["Yvonne", "Baker"], ["Albert", "Romero"], ["Beatrice", "Hughes"],
  ["Cecil", "Mitchell"], ["Delia", "Vargas"], ["Ernest", "Coleman"], ["Frances", "Kim"], ["George", "Patel"],
  ["Hazel", "Murphy"], ["Isaac", "Herrera"], ["June", "Sullivan"], ["Kenneth", "Yazzie"], ["Lorraine", "Ortiz"],
  ["Milton", "Brooks"], ["Nellie", "Chavez"], ["Oscar", "Lindgren"], ["Pearl", "Simmons"], ["Rosalind", "Ward"],
  ["Stanley", "Ramos"], ["Thelma", "Foster"], ["Vernon", "Price"], ["Wilma", "Gutierrez"], ["Arthur", "Bell"],
  ["Bettie", "Alvarado"], ["Clyde", "Henderson"], ["Dolly", "Medina"], ["Eugene", "Watts"], ["Florence", "Soto"],
  ["Gordon", "Hayes"], ["Helen", "Jimenez"], ["Irving", "Cohen"], ["Josephine", "Rivera"],
];

const AREAS = Object.keys(PHOENIX_AREAS);
const CLIENT_ARCH = Object.values(CLIENT_ARCHETYPES);
const CG_ARCH = Object.values(CAREGIVER_ARCHETYPES);

function pickN<T>(rand: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}

function genCaregiver(i: number, rand: () => number): Omit<Caregiver, "phoneMock"> {
  const [firstName, gender] = CG_NAMES[i];
  const area = AREAS[Math.floor(rand() * AREAS.length)];
  const languages = ["English"];
  if (rand() < 0.38) languages.push("Spanish");
  if (rand() < 0.06) languages.push("Tagalog");
  if (rand() < 0.05) languages.push("Vietnamese");
  if (rand() < 0.04) languages.push("Navajo");
  const skills = new Set<Skill>(["companionship", "medication_reminders"]);
  if (rand() < 0.75) skills.add("meal_prep");
  if (rand() < 0.4) skills.add("dementia_care");
  if (rand() < 0.35) skills.add("lift_transfer");
  if (rand() < 0.3) skills.add("diabetic_care");
  if (rand() < 0.12) skills.add("hoyer_lift");
  if (rand() < 0.12) skills.add("wound_care");
  if (rand() < 0.1) skills.add("hospice");
  const days = pickN(rand, ALL_DAYS, 4 + Math.floor(rand() * 3));
  const blocks: Block[][] = [["morning"], ["afternoon"], ["morning", "afternoon"], ["afternoon", "evening"], ["morning", "afternoon"]];
  const myBlocks = blocks[Math.floor(rand() * blocks.length)];
  const arch = pickN(rand, CG_ARCH, rand() < 0.55 ? 1 : 2);
  return {
    id: `cg${String(i + 8).padStart(2, "0")}`,
    firstName,
    lastInitial: "ABCDEFGHJKLMNPRSTVW"[Math.floor(rand() * 19)],
    age: 19 + Math.floor(rand() * 40),
    gender,
    home: homeIn(area, rand),
    skills: [...skills],
    languages,
    maxHours: [20, 24, 30, 32, 40][Math.floor(rand() * 5)],
    petsOk: rand() < 0.8,
    smokeOk: rand() < 0.3,
    availability: Object.fromEntries(days.map((d) => [d, myBlocks])) as Caregiver["availability"],
    consentTaste: true,
    seeds: drawSeeds(rand, arch, 4 + Math.floor(rand() * 4)),
    blurb: "",
  };
}

const NOTE_POOL = [
  "Walker for distances over 20 feet",
  "Hearing aids: speak clearly, face to face",
  "Blood pressure log after lunch",
  "Prefers showers in the morning",
  "Fall risk at night — check rugs",
  "Daughter visits Sundays",
  "Enjoys a short walk to the mailbox",
  "Thickened liquids",
  "Reading glasses on the side table",
];

function genClient(i: number, rand: () => number): Client {
  const [firstName, lastName] = CLIENT_NAMES[i];
  const area = AREAS[Math.floor(rand() * AREAS.length)];
  const req = new Set<Skill>();
  if (rand() < 0.55) req.add("medication_reminders");
  if (rand() < 0.4) req.add("meal_prep");
  if (rand() < 0.25) req.add("dementia_care");
  if (rand() < 0.2) req.add("lift_transfer");
  if (rand() < 0.15) req.add("diabetic_care");
  if (rand() < 0.04) req.add("hoyer_lift");
  if (rand() < 0.04) req.add("wound_care");
  if (req.size === 0) req.add("companionship");
  const languagesNeeded: string[] = [];
  const r = rand();
  if (r < 0.08) languagesNeeded.push("Spanish");
  else if (r < 0.1) languagesNeeded.push("Tagalog");
  const arch = pickN(rand, CLIENT_ARCH, rand() < 0.5 ? 1 : 2);
  const seeds = drawSeeds(rand, arch, 3 + Math.floor(rand() * 5));
  return {
    id: `c${String(i + 7).padStart(2, "0")}`,
    firstName,
    lastName,
    age: 68 + Math.floor(rand() * 30),
    home: homeIn(area, rand),
    requiredSkills: [...req],
    languagesNeeded,
    hasPets: rand() < 0.3,
    smoker: rand() < 0.08,
    genderPrefPersonalCare: rand() < 0.15 ? "F" : undefined,
    consentTaste: true,
    seeds,
    careNotes: pickN(rand, NOTE_POOL, 1 + Math.floor(rand() * 2)),
    family: { name: ["Susan", "Mark", "Teresa", "James", "Ana", "Robert"][Math.floor(rand() * 6)], relation: rand() < 0.6 ? "daughter" : "son" },
  };
}

// ---------------------------------------------------------------- assembly

const OPEN_GENERATED = new Set(["c07", "c08", "c09"]);
/** Story caregivers kept free of regular schedules so they can cover open shifts and call-outs. */
const FLOATERS = new Set(["cg02", "cg03", "cg04", "cg05"]);

function buildShifts(schedules: RecurringSchedule[], start: string, days: number): Shift[] {
  const shifts: Shift[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const wd = weekdayOf(date);
    for (const sc of schedules) {
      if (!sc.weekdays.includes(wd)) continue;
      const [h0, h1] = BLOCK_HOURS[sc.block];
      shifts.push({
        id: `${sc.id}-${date}`,
        scheduleId: sc.id,
        clientId: sc.clientId,
        date,
        weekday: wd,
        block: sc.block,
        start: `${date}T${String(h0).padStart(2, "0")}:00`,
        end: `${date}T${String(h1).padStart(2, "0")}:00`,
        hours: h1 - h0,
        status: sc.caregiverId ? "assigned" : "open",
        caregiverId: sc.caregiverId,
      });
    }
  }
  return shifts;
}

/**
 * Regular caregivers for generated clients are assigned the way agencies do it today:
 * nearest eligible caregiver, no taste involved. That is the baseline Bonded improves on.
 */
function assignRegulars(clients: Client[], caregivers: Caregiver[], schedules: RecurringSchedule[], probeWeek: string) {
  const hours = new Map<string, number>();
  for (const sc of schedules) if (sc.caregiverId) hours.set(sc.caregiverId, (hours.get(sc.caregiverId) ?? 0) + sc.weekdays.length * 4);
  const busy = new Map<string, { date: string; block: Block }[]>();
  for (const sc of schedules) {
    if (!sc.caregiverId) continue;
    const list = busy.get(sc.caregiverId) ?? [];
    for (const wd of sc.weekdays) list.push({ date: String(wd), block: sc.block });
    busy.set(sc.caregiverId, list);
  }
  for (const sc of schedules) {
    if (sc.caregiverId || OPEN_GENERATED.has(sc.clientId) || ["c02", "c03", "c04"].includes(sc.clientId)) continue;
    const client = clients.find((c) => c.id === sc.clientId)!;
    const needHours = sc.weekdays.length * 4;
    const ok = (cg: Caregiver) =>
      sc.weekdays.every(
        (wd) =>
          checkEligibility(cg, client, { date: String(wd), weekday: wd, block: sc.block, hours: 0 }, {
            bookedHours: 0,
            busy: busy.get(cg.id) ?? [],
          }).eligible,
      ) && (hours.get(cg.id) ?? 0) + needHours <= cg.maxHours;
    const byDistance = caregivers.filter((cg) => !FLOATERS.has(cg.id)).sort((a, b) => travelMinutes(a.home, client.home) - travelMinutes(b.home, client.home));
    let chosen = byDistance.find(ok);
    if (!chosen) {
      // Patch the nearest caregiver so the synthetic agency stays internally consistent.
      chosen = byDistance.find((cg) => (hours.get(cg.id) ?? 0) + needHours <= cg.maxHours && !(busy.get(cg.id) ?? []).some((b) => b.block === sc.block)) ?? byDistance[0];
      chosen.skills = [...new Set([...chosen.skills, ...client.requiredSkills])];
      chosen.languages = [...new Set([...chosen.languages, ...client.languagesNeeded])];
      if (client.hasPets) chosen.petsOk = true;
      if (client.smoker) chosen.smokeOk = true;
      for (const wd of sc.weekdays) chosen.availability[wd] = [...new Set([...(chosen.availability[wd] ?? []), sc.block])];
      if (client.genderPrefPersonalCare && client.genderPrefPersonalCare !== chosen.gender) client.genderPrefPersonalCare = undefined;
      if (travelMinutes(chosen.home, client.home) > 40) chosen.home = { ...client.home, lat: client.home.lat + 0.01, area: client.home.area };
    }
    sc.caregiverId = chosen.id;
    hours.set(chosen.id, (hours.get(chosen.id) ?? 0) + needHours);
    const list = busy.get(chosen.id) ?? [];
    for (const wd of sc.weekdays) list.push({ date: String(wd), block: sc.block });
    busy.set(chosen.id, list);
  }
  void probeWeek;
}

function feedbackFor(clientId: string, caregiverId: string, today: string, pattern: (-1 | 0 | 1)[], notes: (string | undefined)[]): VisitFeedback[] {
  return pattern.map((rating, k) => ({
    id: `fb-${clientId}-${caregiverId}-${k}`,
    clientId,
    caregiverId,
    date: addDays(today, -2 * (pattern.length - k)),
    by: k % 3 === 2 ? "family" : "caregiver",
    rating,
    note: notes[k],
  }));
}

export function buildSunrise(today = phoenixToday()): Agency {
  const rand = mulberry32(20261031);
  const caregivers: Caregiver[] = [
    ...structuredClone(STORY_CAREGIVERS),
    ...Array.from({ length: 33 }, (_, i) => genCaregiver(i, rand)),
  ].map((c, i) => ({ ...c, phoneMock: `(602) 555-01${String(i).padStart(2, "0")}` }));
  const clients: Client[] = [...structuredClone(STORY_CLIENTS), ...Array.from({ length: 54 }, (_, i) => genClient(i, rand))];

  const schedules: RecurringSchedule[] = structuredClone(STORY_SCHEDULES);
  for (const c of clients.slice(STORY_CLIENTS.length)) {
    const days = pickN(rand, [1, 2, 3, 4, 5, 6] as Weekday[], 2 + Math.floor(rand() * 2)).sort() as Weekday[];
    const block: Block = rand() < 0.5 ? "morning" : "afternoon";
    schedules.push({ id: `s${c.id.slice(1)}`, clientId: c.id, weekdays: days, block });
  }
  assignRegulars(clients, caregivers, schedules, today);

  // Past week, this week, next week.
  const start = addDays(today, -7 - ((weekdayOf(today) + 6) % 7));
  const shifts = buildShifts(schedules, start, 21);

  const history = new Set<string>();
  for (const sc of schedules) if (sc.caregiverId) history.add(`${sc.clientId}|${sc.caregiverId}`);
  // A few earlier pairings from before the current schedule.
  for (let k = 0; k < 25; k++) {
    const c = clients[7 + Math.floor(rand() * (clients.length - 7))];
    const g = caregivers[7 + Math.floor(rand() * (caregivers.length - 7))];
    history.add(`${c.id}|${g.id}`);
  }

  const feedback: VisitFeedback[] = [];
  for (const sc of schedules) {
    if (!sc.caregiverId || ["c05", "c06"].includes(sc.clientId)) continue;
    const pattern = Array.from({ length: 5 }, () => (rand() < 0.75 ? 1 : 0) as 1 | 0);
    feedback.push(...feedbackFor(sc.clientId, sc.caregiverId, today, pattern, []));
  }
  // Health demo: Eleanor & Kayla trending down.
  feedback.push(
    ...feedbackFor("c05", "cg06", today, [1, 0, 0, -1, 0, -1, -1], [
      undefined,
      "Quiet visit, she watched her shows",
      "Didn't have much to talk about",
      "She got frustrated when I changed the channel",
      undefined,
      "Tense visit — she said I'm always on my phone",
      "Family: Mom asked if someone else could come",
    ]),
  );
  // Stale-but-fine: Frank & Devon have run out of conversation.
  feedback.push(
    ...feedbackFor("c06", "cg07", today, [1, 1, 1, 0, 0, 0], [
      "Cooked together, great day",
      undefined,
      "Talked about Sinatra for an hour",
      "Visits feel a bit routine",
      "We've run out of things to talk about",
      "Family: Dad seems bored lately",
    ]),
  );
  const declines: ShiftDecline[] = [
    { clientId: "c05", caregiverId: "cg06", date: addDays(today, -9) },
    { clientId: "c05", caregiverId: "cg06", date: addDays(today, -4) },
  ];

  const tomorrow = addDays(today, 1);
  const calloutShift = shifts.find((x) => x.clientId === "c01" && x.date === tomorrow)!;

  return {
    id: "sunrise",
    name: "Sunrise Home Care",
    city: "Phoenix, AZ",
    caregivers,
    clients,
    schedules,
    shifts,
    feedback,
    declines,
    history: [...history],
    demo: {
      calloutShiftId: calloutShift.id,
      calloutCaregiverId: "cg01",
      heroClientId: "c01",
      heroCaregiverId: "cg02",
      obviousPair: ["c02", "cg03"],
      trapPair: ["c04", "cg05"],
      healthPair: ["c05", "cg06"],
      jazzClientId: "c03",
      today,
    },
  };
}

let cached: { day: string; agency: Agency } | null = null;

/** The agency for today (memoised per Phoenix calendar day). */
export function getAgency(): Agency {
  const day = phoenixToday();
  if (!cached || cached.day !== day) cached = { day, agency: buildSunrise(day) };
  return cached.agency;
}

export { booked as bookedHoursFor, busySlots };
