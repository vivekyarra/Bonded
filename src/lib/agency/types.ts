import type { SeedInput } from "../compat/types";

export const SKILLS = [
  "dementia_care",
  "lift_transfer",
  "hoyer_lift",
  "diabetic_care",
  "hospice",
  "medication_reminders",
  "meal_prep",
  "wound_care",
  "companionship",
] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABEL: Record<Skill, string> = {
  dementia_care: "Dementia care",
  lift_transfer: "Lift transfers",
  hoyer_lift: "Hoyer lift",
  diabetic_care: "Diabetic care",
  hospice: "Hospice support",
  medication_reminders: "Medication reminders",
  meal_prep: "Meal prep",
  wound_care: "Wound care",
  companionship: "Companionship",
};

export type Block = "morning" | "afternoon" | "evening";
export const BLOCK_HOURS: Record<Block, [number, number]> = {
  morning: [9, 13],
  afternoon: [13, 17],
  evening: [17, 21],
};

/** 0 = Sunday … 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface Home {
  lat: number;
  lng: number;
  area: string;
}

export interface Caregiver {
  id: string;
  firstName: string;
  lastInitial: string;
  age: number;
  /** Used only for the client's personal-care privacy preference. */
  gender: "F" | "M";
  phoneMock: string;
  home: Home;
  skills: Skill[];
  languages: string[];
  maxHours: number;
  petsOk: boolean;
  smokeOk: boolean;
  availability: Partial<Record<Weekday, Block[]>>;
  consentTaste: boolean;
  seeds: SeedInput[];
  blurb: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  home: Home;
  requiredSkills: Skill[];
  /** Languages the caregiver must speak (job requirement), usually empty. */
  languagesNeeded: string[];
  hasPets: boolean;
  smoker: boolean;
  genderPrefPersonalCare?: "F" | "M";
  consentTaste: boolean;
  seeds: SeedInput[];
  careNotes: string[];
  family: { name: string; relation: string };
  /** Optional "what music did you dance to at 20?" answers, already part of seeds with source "era". */
  eraAnswer?: string;
}

export interface RecurringSchedule {
  id: string;
  clientId: string;
  weekdays: Weekday[];
  block: Block;
  /** Regular caregiver, or undefined when the schedule is open. */
  caregiverId?: string;
}

export interface Shift {
  id: string;
  scheduleId: string;
  clientId: string;
  date: string; // YYYY-MM-DD
  weekday: Weekday;
  block: Block;
  start: string; // ISO local-ish "YYYY-MM-DDTHH:00"
  end: string;
  hours: number;
  status: "open" | "assigned" | "callout";
  caregiverId?: string;
}

export interface VisitFeedback {
  id: string;
  clientId: string;
  caregiverId: string;
  date: string;
  by: "caregiver" | "family";
  rating: -1 | 0 | 1;
  note?: string;
}

export interface ShiftDecline {
  clientId: string;
  caregiverId: string;
  date: string;
}

export interface Agency {
  id: string;
  name: string;
  city: string;
  caregivers: Caregiver[];
  clients: Client[];
  schedules: RecurringSchedule[];
  shifts: Shift[];
  feedback: VisitFeedback[];
  declines: ShiftDecline[];
  /** Pairs who have worked together before (continuity), as "clientId|caregiverId". */
  history: string[];
  /** Showcase anchors used by the guided tour. */
  demo: {
    calloutShiftId: string;
    calloutCaregiverId: string;
    heroClientId: string;
    heroCaregiverId: string;
    obviousPair: [string, string];
    trapPair: [string, string];
    healthPair: [string, string];
    jazzClientId: string;
    today: string;
  };
}
