// Verifies the portable Class 10 (2026-27) Gemini review bundle: file
// existence, strict JSON parsing, duplicate keys, manifest hash agreement,
// crosswalk completeness/reconciliation, and privacy/secret scans.

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const BUNDLE = resolve(ROOT, "review-bundles/class10-2026-27-gemini");
const read = (rel: string) => readFileSync(resolve(BUNDLE, rel), "utf8");
const json = (rel: string) => JSON.parse(read(rel));

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [relative(BUNDLE, join(dir, e.name))],
  );

const manifest = json("GEMINI_REVIEW_BUNDLE_MANIFEST.json");

describe("gemini review bundle — structure", () => {
  it("contains the three bundle control files", () => {
    for (const f of ["GEMINI_REVIEW_BUNDLE_MANIFEST.json", "GEMINI_REVIEW_BUNDLE_README.md", "GEMINI_REVIEW_BUNDLE_INTEGRITY.sha256"]) {
      expect(existsSync(resolve(BUNDLE, f)), f).toBe(true);
    }
  });

  it("contains every required committed input file", () => {
    const required = [
      "baseline/cbse-class10-mathematics-2026-27-baseline.json",
      "baseline/cbse-class10-mathematics-2026-27-baseline.schema.json",
      "baseline/mathematics-baseline-file-validation.json",
      "baseline/cbse-class10-science-2026-27-baseline.json",
      "baseline/cbse-class10-science-2026-27-baseline.schema.json",
      "baseline/science-baseline-file-validation.json",
      "baseline/EDUOS_CLASS_10_BASELINE_FILE_PACKAGE_REPORT.md",
      "evidence/EDUOS_CLASS_10_2026_27_COMPLETE_COVERAGE_AUDIT.md",
      "evidence/EDUOS_CLASS_10_MATHEMATICS_CROSSWALK.md",
      "evidence/EDUOS_CLASS_10_SCIENCE_CROSSWALK.md",
      "evidence/EDUOS_CLASS_10_OUTCOME_ATOM_MATRIX.md",
      "evidence/EDUOS_CLASS_10_QUESTION_DEPTH_AND_REASSESSMENT_MATRIX.md",
      "evidence/EDUOS_CLASS_10_GAP_REGISTER.md",
      "evidence/class-10-2026-27.crosswalk.json",
      "evidence/cbse-2026-27.sources.json",
      "exports/baseline-to-eduos-crosswalk.json",
      "exports/question-depth-and-reassessment-evidence.json",
      "exports/compliance-gate-result.json",
      "exports/official-source-registry-status.json",
      "exports/limitations-and-reconciliation.json",
    ];
    for (const f of required) expect(existsSync(resolve(BUNDLE, f)), f).toBe(true);
    expect(manifest.files_missing).toEqual([]);
  });

  it("copies the committed baseline files byte-for-byte", () => {
    const pairs: [string, string][] = [
      ["baseline/cbse-class10-mathematics-2026-27-baseline.json", "audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.json"],
      ["baseline/cbse-class10-science-2026-27-baseline.json", "audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.json"],
      ["evidence/class-10-2026-27.snapshot.json", "content/compliance/class-10-2026-27.snapshot.json"],
    ];
    for (const [inBundle, src] of pairs) {
      expect(readFileSync(resolve(BUNDLE, inBundle))).toEqual(readFileSync(resolve(ROOT, src)));
    }
  });
});

describe("gemini review bundle — integrity", () => {
  it("manifest hashes and sizes match the saved bytes", () => {
    for (const f of manifest.files) {
      const bytes = readFileSync(resolve(BUNDLE, f.path));
      expect(createHash("sha256").update(bytes).digest("hex"), f.path).toBe(f.sha256);
      expect(statSync(resolve(BUNDLE, f.path)).size, f.path).toBe(f.bytes);
    }
  });

  it("manifest covers every bundle file except the manifest and integrity list", () => {
    const onDisk = walk(BUNDLE)
      .filter((p) => p !== "GEMINI_REVIEW_BUNDLE_MANIFEST.json" && p !== "GEMINI_REVIEW_BUNDLE_INTEGRITY.sha256")
      .sort();
    expect(manifest.files.map((f: { path: string }) => f.path).sort()).toEqual(onDisk);
  });

  it("integrity checklist agrees with the manifest", () => {
    const lines = read("GEMINI_REVIEW_BUNDLE_INTEGRITY.sha256").trim().split("\n");
    expect(lines.length).toBe(manifest.files.length);
    for (const line of lines) {
      const [hash, path] = line.split("  ");
      const entry = manifest.files.find((f: { path: string }) => f.path === path);
      expect(entry, path).toBeTruthy();
      expect(entry.sha256).toBe(hash);
    }
  });

  it("every manifest entry carries provenance metadata", () => {
    for (const f of manifest.files) {
      expect(f.content_category).toBeTruthy();
      expect(f.source_provenance).toBeTruthy();
      expect(f.privacy_classification).toBeTruthy();
      expect(Number.isNaN(Date.parse(f.extraction_timestamp))).toBe(false);
    }
    expect(manifest.provenance.repository_full_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.provenance.query_or_script).toBe("scripts/compliance/gemini-bundle.ts");
    expect(manifest.provenance.limitations.length).toBeGreaterThan(0);
  });
});

describe("gemini review bundle — json hygiene", () => {
  const jsonFiles = walk(BUNDLE).filter((p) => p.endsWith(".json"));

  it("every JSON file parses strictly", () => {
    expect(jsonFiles.length).toBeGreaterThan(0);
    for (const p of jsonFiles) expect(() => JSON.parse(read(p)), p).not.toThrow();
  });

  it("no JSON object contains duplicate keys", () => {
    for (const p of jsonFiles) expect(findDuplicateKeys(read(p)), p).toEqual([]);
  });
});

