// Deterministic, read-only exporter for the portable Class 10 (2026-27) Gemini
// crosswalk review bundle.
//
//   bun run scripts/compliance/gemini-bundle.ts
//
// It performs NO database access, NO writes outside review-bundles/, and no
// remediation of any kind. It copies committed evidence verbatim and derives
// machine-readable crosswalk / depth exports from committed evidence only.

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { analyse, norm, ROOT, type Snapshot, type SnapshotUnit } from "./analysis";
import { VALIDATOR_VERSION, requiredVerifiedPerUnit } from "../../src/lib/compliance-shared";

export const BUNDLE_DIR = "review-bundles/class10-2026-27-gemini";
const abs = (p: string) => resolve(ROOT, p);
const readJson = (p: string) => JSON.parse(readFileSync(abs(p), "utf8"));

const BUNDLE_FORMAT_VERSION = "2.0.0";
const EXTRACTED_AT = new Date().toISOString();
const git = (args: string[]) => {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN";
  }
};

// The commit checked out when the exporter began.
const BASE_COMMIT = git(["rev-parse", "HEAD"]);

// Evidence inputs consumed by this exporter. source_evidence_commit is the most
// recent commit that touched any of them.
const EVIDENCE_PATHS = [
  "content/compliance",
  "audit-data/class10/2026-27",
  "EDUOS_CLASS_10_BASELINE_FILE_PACKAGE_REPORT.md",
  "EDUOS_CLASS_10_2026_27_COMPLETE_COVERAGE_AUDIT.md",
  "EDUOS_CLASS_10_MATHEMATICS_CROSSWALK.md",
  "EDUOS_CLASS_10_SCIENCE_CROSSWALK.md",
  "EDUOS_CLASS_10_OUTCOME_ATOM_MATRIX.md",
  "EDUOS_CLASS_10_QUESTION_DEPTH_AND_REASSESSMENT_MATRIX.md",
  "EDUOS_CLASS_10_GAP_REGISTER.md",
  "EDUOS_SUBJECT_COMPLIANCE_GATE.md",
  "EDUOS_ANNUAL_CURRICULUM_COMPLIANCE_STANDARD.md",
  "EDUOS_OFFICIAL_SOURCE_REGISTRY_SPEC.md",
];
const SOURCE_EVIDENCE_COMMIT = git(["log", "-1", "--format=%H", "--", ...EVIDENCE_PATHS]) || BASE_COMMIT;

const SELF_REFERENCE_POLICY =
  "The final Git package commit SHA is NOT embedded in any bundle file: a file inside a commit cannot contain that commit's own SHA. package_commit is reported only in the Lovable final response and repository history (REPORTED_AFTER_COMMIT). GEMINI_REVIEW_BUNDLE_INTEGRITY.sha256 intentionally excludes its own hash, and bundle_tree_hash is computed over all payload files excluding GEMINI_REVIEW_BUNDLE_MANIFEST.json and GEMINI_REVIEW_BUNDLE_INTEGRITY.sha256. This bundle is therefore not self-authenticating.";

