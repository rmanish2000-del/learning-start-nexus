// Locks the Class 10 (2026-27) evidence-verification deliverables against the
// committed baselines and the live-database evidence export. Pure: reads files
// only, no network and no database.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ACTIVE_ACADEMIC_YEAR } from "@/lib/catalogue-shared";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

const crosswalk = read("EDUOS_CLASS_10_VERIFIED_CROSSWALK.json");
const conflicts = read("EDUOS_CLASS_10_GEMINI_CONFLICTS.json");
const register = read("EDUOS_CLASS_10_VERIFIED_GAP_REGISTER.json");
const spec = read("EDUOS_CLASS_10_QUESTION_GENERATION_SPEC.json");
const sources = read("content/compliance/class-10-2026-27.source-verification.json");
const evidence = read("content/compliance/class-10-2026-27.evidence.json");
const mathBaseline = read("audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.json");
const sciBaseline = read("audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.json");

type Row = {
  subject: string;
  official_requirement_id: string;
  eduos_unit_id: string | null;
  eduos_chapter_id: string | null;
  verdict: string;
  question_approved: number;
  question_verified: number;
  question_diagnostic_eligible: number;
};
const rows = crosswalk.rows as Row[];

describe("Phase 1 — official source verification", () => {
  it("retrieved both governing documents with checksums", () => {
    expect(sources.overallStatus).toBe("SOURCES_VERIFIED");
    expect(sources.sources).toHaveLength(2);
    for (const s of sources.sources) {
      expect(s.httpStatus).toBe(200);
      expect(s.byteLength).toBeGreaterThan(100_000);
      expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(s.officialUrl.startsWith("https://cbseacademic.nic.in/")).toBe(true);
      expect(s.probes.every((p: { result: string }) => p.result === "PASS")).toBe(true);
    }
  });

  it("keeps the PDFs out of the repository but pins their identity", () => {
    for (const s of sources.sources) expect(s.documentRetained).toBe(false);
  });

  it("records Periodic Classification as present, contradicting the baseline exclusion", () => {
    const science = sources.sources.find((s: { subject: string }) => s.subject === "Science");
    const probe = science.probes.find((p: { probeId: string }) => p.probeId === "RETAINED_PERIODIC_CLASSIFICATION");
    expect(probe.expect).toBe("present");
    expect(probe.found).toBe(true);
  });
});

describe("Phase 2 — requirement coverage", () => {
  it("covers every committed requirement exactly once", () => {
    const expected = [
      ...mathBaseline.requirements.map((r: { requirement_id: string }) => r.requirement_id),
      ...sciBaseline.requirements.map((r: { requirement_id: string }) => r.requirement_id),
    ];
    expect(rows).toHaveLength(84);
    expect(rows.map((r) => r.official_requirement_id).sort()).toEqual(expected.sort());
  });

  it("preserves the 38 / 46 subject split", () => {
    expect(rows.filter((r) => r.subject === "Mathematics")).toHaveLength(38);
    expect(rows.filter((r) => r.subject === "Science")).toHaveLength(46);
  });

  it("resolves a real unit and chapter for every requirement", () => {
    const unresolved = rows.filter((r) => !r.eduos_unit_id || !r.eduos_chapter_id);
    expect(unresolved.map((r) => r.official_requirement_id)).toEqual([]);
  });

  it("never reports more verified than approved questions", () => {
    for (const r of rows) {
      expect(r.question_diagnostic_eligible).toBeLessThanOrEqual(r.question_approved);
      expect(r.question_diagnostic_eligible).toBeLessThanOrEqual(r.question_verified);
    }
  });
});

describe("Phase 4, 5 and 6 — corrected findings", () => {
  const findings = conflicts.narrative_conflicts as { finding_id: string; resolution: string }[];
  const byId = (id: string) => findings.find((f) => f.finding_id === id);

  it("records the Meridian-pilot units as the real duplicated units", () => {
    expect(byId("FIND_MAT_MERIDIAN_PILOT_UNITS")?.resolution).toBe("RETIRE_DUPLICATE_PILOT_UNITS");
  });

  it("reclassifies Periodic Classification as retained formative-only", () => {
    expect(byId("FIND_SCI_PERIODIC_CLASSIFICATION")?.resolution).toBe("RETAINED_FORMATIVE_ONLY");
  });

  it("keeps the Science book unapproved", () => {
    const science = evidence.books.find((b: { title: string }) => b.title === "NCERT Class 10 Science (CBSE)");
    expect(science.status).toBe("processed");
  });

  it("applied the chapter spelling fix", () => {
    const titles = evidence.books.flatMap((b: { units: { chapters: { title: string }[] }[] }) =>
      b.units.flatMap((u) => u.chapters.map((c) => c.title)),
    );
    expect(titles).toContain("The Human Eye and the Colourful World");
    expect(titles).not.toContain("The Human Eye and the Colorful World");
  });
});

describe("Phase 7 — question depth", () => {
  it("uses the approved-and-verified intersection for eligibility", () => {
    expect(spec.depth_law.eligibility).toBe("status = 'approved' AND verification_state = 'verified'");
  });

  it("reports a real deficit against the governing books only", () => {
    const governing = spec.units.filter((u: { governing: boolean }) => u.governing);
    expect(governing.length).toBeGreaterThan(0);
    const total = governing.reduce((n: number, u: { deficit: number }) => n + u.deficit, 0);
    expect(spec.total_deficit).toBe(total);
    expect(spec.total_deficit).toBeGreaterThan(0);
  });

  it("never claims a reserve a unit does not have", () => {
    for (const u of spec.units) {
      expect(u.diagnostic_set + u.reassessment_reserve).toBe(u.diagnostic_eligible);
      expect(u.deficit).toBe(Math.max(u.required_diagnostic_eligible - u.diagnostic_eligible, 0));
    }
  });

  it("forbids generation for out-of-syllabus and formative-only content", () => {
    const text = spec.generation_constraints.join(" ");
    expect(text).toMatch(/frustum/i);
    expect(text).toMatch(/Euclid/i);
    expect(text).toMatch(/Periodic Classification/i);
    expect(text).toMatch(/NOT authorised/i);
  });
});

describe("verified gap register", () => {
  it("carries remediation for every gap", () => {
    expect(register.gaps.length).toBeGreaterThan(0);
    for (const g of register.gaps) {
      expect(g.gap_id).toMatch(/^VGAP-\d{3}$/);
      expect(String(g.remediation).length).toBeGreaterThan(10);
      expect(["BLOCKING", "MAJOR"]).toContain(g.severity);
    }
  });

  it("counts blocking gaps consistently", () => {
    expect(register.blocking_gaps).toBe(
      register.gaps.filter((g: { severity: string }) => g.severity === "BLOCKING").length,
    );
  });
});

describe("Phase 8 — academic-year labelling", () => {
  it("exposes the active session for learner-facing reports", () => {
    expect(ACTIVE_ACADEMIC_YEAR).toBe("2026-27");
    expect(evidence.academicYear).toBe(ACTIVE_ACADEMIC_YEAR);
  });

  it("labels the diagnostic report with the session", () => {
    const src = readFileSync(resolve(ROOT, "src/routes/diagnostic.report.$token.tsx"), "utf8");
    expect(src).toContain("ACTIVE_ACADEMIC_YEAR");
  });
});
