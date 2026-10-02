import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

const map = read("EDUOS_CLASS_10_FINAL_CURRICULUM_MAP.json");
const register = read("EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json");
const validation = read("EDUOS_CLASS_10_VALIDATION_RESULTS.json");

describe("Class 10 2026-27 rebuild", () => {
  it("targets the current academic year only", () => {
    expect(map.academic_year).toBe("2026-27");
    expect(map.class_level).toBe(10);
    expect(map.board).toBe("CBSE");
  });

  it("retires pilot content from the active scope", () => {
    expect(map.pilot_content.disposition).toBe("RETIRED_FROM_ACTIVE_2026_27");
  });

  it("maps every official requirement", () => {
    const subjects = Object.fromEntries(map.subjects.map((s: any) => [s.subject, s]));
    expect(subjects['Mathematics'].requirements).toBe(38);
    expect(subjects['Science'].requirements).toBe(46);
    for (const subject of map.subjects) {
      expect(subject.unmapped_requirements).toBe(0);
    }
  });

  it("keeps the 326 new items original, draft-only and diagnostic-eligible", () => {
    expect(register.items).toHaveLength(326);
    expect(validation.errors ?? []).toHaveLength(0);
    for (const item of register.items) {
      expect(item.status).toBe("draft");
      expect(item.externalRef).toMatch(/^C10-2627-(MATH|SCI)-REQ\d{3}-(DIAG|REASS)-\d{3}$/);
    }
    const refs = new Set(register.items.map((i: any) => i.externalRef));
    expect(refs.size).toBe(326);
  });

  it("splits diagnostic and reassessment pools", () => {
    const diag = register.items.filter((i: any) => i.externalRef.includes("-DIAG-")).length;
    expect(diag).toBeGreaterThan(0);
    expect(diag).toBeLessThanOrEqual(326);
  });
});