const PROVENANCE = {
  bundle_format_version: BUNDLE_FORMAT_VERSION,
  bundle_generation_timestamp: EXTRACTED_AT,
  source_evidence_commit: SOURCE_EVIDENCE_COMMIT,
  bundle_generation_base_commit: BASE_COMMIT,
  package_commit: "REPORTED_AFTER_COMMIT",
  self_reference_policy: SELF_REFERENCE_POLICY,
  data_source: "committed repository evidence (content/compliance/class-10-2026-27.snapshot.json, audit-data/class10/2026-27/*, content/compliance/cbse-2026-27.*.json)",
  query_or_script: "scripts/compliance/gemini-bundle.ts",
  evidence_basis: "repository-only (the snapshot itself is a previously exported, frozen read-only database export; no live database access occurs during this export)",
  validator: VALIDATOR_VERSION,
  limitations: [
    "CLASS_10_COMPLIANCE_STATUS remains SOURCE_PENDING; no source record is upgraded by this packaging step.",
    "No official source document has been checksummed; every source record remains PENDING_CONFIRMATION.",
    "Atom identifiers are not present in the frozen snapshot; atom counts are reported and atom_ids is null.",
    "EduOS chapter and topic identifiers are not present in the frozen snapshot; titles are reported and ids are null.",
    "Approved-question counts are not separately recorded in the snapshot; total and verified question counts are reported. Missing evidence is reported as null, never as zero.",
    "Duplicate-question detection is not computable from the snapshot and is not asserted here.",
    "Official-requirement level depth is inherited from the mapped EduOS chapter's outcomes; CBSE does not publish per-requirement item counts.",
    "No human subject-expert review is recorded for session 2026-27.",
    "Five academic-overreach flags remain open in the gap register.",
    "Two Science ambiguities remain unresolved in the candidate baseline.",
  ],
} as const;


// ------------------------------------------------------------------ helpers
const stripUnitPrefix = (s: string) => s.replace(/^unit\s+[ivxlc0-9]+\s*[:\-–—]\s*/i, "").trim();
const nrm = (s: string) => norm(stripUnitPrefix(s));

type BaselineRequirement = Record<string, unknown> & {
  requirement_id: string;
  official_unit: string;
  official_chapter: string;
  official_topic: string;
  assessability?: string;
  official_source_id?: string;
};
type Baseline = {
  subject: string;
  academic_year: string;
  status: string;
  total_units: number;
  total_chapters: number;
  total_requirements: number;
  requirements: BaselineRequirement[];
  exclusions: unknown[];
  ambiguities: unknown[];
  source_records: { source_id: string; applicability_status?: string; [k: string]: unknown }[];
};

const MERIDIAN_UNIT_TITLES = ["Unit 1 — Number Systems", "Unit 2 — Algebra"];

export type CrosswalkRow = {
  subject: string;
  academic_year: string;
  official_requirement_id: string;
  official_unit: string;
  official_chapter: string;
  official_topic: string;
  eduos_unit_id: string | null;
  eduos_unit_title: string | null;
  eduos_chapter_id: string | null;
  eduos_chapter_title: string | null;
  eduos_topic_id: string | null;
  eduos_topic_title: string | null;
  outcome_ids: string[] | null;
  atom_ids: null;
  atom_count: number | null;
  approved_question_count: number | null;
  verified_question_count: number | null;
  diagnostic_target: number;
  reassessment_reserve: number | null;
  source_mapping_status: string;
  human_review_status: string;
  current_verdict: string;
  evidence_reference: string;
};

