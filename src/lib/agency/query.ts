import { WEEKDAY_SHORT, type Agency, type Caregiver, type Client, type RecurringSchedule, type Shift } from "./types";

export const clientName = (c: Client) => `${c.firstName} ${c.lastName}`;
export const caregiverName = (g: Caregiver) => `${g.firstName} ${g.lastInitial}.`;
/** "Mrs Alvarez"-style is avoided: we don't infer titles. First name + surname. */
export const clientShort = (c: Client) => `${c.firstName} ${c.lastName.charAt(0)}.`;

export function byId(agency: Agency) {
  const clients = new Map(agency.clients.map((c) => [c.id, c]));
  const caregivers = new Map(agency.caregivers.map((g) => [g.id, g]));
  return {
    client: (id: string) => {
      const c = clients.get(id);
      if (!c) throw new Error(`Unknown client ${id}`);
      return c;
    },
    caregiver: (id: string) => {
      const g = caregivers.get(id);
      if (!g) throw new Error(`Unknown caregiver ${id}`);
      return g;
    },
    shift: (id: string): Shift => {
      const s = agency.shifts.find((x) => x.id === id);
      if (!s) throw new Error(`Unknown shift ${id}`);
      return s;
    },
    schedule: (id: string): RecurringSchedule => {
      const s = agency.schedules.find((x) => x.id === id);
      if (!s) throw new Error(`Unknown schedule ${id}`);
      return s;
    },
  };
}

export const scheduleLabel = (sc: RecurringSchedule) =>
  `${sc.weekdays.length === 7 ? "Daily" : sc.weekdays.map((d) => WEEKDAY_SHORT[d]).join("/")} · ${
    { morning: "9am–1pm", afternoon: "1–5pm", evening: "5–9pm" }[sc.block]
  }`;

export function shiftLabel(sh: Shift): string {
  const d = new Date(`${sh.date}T12:00:00Z`);
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  return `${day}, ${{ morning: "9am–1pm", afternoon: "1–5pm", evening: "5–9pm" }[sh.block]}`;
}

export const openSchedules = (agency: Agency) => agency.schedules.filter((s) => !s.caregiverId);

export const workedTogether = (agency: Agency, clientId: string, caregiverId: string) =>
  agency.history.includes(`${clientId}|${caregiverId}`);