describe("gemini review bundle — crosswalk contract", () => {
  const cw = json("exports/baseline-to-eduos-crosswalk.json");
  const math = JSON.parse(readFileSync(resolve(ROOT, "audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.json"), "utf8"));
  const sci = JSON.parse(readFileSync(resolve(ROOT, "audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.json"), "utf8"));

  it("emits exactly one row per official requirement, none omitted", () => {
    const ids = cw.rows.map((r: { official_requirement_id: string }) => r.official_requirement_id);
    expect(new Set(ids).size).toBe(ids.length);
    const expected = [...math.requirements, ...sci.requirements].map((r: { requirement_id: string }) => r.requirement_id);
    expect(ids.sort()).toEqual(expected.sort());
  });

  it("reconciles requirement counts with the baselines", () => {
    expect(cw.rows.filter((r: { subject: string }) => r.subject === "Mathematics").length).toBe(math.total_requirements);
    expect(cw.rows.filter((r: { subject: string }) => r.subject === "Science").length).toBe(sci.total_requirements);
  });

  it("every row carries the full contract with null for missing mappings", () => {
    const keys = [
      "subject", "academic_year", "official_requirement_id", "official_unit", "official_chapter", "official_topic",
      "eduos_unit_id", "eduos_unit_title", "eduos_chapter_id", "eduos_chapter_title", "eduos_topic_id", "eduos_topic_title",
      "outcome_ids", "atom_ids", "approved_question_count", "verified_question_count", "diagnostic_target",
      "reassessment_reserve", "source_mapping_status", "human_review_status", "current_verdict", "evidence_reference",
    ];
    for (const row of cw.rows) for (const k of keys) expect(Object.prototype.hasOwnProperty.call(row, k), `${row.official_requirement_id}.${k}`).toBe(true);
  });

  it("preserves SOURCE_PENDING and unreviewed status", () => {
    expect(cw.class_10_compliance_status).toBe("SOURCE_PENDING");
    expect(json("exports/compliance-gate-result.json").class_10_compliance_status).toBe("SOURCE_PENDING");
    for (const row of cw.rows) expect(row.human_review_status).toBe("NOT_REVIEWED_BY_NAMED_SUBJECT_EXPERT");
  });
});

describe("gemini review bundle — depth evidence", () => {
  const depth = json("exports/question-depth-and-reassessment-evidence.json");

  it("provides all five depth levels", () => {
    for (const k of ["subject_level", "unit_level", "official_requirement_level", "outcome_level"]) {
      expect(Array.isArray(depth[k]), k).toBe(true);
      expect(depth[k].length, k).toBeGreaterThan(0);
    }
    expect(depth.atom_level.rows.length).toBeGreaterThan(0);
  });

  it("includes Coordinate Geometry, Chemical Substances and both Meridian pilot units", () => {
    const titles = depth.unit_level.map((u: { unit_title: string }) => u.unit_title);
    expect(titles).toContain("Coordinate Geometry");
    expect(titles).toContain("Chemical Substances - Nature and Behaviour");
    for (const t of ["Unit 1 — Number Systems", "Unit 2 — Algebra"]) expect(titles).toContain(t);
    const meridian = depth.unit_level.filter((u: { meridian_pilot_unit: boolean }) => u.meridian_pilot_unit);
    expect(meridian.length).toBe(2);
  });

  it("reports reassessment reserve for every unit", () => {
    for (const u of depth.unit_level) {
      expect(typeof u.reassessment_reserve).toBe("number");
      expect(typeof u.fresh_reassessment_ready).toBe("boolean");
    }
  });
});

describe("gemini review bundle — privacy and secrets", () => {
  const files = walk(BUNDLE);
  const texts = files.map((p) => [p, read(p)] as const);

  it("contains no email addresses or phone numbers", () => {
    for (const [p, t] of texts) {
      expect(t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [], p).toEqual([]);
      expect(t.match(/(?:\+91[\s-]?)?\b[6-9]\d{9}\b/g) ?? [], p).toEqual([]);
    }
  });

  it("contains no secrets, credentials or tokens", () => {
    const patterns: [string, RegExp][] = [
      ["supabase key", /sb_(publishable|secret)_[A-Za-z0-9_-]+/],
      ["jwt", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
      ["postgres url", /postgres(ql)?:\/\//i],
      ["service role", /service_role_key|SUPABASE_SERVICE_ROLE/i],
      ["razorpay", /rzp_(test|live)_[A-Za-z0-9]+/],
      ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
      ["bearer token", /Bearer\s+[A-Za-z0-9._-]{20,}/],
    ];
    for (const [p, t] of texts) for (const [name, re] of patterns) expect(re.test(t), `${p}: ${name}`).toBe(false);
  });

  it("contains no learner or parent personal data fields", () => {
    const forbidden = /\b(learner_name|student_name|parent_name|guardian_name|parent_email|phone_number|date_of_birth|payment_id|order_ref)\b/i;
    for (const [p, t] of texts) expect(forbidden.test(t), p).toBe(false);
  });

  it("references only public official URLs", () => {
    for (const [p, t] of texts) {
      for (const url of t.match(/https?:\/\/[^\s"'),]+/g) ?? []) {
        expect(/^https?:\/\/(cbseacademic\.nic\.in|ncert\.nic\.in|www\.cbse\.gov\.in|cbse\.gov\.in|json-schema\.org|www\.eduos\.global)/.test(url), `${p}: ${url}`).toBe(true);
      }
    }
  });
});
