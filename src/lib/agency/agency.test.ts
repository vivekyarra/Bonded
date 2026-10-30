import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bookedHours, busySlots, checkEligibility } from "../matcher/constraints";
import { byId, openSchedules } from "./query";
import { addDays, buildSunrise } from "./sunrise";

const TODAY = "2026-10-30";
const agency = buildSunrise(TODAY);
const q = byId(agency);

describe("Sunrise Home Care synthetic agency", () => {
  it("has 40 caregivers and 60 clients with realistic ages", () => {
    expect(agency.caregivers).toHaveLength(40);
    expect(agency.clients).toHaveLength(60);
    expect(agency.caregivers.every((c) => c.age >= 19 && c.age <= 58)).toBe(true);
    expect(agency.clients.every((c) => c.age >= 68 && c.age <= 97)).toBe(true);
    expect(new Set(agency.caregivers.map((c) => c.id)).size).toBe(40);
    expect(new Set(agency.clients.map((c) => c.id)).size).toBe(60);
  });

  it("gives everyone 3–8 favourites", () => {
    for (const p of [...agency.caregivers, ...agency.clients]) {
      expect(p.seeds.length).toBeGreaterThanOrEqual(3);
      expect(p.seeds.length).toBeLessThanOrEqual(8);
    }
  });

  it("has exactly 6 open schedules for the Match Board", () => {
    expect(openSchedules(agency)).toHaveLength(6);
  });

  it("is deterministic for a given day", () => {
    expect(JSON.stringify(buildSunrise(TODAY))).toBe(JSON.stringify(agency));
  });

  it("only assigns regular caregivers who pass every hard constraint", () => {
    for (const sh of agency.shifts.filter((s) => s.status === "assigned")) {
      const cg = q.caregiver(sh.caregiverId!);
      const res = checkEligibility(cg, q.client(sh.clientId), sh, {
        bookedHours: bookedHours(agency.shifts, cg.id, sh.date, sh.id),
        busy: busySlots(agency.shifts, cg.id, sh.id),
      });
      expect(res.reasons, `${sh.id} → ${cg.id}`).toEqual([]);
    }
  });

  it("has tomorrow's call-out shift for Dolores with Rosa as the regular", () => {
    const sh = q.shift(agency.demo.calloutShiftId);
    expect(sh.date).toBe(addDays(TODAY, 1));
    expect(sh.clientId).toBe("c01");
    expect(sh.caregiverId).toBe("cg01");
  });

  it("includes a match trending down for the health demo", () => {
    const fb = agency.feedback.filter((f) => f.clientId === "c05" && f.caregiverId === "cg06");
    expect(fb.at(-1)!.rating).toBe(-1);
  });
});

describe("protected-trait firewall", () => {
  const root = path.resolve(__dirname, "..");
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? files(path.join(dir, d.name)) : d.name.endsWith(".ts") && !d.name.endsWith(".test.ts") ? [path.join(dir, d.name)] : [],
    );

  it("matching, scoring and agent code never import audit demographics", () => {
    for (const dir of ["matcher", "compat", "agent", "qloo"]) {
      const full = path.join(root, dir);
      if (!fs.existsSync(full)) continue;
      for (const f of files(full)) {
        expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/audit\/demographics|auditDemographics/);
      }
    }
  });

  it("intake data has no race, ethnicity, religion or national-origin fields", () => {
    const src = fs.readFileSync(path.join(root, "agency", "types.ts"), "utf8");
    expect(src).not.toMatch(/\b(race|ethnicity|religion|nationality|national_origin)\b/i);
  });
});