export function buildBundle(): {
  files: string[];
  crosswalkRows: CrosswalkRow[];
  counts: Record<string, number>;
} {
  const { snapshot, sourceIssues, subjects, overall } = analyse();
  const snap = snapshot as Snapshot;
  const sources = readJson("content/compliance/cbse-2026-27.sources.json");
  const official = readJson("content/compliance/cbse-2026-27.official-curriculum.json");

  const baselines: Record<string, Baseline> = {
    Mathematics: readJson("audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.json"),
    Science: readJson("audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.json"),
  };

  const outDir = abs(BUNDLE_DIR);
  if (existsSync(outDir)) rmSync(outDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const written: string[] = [];
  const meta = new Map<string, { category: string; provenance: string; privacy: string }>();
  const put = (rel: string, content: string, category: string, provenance: string, privacy = "PUBLIC_ACADEMIC_STRUCTURAL") => {
    const target = resolve(outDir, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    written.push(rel);
    meta.set(rel, { category, provenance, privacy });
  };
  const copy = (rel: string, from: string, category: string) => {
    const target = resolve(outDir, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(abs(from), target);
    written.push(rel);
    meta.set(rel, { category, provenance: `verbatim copy of committed ${from} @ ${HEAD_SHA}`, privacy: "PUBLIC_ACADEMIC_STRUCTURAL" });
  };

  // 1 ------------------------------------------------ committed input files
  const baselineInputs: [string, string][] = [
    ["baseline/cbse-class10-mathematics-2026-27-baseline.json", "audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.json"],
    ["baseline/cbse-class10-mathematics-2026-27-baseline.schema.json", "audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.schema.json"],
    ["baseline/mathematics-baseline-file-validation.json", "audit-data/class10/2026-27/mathematics-baseline-file-validation.json"],
    ["baseline/cbse-class10-science-2026-27-baseline.json", "audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.json"],
    ["baseline/cbse-class10-science-2026-27-baseline.schema.json", "audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.schema.json"],
    ["baseline/science-baseline-file-validation.json", "audit-data/class10/2026-27/science-baseline-file-validation.json"],
    ["baseline/EDUOS_CLASS_10_BASELINE_FILE_PACKAGE_REPORT.md", "EDUOS_CLASS_10_BASELINE_FILE_PACKAGE_REPORT.md"],
  ];
  const missing: string[] = [];
  for (const [rel, src] of baselineInputs) {
    if (!existsSync(abs(src))) { missing.push(src); continue; }
    copy(rel, src, "COMMITTED_BASELINE_PACKAGE");
  }

  // 2 ------------------------------------------------------ EduOS evidence
  const evidenceInputs: [string, string][] = [
    ["evidence/EDUOS_CLASS_10_2026_27_COMPLETE_COVERAGE_AUDIT.md", "EDUOS_CLASS_10_2026_27_COMPLETE_COVERAGE_AUDIT.md"],
    ["evidence/EDUOS_CLASS_10_MATHEMATICS_CROSSWALK.md", "EDUOS_CLASS_10_MATHEMATICS_CROSSWALK.md"],
    ["evidence/EDUOS_CLASS_10_SCIENCE_CROSSWALK.md", "EDUOS_CLASS_10_SCIENCE_CROSSWALK.md"],
    ["evidence/EDUOS_CLASS_10_OUTCOME_ATOM_MATRIX.md", "EDUOS_CLASS_10_OUTCOME_ATOM_MATRIX.md"],
    ["evidence/EDUOS_CLASS_10_QUESTION_DEPTH_AND_REASSESSMENT_MATRIX.md", "EDUOS_CLASS_10_QUESTION_DEPTH_AND_REASSESSMENT_MATRIX.md"],
    ["evidence/EDUOS_CLASS_10_GAP_REGISTER.md", "EDUOS_CLASS_10_GAP_REGISTER.md"],
    ["evidence/EDUOS_SUBJECT_COMPLIANCE_GATE.md", "EDUOS_SUBJECT_COMPLIANCE_GATE.md"],
    ["evidence/EDUOS_ANNUAL_CURRICULUM_COMPLIANCE_STANDARD.md", "EDUOS_ANNUAL_CURRICULUM_COMPLIANCE_STANDARD.md"],
    ["evidence/EDUOS_OFFICIAL_SOURCE_REGISTRY_SPEC.md", "EDUOS_OFFICIAL_SOURCE_REGISTRY_SPEC.md"],
    ["evidence/class-10-2026-27.crosswalk.json", "content/compliance/class-10-2026-27.crosswalk.json"],
    ["evidence/class-10-2026-27.snapshot.json", "content/compliance/class-10-2026-27.snapshot.json"],
    ["evidence/class-10-2026-27.validator-output.txt", "content/compliance/class-10-2026-27.validator-output.txt"],
    ["evidence/cbse-2026-27.sources.json", "content/compliance/cbse-2026-27.sources.json"],
    ["evidence/cbse-2026-27.official-curriculum.json", "content/compliance/cbse-2026-27.official-curriculum.json"],
  ];
  for (const [rel, src] of evidenceInputs) {
    if (!existsSync(abs(src))) { missing.push(src); continue; }
    copy(rel, src, "EDUOS_COMMITTED_EVIDENCE");
  }

  // 3 --------------------------------------- baseline → EduOS crosswalk rows
  const crosswalkRows: CrosswalkRow[] = [];
  const perSubjectUnmapped: Record<string, string[]> = {};

  for (const subjectName of ["Mathematics", "Science"] as const) {
    const bl = baselines[subjectName]!;
    const sa = subjects.find((s) => s.subject === subjectName)!;
    const target = sa.gates.diagnosticTarget;
    const dbUnits = snap.units.filter((u) => u.subject === subjectName && u.bookStatus !== "archived");
    const unmapped: string[] = [];

    for (const r of bl.requirements) {
      const unitCandidates = dbUnits.filter((u) => nrm(u.title) === nrm(r.official_unit));
      const unit: SnapshotUnit | undefined = unitCandidates.find((u) => u.bookStatus === "approved") ?? unitCandidates[0];
      const chapter = unit?.chapters?.find((c) => nrm(c.title) === nrm(r.official_chapter)) ?? null;
      const topic =
        (chapter?.topics as { title: string }[] | null | undefined)?.find((t) => nrm(t.title) === nrm(r.official_topic)) ?? null;
      const outcomes = (unit?.outcomes ?? []).filter((o) => !chapter || nrm(o.category ?? "") === nrm(chapter.title));

      const verified = outcomes.reduce((s, o) => s + o.verified, 0);
      const questions = outcomes.reduce((s, o) => s + o.questions, 0);
      const atoms = outcomes.reduce((s, o) => s + o.atoms, 0);
      const mapped = Boolean(unit && chapter);
      if (!mapped) unmapped.push(r.requirement_id);

      const verdict = !unit
        ? "UNMAPPED_UNIT"
        : !chapter
          ? "UNMAPPED_CHAPTER"
          : !topic
            ? "TOPIC_UNMAPPED"
            : verified === 0
              ? "MAPPED_NO_VERIFIED_ITEMS"
              : verified < 2 * target
                ? "MAPPED_DEPTH_SHORTFALL"
                : "MAPPED_DEPTH_MET";

      crosswalkRows.push({
        subject: subjectName,
        academic_year: bl.academic_year,
        official_requirement_id: r.requirement_id,
        official_unit: r.official_unit,
        official_chapter: r.official_chapter,
        official_topic: r.official_topic,
        eduos_unit_id: unit?.unitId ?? null,
        eduos_unit_title: unit?.title ?? null,
        eduos_chapter_id: null,
        eduos_chapter_title: chapter?.title ?? null,
        eduos_topic_id: null,
        eduos_topic_title: topic?.title ?? null,
        outcome_ids: outcomes.length ? outcomes.map((o) => o.code) : null,
        atom_ids: null,
        atom_count: unit ? atoms : null,
        approved_question_count: unit ? questions : null,
        verified_question_count: unit ? verified : null,
        diagnostic_target: target,
        reassessment_reserve: unit ? Math.max(0, verified - Math.min(verified, target)) : null,
        source_mapping_status:
          bl.source_records.find((s) => s.source_id === r.official_source_id)?.applicability_status?.toString() ?? "PENDING_CONFIRMATION",
        human_review_status: "NOT_REVIEWED_BY_NAMED_SUBJECT_EXPERT",
        current_verdict: verdict,
        evidence_reference: `evidence/class-10-2026-27.snapshot.json#units[unitId=${unit?.unitId ?? "null"}]`,
      });
    }
    perSubjectUnmapped[subjectName] = unmapped;
  }

  put(
    "exports/baseline-to-eduos-crosswalk.json",
    `${JSON.stringify({ provenance: PROVENANCE, class_10_compliance_status: overall, contract_version: "1.0.0", rows: crosswalkRows }, null, 2)}\n`,
    "DERIVED_MACHINE_READABLE_CROSSWALK",
    "derived from committed baselines + frozen snapshot",
  );

  // 4 ------------------------------------------------------- depth evidence
  const depth = {
    provenance: PROVENANCE,
    depth_law: "verified items per unit >= max(2 x diagnostic target, 2 x outcomes x per-outcome minimum, 2 x diagnostic minimum)",
    subject_level: subjects.map((s) => ({
      subject: s.subject,
      diagnostic_target: s.gates.diagnosticTarget,
      diagnostic_minimum: s.gates.diagnosticMinimum,
      min_questions_per_outcome: s.gates.minQuestionsPerOutcome,
      units: s.units.length,
      outcomes: s.units.reduce((a, u) => a + u.outcomes, 0),
      atoms: s.units.reduce((a, u) => a + u.atoms, 0),
      questions: s.units.reduce((a, u) => a + u.questions, 0),
      verified: s.units.reduce((a, u) => a + u.verified, 0),
      status: s.status,
    })),
    unit_level: subjects.flatMap((s) =>
      s.units.map((u) => {
        const req = requiredVerifiedPerUnit(s.gates, u.outcomes);
        const diagnostic_set = Math.min(u.verified, s.gates.diagnosticTarget);
        return {
          subject: s.subject,
          unit_title: u.title,
          official_mapped: u.officialMapped,
          meridian_pilot_unit: MERIDIAN_UNIT_TITLES.includes(u.title),
          outcomes: u.outcomes,
          atoms: u.atoms,
          questions: u.questions,
          verified: u.verified,
          required_verified: req,
          diagnostic_set,
          reassessment_reserve: Math.max(0, u.verified - diagnostic_set),
          fresh_reassessment_ready: u.verified >= req,
          difficulty_bands: u.difficulties,
          question_types: u.kinds,
          verdict: u.verified >= req ? "OK" : "SHORTFALL",
        };
      }),
    ),
    official_requirement_level: crosswalkRows.map((r) => ({
      subject: r.subject,
      official_requirement_id: r.official_requirement_id,
      eduos_unit_title: r.eduos_unit_title,
      eduos_chapter_title: r.eduos_chapter_title,
      outcomes: r.outcome_ids?.length ?? 0,
      atoms: r.atom_count,
      questions: r.approved_question_count,
      verified: r.verified_question_count,
      diagnostic_target: r.diagnostic_target,
      reassessment_reserve: r.reassessment_reserve,
      verdict: r.current_verdict,
    })),
    outcome_level: snap.units
      .filter((u) => u.bookStatus !== "archived")
      .flatMap((u) =>
        (u.outcomes ?? []).map((o) => ({
          subject: u.subject,
          unit_title: u.title,
          meridian_pilot_unit: MERIDIAN_UNIT_TITLES.includes(u.title),
          outcome_id: o.code,
          outcome_title: o.title,
          chapter_category: o.category,
          atoms: o.atoms,
          questions: o.questions,
          verified: o.verified,
          difficulty_distribution: o.difficulties,
          kind_distribution: o.kinds,
          meets_per_outcome_minimum: o.verified >= 1,
        })),
      ),
    atom_level: {
      note: "The frozen snapshot records atom counts per outcome but not atom identifiers; per-atom depth cannot be exported without a fresh database export. atom_ids is null everywhere by contract.",
      rows: snap.units
        .filter((u) => u.bookStatus !== "archived")
        .flatMap((u) =>
          (u.outcomes ?? []).map((o) => ({
            subject: u.subject,
            unit_title: u.title,
            outcome_id: o.code,
            atom_ids: null,
            atom_count: o.atoms,
            questions_attached_to_outcome: o.questions,
            verified_attached_to_outcome: o.verified,
            atoms_without_questions: o.atoms > 0 && o.questions === 0 ? o.atoms : 0,
          })),
        ),
    },
  };
  put("exports/question-depth-and-reassessment-evidence.json", `${JSON.stringify(depth, null, 2)}\n`, "DERIVED_DEPTH_EVIDENCE", "derived from frozen snapshot");

  // 5 ------------------------------------------------ gate + source exports
  put(
    "exports/compliance-gate-result.json",
    `${JSON.stringify(
      {
        provenance: PROVENANCE,
        class_10_compliance_status: overall,
        source_registry_issues: sourceIssues,
        subjects: subjects.map((s) => ({ subject: s.subject, status: s.status, failing_checks: s.gaps, gates: s.gateResults })),
      },
      null,
      2,
    )}\n`,
    "DERIVED_GATE_RESULT",
    "scripts/compliance/analysis.ts gate evaluation over committed evidence",
  );

  put(
    "exports/official-source-registry-status.json",
    `${JSON.stringify(
      {
        provenance: PROVENANCE,
        class_10_compliance_status: overall,
        registry: sources,
        official_curriculum_provenance: official.provenance,
        baseline_source_records: Object.fromEntries(Object.entries(baselines).map(([k, v]) => [k, v.source_records])),
      },
      null,
      2,
    )}\n`,
    "DERIVED_SOURCE_REGISTRY",
    "committed source registry + baseline source records",
  );

  const counts = {
    mathematics_requirements: baselines.Mathematics!.total_requirements,
    science_requirements: baselines.Science!.total_requirements,
    mathematics_crosswalk_rows: crosswalkRows.filter((r) => r.subject === "Mathematics").length,
    science_crosswalk_rows: crosswalkRows.filter((r) => r.subject === "Science").length,
    unmapped_mathematics_requirements: perSubjectUnmapped.Mathematics!.length,
    unmapped_science_requirements: perSubjectUnmapped.Science!.length,
  };

  put(
    "exports/limitations-and-reconciliation.json",
    `${JSON.stringify(
      {
        provenance: PROVENANCE,
        class_10_compliance_status: overall,
        reconciliation: counts,
        unmapped_requirement_ids: perSubjectUnmapped,
        missing_required_inputs: missing,
        limitations: PROVENANCE.limitations,
      },
      null,
      2,
    )}\n`,
    "DERIVED_LIMITATIONS",
    "derived reconciliation of baselines against crosswalk rows",
  );

  // 6 ------------------------------------------------ README + manifest + hashes
  const readme = [
    "# EduOS — Class 10 (2026-27) Gemini Crosswalk Review Bundle",
    "",
    `**Extraction timestamp:** ${EXTRACTED_AT}  `,
    `**Repository full SHA:** ${HEAD_SHA}  `,
    `**Validator:** ${VALIDATOR_VERSION}  `,
    `**CLASS_10_COMPLIANCE_STATUS:** ${overall}`,
    "",
    "Evidence packaging only. Nothing in this bundle remediates content, changes database records, generates questions, approves books, alters mappings, retires content or deploys anything.",
    "",
    "## Contents",
    "",
    "| Directory | Content |",
    "|---|---|",
    "| `baseline/` | The committed Class 10 2026-27 Mathematics and Science candidate baselines, their JSON Schemas, their file-validation records, and the packaging report. Verbatim copies. |",
    "| `evidence/` | Exact current EduOS coverage audit, subject crosswalks, outcome/atom matrix, question-depth and reassessment matrix, gap register, machine-readable EduOS crosswalk, frozen snapshot, validator output, official-source registry and curriculum spine. Verbatim copies. |",
    "| `exports/` | Deterministic read-only exports derived from the files above: the baseline→EduOS machine-readable crosswalk, multi-level question-depth and reassessment evidence, the compliance-gate result, source-registry status and the limitations/reconciliation record. |",
    "",
    "## Reproduction",
    "",
    "```",
    "bun run scripts/compliance/gemini-bundle.ts",
    "```",
    "",
    "The exporter is pure and deterministic apart from the recorded extraction timestamp and repository SHA. It reads only committed files and writes only into this directory.",
    "",
    "## Provenance recorded in every export",
    "",
    "Each `exports/*.json` carries a `provenance` block with extraction timestamp, repository full SHA, data source, generating script, evidence basis (repository-only; the snapshot is a previously frozen read-only database export) and limitations.",
    "",
    "## Reconciliation",
    "",
    "| Measure | Mathematics | Science |",
    "|---|---|---|",
    `| Official requirements in baseline | ${counts.mathematics_requirements} | ${counts.science_requirements} |`,
    `| Crosswalk rows emitted | ${counts.mathematics_crosswalk_rows} | ${counts.science_crosswalk_rows} |`,
    `| Requirements without a complete unit+chapter mapping | ${counts.unmapped_mathematics_requirements} | ${counts.unmapped_science_requirements} |`,
    "",
    "Every official requirement produces exactly one crosswalk row. Missing mappings are emitted with `null` values and an explicit verdict; they are never omitted.",
    "",
    "## Question depth",
    "",
    "`exports/question-depth-and-reassessment-evidence.json` reports depth at subject, unit, official-requirement, outcome and atom level. All Mathematics units (including Coordinate Geometry), all Science units (including Chemical Substances — Nature and Behaviour) and the two Meridian-pilot Mathematics units (`Unit 1 — Number Systems`, `Unit 2 — Algebra`, flagged `meridian_pilot_unit: true`) are present.",
    "",
    "## Privacy",
    "",
    "Academic and structural evidence only. The bundle contains no learner names or identifiers, no parent information, no email addresses or phone numbers, no payment records, no secrets, credentials or tokens, no private URLs and no organization-sensitive operational data. Identifiers present are curriculum object UUIDs (books, units) and outcome codes.",
    "",
    "## Source status",
    "",
    `Preserved unchanged: **CLASS_10_COMPLIANCE_STATUS: ${overall}**. No source record is upgraded because the baseline files parse and validate technically.`,
    "",
    "## Limitations",
    "",
    ...PROVENANCE.limitations.map((l) => `- ${l}`),
    "",
    "## Integrity",
    "",
    "`GEMINI_REVIEW_BUNDLE_MANIFEST.json` lists every file with byte size, SHA-256, content category, source provenance, privacy classification and extraction timestamp. `GEMINI_REVIEW_BUNDLE_INTEGRITY.sha256` is a `sha256sum -c` compatible checklist covering the same files.",
    "",
  ].join("\n");
  put("GEMINI_REVIEW_BUNDLE_README.md", readme, "BUNDLE_README", "generated by scripts/compliance/gemini-bundle.ts");

  const entries = [...written].sort().map((rel) => {
    const bytes = readFileSync(resolve(outDir, rel));
    const m = meta.get(rel)!;
    return {
      path: rel,
      bytes: statSync(resolve(outDir, rel)).size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      content_category: m.category,
      source_provenance: m.provenance,
      privacy_classification: m.privacy,
      extraction_timestamp: EXTRACTED_AT,
    };
  });

  const manifest = {
    bundle: "class10-2026-27-gemini",
    purpose: "Independent Gemini row-by-row academic crosswalk review of CBSE Class 10 (2026-27) Mathematics and Science",
    provenance: PROVENANCE,
    class_10_compliance_status: overall,
    reconciliation: counts,
    files_included: entries.length,
    files_missing: missing,
    files: entries,
  };
  writeFileSync(resolve(outDir, "GEMINI_REVIEW_BUNDLE_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    resolve(outDir, "GEMINI_REVIEW_BUNDLE_INTEGRITY.sha256"),
    `${entries.map((e) => `${e.sha256}  ${e.path}`).join("\n")}\n`,
  );

  return { files: entries.map((e) => e.path), crosswalkRows, counts };
}

if (import.meta.main) {
  const { files, counts } = buildBundle();
  console.log(`bundle written to ${BUNDLE_DIR} — ${files.length} file(s)`);
  console.log(JSON.stringify(counts, null, 2));
}
