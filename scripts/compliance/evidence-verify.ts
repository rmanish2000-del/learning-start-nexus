// Class 10 (2026-27) evidence verification and priority remediation planner.
//
//   bun run scripts/compliance/evidence-verify.ts
//
// Pure and deterministic: every input is a committed file. No network, no
// database, no writes outside the deliverables listed at the bottom of this
// file. Re-running with unchanged inputs produces byte-identical output.
//
// Inputs
//   audit-data/class10/2026-27/cbse-class10-{mathematics,science}-2026-27-baseline.json
//   content/compliance/class-10-2026-27.evidence.json            (psql export)
//   content/compliance/class-10-2026-27.source-verification.json (retrieval record)
//   review-bundles/class10-2026-27-gemini/exports/baseline-to-eduos-crosswalk.json

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const VERIFICATION_CONTRACT_VERSION = "1.0.0";

export const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

// Volume law, unchanged from the compliance standard: verified items per unit
// must be at least max(2 x diagnostic target, 2 x outcomes x per-outcome
// minimum, 2 x diagnostic minimum).
const DIAGNOSTIC_TARGET = 20;
const DIAGNOSTIC_MINIMUM = 5;
const MIN_PER_OUTCOME = 1;
const MIN_QUESTION_TYPES_PER_UNIT = 2;
const requiredVerified = (outcomes: number) =>
  Math.max(2 * DIAGNOSTIC_TARGET, 2 * outcomes * MIN_PER_OUTCOME, 2 * DIAGNOSTIC_MINIMUM);

// --------------------------------------------------------------- normalising
const norm = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[’']/g, "")
    .replace(/\bcolor(ful)?\b/g, "colour$1")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const stripUnitPrefix = (s: string) => s.replace(/^unit\s*[-–—]?\s*[ivx0-9]+\s*[:.\-–—]\s*/i, "").trim();

// ------------------------------------------------------- evidence flattening
type OutcomeRow = {
  assessmentOutcomeId: string;
  code: string;
  title: string;
  status: string;
  questionTotal: number;
  questionApproved: number;
  questionVerified: number;
  questionDiagnosticEligible: number;
  questionDraft: number;
  questionKinds: string[];
  questionDifficulties: number[];
  linkedCurriculumOutcomeIds: string[];
};

type TopicRow = {
  topicId: string;
  title: string;
  curriculumOutcomes: { curriculumOutcomeId: string; text: string; status: string; assessmentOutcomeIds: string[] }[];
};

type ChapterRow = { chapterId: string; title: string; topics: TopicRow[] };
type UnitRow = { unitId: string; title: string; status: string; chapters: ChapterRow[]; assessmentOutcomes: OutcomeRow[] };
type BookRow = { bookId: string; title: string; subject: string; status: string; units: UnitRow[] };

const evidence = read("content/compliance/class-10-2026-27.evidence.json") as {
  contractVersion: string;
  books: BookRow[];
};
const sourceVerification = read("content/compliance/class-10-2026-27.source-verification.json");
const priorCrosswalk = read("review-bundles/class10-2026-27-gemini/exports/baseline-to-eduos-crosswalk.json");

// The governing book per subject is the NCERT-derived book that carries the
// official unit structure. Archived books and the Meridian pilot import are
// explicitly not governing.
const GOVERNING_BOOK_TITLE: Record<string, string> = {
  Mathematics: "NCERT Class 10 Mathematics (CBSE)",
  Science: "NCERT Class 10 Science (CBSE)",
};

const bookFor = (subject: string) => {
  const book = evidence.books.find((b) => b.title === GOVERNING_BOOK_TITLE[subject]);
  if (!book) throw new Error(`governing book missing for ${subject}`);
  return book;
};

const outcomeIndex = new Map<string, OutcomeRow>();
for (const b of evidence.books) for (const u of b.units) for (const o of u.assessmentOutcomes) outcomeIndex.set(o.assessmentOutcomeId, o);

// ------------------------------------------------------------ Phase 2 and 3
type Requirement = {
  requirement_id: string;
  official_unit: string;
  official_chapter: string;
  official_topic: string;
  official_requirement: string;
  assessability: string;
  ambiguity_status: string;
  source_reference: string;
};

const subjects = [
  { subject: "Mathematics", file: "audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.json" },
  { subject: "Science", file: "audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.json" },
] as const;

// Baseline unit and chapter labels are auditor paraphrases of the official
// document, so exact string equality under-reports coverage. Matching is
// therefore three-tiered and every tier is recorded on the row:
//   EXACT            normalised titles are identical
//   HIGH_CONFIDENCE  token overlap (Jaccard) at or above the threshold below
//   CHAPTER_LEVEL    the topic could not be resolved; the chapter's whole
//                    outcome set is used and the row is flagged for review
// Aliases below are justified against the retrieved official documents.
const TOPIC_MATCH_THRESHOLD = 0.34;

const UNIT_ALIASES: Record<string, string> = {
  // The official Science syllabus prints "Unit IV: Effects of Current" with
  // "Theme: How Things Work" beneath it. The baseline captured the theme.
  "how things work": "effects of current",
};

const CHAPTER_ALIASES: Record<string, string> = {
  // NCERT chapter title for the Heights and Distances content.
  "heights and distances": "some applications of trigonometry",
  // Official Unit II keeps Heredity assessable and moves Evolution into the
  // formative-only block (finding FIND_SCI_EVOLUTION), so the combined legacy
  // chapter label resolves to the assessable Heredity chapter.
  "heredity and evolution": "heredity",
};

const tokens = (s: string) => new Set(norm(s).split(" ").filter((t) => t.length > 2));
const jaccard = (a: string, b: string) => {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / (A.size + B.size - shared);
};

function bestMatch<T>(candidates: T[], title: (c: T) => string, want: string) {
  let best: { item: T; score: number } | null = null;
  for (const c of candidates) {
    const score = jaccard(title(c), want);
    if (!best || score > best.score || (score === best.score && title(c) < title(best.item))) best = { item: c, score };
  }
  return best;
}

type VerifiedRow = ReturnType<typeof buildRow>;

function buildRow(subject: string, req: Requirement) {
  const book = bookFor(subject);

  const wantUnit = norm(stripUnitPrefix(req.official_unit));
  const unitKey = UNIT_ALIASES[wantUnit] ?? wantUnit;
  let unit = book.units.find((u) => norm(u.title) === unitKey) ?? null;
  let unitMatch = unit ? "EXACT" : "UNMATCHED";
  if (!unit) {
    const best = bestMatch(book.units, (u) => u.title, unitKey);
    if (best && best.score >= TOPIC_MATCH_THRESHOLD) {
      unit = best.item;
      unitMatch = "HIGH_CONFIDENCE";
    }
  }

  const wantChapter = norm(req.official_chapter);
  const chapterKey = CHAPTER_ALIASES[wantChapter] ?? wantChapter;
  let chapter = unit?.chapters.find((c) => norm(c.title) === chapterKey) ?? null;
  let chapterMatch = chapter ? "EXACT" : "UNMATCHED";
  if (!chapter && unit) {
    const best = bestMatch(unit.chapters, (c) => c.title, chapterKey);
    if (best && best.score >= TOPIC_MATCH_THRESHOLD) {
      chapter = best.item;
      chapterMatch = "HIGH_CONFIDENCE";
    }
  }

  // Topic resolution matches against the EduOS topic title and, failing that,
  // against the official requirement sentence, which is usually richer.
  let topic = chapter?.topics.find((t) => norm(t.title) === norm(req.official_topic)) ?? null;
  let topicMatch = topic ? "EXACT" : "UNMATCHED";
  let topicScore = topic ? 1 : 0;
  if (!topic && chapter) {
    const byTopic = bestMatch(chapter.topics, (t) => t.title, req.official_topic);
    const byRequirement = bestMatch(chapter.topics, (t) => t.title, `${req.official_topic} ${req.official_requirement}`);
    const best = byTopic && byRequirement ? (byTopic.score >= byRequirement.score ? byTopic : byRequirement) : (byTopic ?? byRequirement);
    if (best && best.score >= TOPIC_MATCH_THRESHOLD) {
      topic = best.item;
      topicMatch = "HIGH_CONFIDENCE";
      topicScore = Math.round(best.score * 100) / 100;
    }
  }

  const scope = topic ? "TOPIC" : chapter ? "CHAPTER" : "NONE";
  const curriculumOutcomes = topic ? topic.curriculumOutcomes : chapter ? chapter.topics.flatMap((t) => t.curriculumOutcomes) : [];
  const assessmentOutcomeIds = [...new Set(curriculumOutcomes.flatMap((o) => o.assessmentOutcomeIds))].sort();
  const outcomes = assessmentOutcomeIds.map((id) => outcomeIndex.get(id)).filter((o): o is OutcomeRow => Boolean(o));

  const sum = (pick: (o: OutcomeRow) => number) => outcomes.reduce((n, o) => n + pick(o), 0);

  let verdict: string;
  if (!unit) verdict = "UNIT_UNMAPPED";
  else if (!chapter) verdict = "CHAPTER_UNMAPPED";
  else if (outcomes.length === 0) verdict = "OUTCOME_UNMAPPED";
  else if (sum((o) => o.questionDiagnosticEligible) === 0) verdict = "MAPPED_NO_USABLE_QUESTIONS";
  else if (!topic) verdict = "MAPPED_CHAPTER_LEVEL_ONLY";
  else verdict = "MAPPED_WITH_EVIDENCE";

  return {
    subject,
    academic_year: "2026-27",
    official_requirement_id: req.requirement_id,
    official_unit: req.official_unit,
    official_chapter: req.official_chapter,
    official_topic: req.official_topic,
    official_source_reference: req.source_reference,
    assessability: req.assessability,
    eduos_book_id: book.bookId,
    eduos_book_status: book.status,
    eduos_unit_id: unit?.unitId ?? null,
    eduos_unit_title: unit?.title ?? null,
    eduos_chapter_id: chapter?.chapterId ?? null,
    eduos_chapter_title: chapter?.title ?? null,
    eduos_topic_id: topic?.topicId ?? null,
    eduos_topic_title: topic?.title ?? null,
    unit_match: unitMatch,
    chapter_match: chapterMatch,
    topic_match: topicMatch,
    topic_match_score: topicScore,
    evidence_scope: scope,
    curriculum_outcome_ids: curriculumOutcomes.map((o) => o.curriculumOutcomeId),
    assessment_outcome_ids: assessmentOutcomeIds,
    assessment_outcome_codes: outcomes.map((o) => o.code),
    question_total: sum((o) => o.questionTotal),
    question_approved: sum((o) => o.questionApproved),
    question_verified: sum((o) => o.questionVerified),
    question_diagnostic_eligible: sum((o) => o.questionDiagnosticEligible),
    question_kinds: [...new Set(outcomes.flatMap((o) => o.questionKinds))].sort(),
    question_difficulties: [...new Set(outcomes.flatMap((o) => o.questionDifficulties))].sort((a, b) => a - b),
    verdict,
    evidence_reference: "content/compliance/class-10-2026-27.evidence.json",
    human_review_status: "NOT_REVIEWED_BY_NAMED_SUBJECT_EXPERT",
  };
}

const verifiedRows: VerifiedRow[] = [];
for (const s of subjects) {
  const baseline = read(s.file) as { requirements: Requirement[] };
  for (const req of baseline.requirements) verifiedRows.push(buildRow(s.subject, req));
}

// ----------------------------------------------------- Phase 4, 5 and 6 facts
// Every finding below is anchored to text actually present in the retrieved
// official PDFs (see content/compliance/class-10-2026-27.source-verification.json).
const SOURCE_ANCHORED_FINDINGS = [
  {
    finding_id: "FIND_SCI_PERIODIC_CLASSIFICATION",
    phase: "PHASE_6_AMBIGUITY",
    subject: "Science",
    baseline_claim:
      "EXCL_SCI_2026_001 records Periodic Classification of Elements as RATIONALISED_CHAPTER_OMISSION, and AMB_SCI_2026_001 recommends OFFICIALLY_EXCLUDED.",
    verified_truth:
      "The retrieved CBSE Science 2026-27 syllabus retains Periodic Classification of Elements inside Unit I under the heading 'included in the syllabus but will be assessed only formatively', and the Note for Teachers states it will not be assessed in the year-end examination.",
    resolution: "RETAINED_FORMATIVE_ONLY",
    baseline_status: "BASELINE_CLAIM_CONTRADICTED",
    remediation: "Reclassify the exclusion as NOT_ASSESSED_IN_YEAR_END_EXAMINATION. Do not generate summative diagnostic items for this topic.",
  },
  {
    finding_id: "FIND_SCI_EVOLUTION",
    phase: "PHASE_6_AMBIGUITY",
    subject: "Science",
    baseline_claim: "Baseline treats Heredity and Evolution as a single assessable block.",
    verified_truth:
      "Unit II separates assessable Heredity from Evolution, which is listed as formative-only. The Note for Teachers repeats that Heredity and Evolution content is not assessed in the year-end examination.",
    resolution: "EVOLUTION_FORMATIVE_ONLY",
    baseline_status: "BASELINE_CLAIM_PARTIAL",
    remediation: "Label Evolution outcomes as formative and exclude them from diagnostic weighting.",
  },
  {
    finding_id: "FIND_SCI_MOTOR_GENERATOR",
    phase: "PHASE_6_AMBIGUITY",
    subject: "Science",
    baseline_claim: "Motor, Electromagnetic Induction and Electric Generator treated as assessable in Unit IV.",
    verified_truth: "Unit IV lists Motor, Electromagnetic Induction and Electric Generator under the formative-only block.",
    resolution: "FORMATIVE_ONLY",
    baseline_status: "BASELINE_CLAIM_CONTRADICTED",
    remediation: "Mark these outcomes formative; exclude from summative depth targets.",
  },
  {
    finding_id: "FIND_SCI_HUMAN_EYE_SPELLING",
    phase: "PHASE_3_UNMAPPED",
    subject: "Science",
    baseline_claim: "Prior gap register recorded 1 unmapped official Science topic (SCI-U3-C2 The Human Eye and the Colourful World).",
    verified_truth:
      "The chapter exists in EduOS as 'The Human Eye and the Colorful World'. The gap was an orthographic mismatch (US spelling), not missing content.",
    resolution: "MAPPED_AFTER_TITLE_CORRECTION",
    baseline_status: "PRIOR_GAP_INVALID",
    remediation: "Rename the chapter to the official British spelling. Safe metadata-only fix.",
  },
  {
    finding_id: "FIND_MAT_MERIDIAN_PILOT_UNITS",
    phase: "PHASE_4_PILOT_DISPOSITION",
    subject: "Mathematics",
    baseline_claim:
      "The review claimed the unmapped Meridian-pilot units were 'Trigonometric Identities' and 'Mensuration (frustum)'.",
    verified_truth:
      "The unmapped units in the live database are 'Unit 1 — Number Systems' and 'Unit 2 — Algebra', both belonging to the book 'CBSE Class 10 Mathematics — Meridian Pilot' (status processed, units status suggested). They duplicate the governing NCERT units. One pilot topic, Euclid's division lemma, does not appear anywhere in the retrieved 2026-27 syllabus.",
    resolution: "RETIRE_DUPLICATE_PILOT_UNITS",
    baseline_status: "PRIOR_CLAIM_FACTUALLY_WRONG",
    remediation:
      "Retire the two pilot units rather than mapping them. They carry 15 unverified questions and duplicate approved coverage. Retirement is a content decision and is NOT executed by this pass.",
  },
  {
    finding_id: "FIND_MAT_FRUSTUM_OUT_OF_SCOPE",
    phase: "PHASE_6_OVERREACH",
    subject: "Mathematics",
    baseline_claim: "Frustum of a cone flagged as possible academic overreach.",
    verified_truth: "The string 'frustum' does not occur in the retrieved CBSE Mathematics 2026-27 syllabus.",
    resolution: "CONFIRMED_OUT_OF_SYLLABUS",
    baseline_status: "BASELINE_CLAIM_CONFIRMED",
    remediation: "Do not author frustum items for 2026-27.",
  },
  {
    finding_id: "FIND_MAT_EUCLID_OUT_OF_SCOPE",
    phase: "PHASE_6_OVERREACH",
    subject: "Mathematics",
    baseline_claim: "Euclid's division lemma assumed in-scope by the Meridian pilot import.",
    verified_truth: "The string 'Euclid' does not occur in the retrieved CBSE Mathematics 2026-27 syllabus.",
    resolution: "CONFIRMED_OUT_OF_SYLLABUS",
    baseline_status: "PILOT_CONTENT_OUT_OF_SCOPE",
    remediation: "Exclude from generation; retire with the pilot unit.",
  },
  {
    finding_id: "FIND_SCI_BOOK_STATUS",
    phase: "PHASE_5_BOOK_STATUS",
    subject: "Science",
    baseline_claim: "Science source book status disputed between PROCESSED_NOT_APPROVED and Approved.",
    verified_truth:
      "books.status for 'NCERT Class 10 Science (CBSE)' is 'processed'. It is not approved. The Mathematics counterpart is 'approved'. All 209 Science questions therefore hang off a non-approved book.",
    resolution: "PROCESSED_NOT_APPROVED",
    baseline_status: "BASELINE_CLAIM_CONFIRMED",
    remediation:
      "Approval is a human editorial act. It is not performed by this pass. The compliance gate must continue to fail source_books_approved for Science.",
  },
  {
    finding_id: "FIND_QUESTION_STATE_SEPARATION",
    phase: "PHASE_7_DEPTH",
    subject: "All",
    baseline_claim: "Prior reports conflated 'approved' and 'verified' question counts.",
    verified_truth:
      "question_bank carries two independent axes: status (draft/approved/retired) and verification_state (unverified/verified/rejected). Live counts are 213 verified+approved, 52 approved+unverified, 39 draft+unverified. Only status='approved' AND verification_state='verified' is diagnostic-eligible.",
    resolution: "SEPARATED",
    baseline_status: "MEASUREMENT_CORRECTED",
    remediation: "All depth arithmetic in this pass uses the diagnostic-eligible intersection.",
  },
];

// ------------------------------------------------------------ Phase 2 deltas
const priorRows: Record<string, Record<string, unknown>> = Object.fromEntries(
  (priorCrosswalk.rows as Record<string, unknown>[]).map((r) => [String(r["official_requirement_id"]), r]),
);

const conflicts = verifiedRows
  .map((row) => {
    const prior = priorRows[row.official_requirement_id];
    if (!prior) {
      return {
        official_requirement_id: row.official_requirement_id,
        conflict_type: "CLAIM_ROW_MISSING",
        claimed: null,
        verified: row.verdict,
      };
    }
    const deltas: { field: string; claimed: unknown; verified: unknown }[] = [];
    if (prior["eduos_unit_id"] !== row.eduos_unit_id)
      deltas.push({ field: "eduos_unit_id", claimed: prior["eduos_unit_id"], verified: row.eduos_unit_id });
    if (!prior["eduos_chapter_id"] && row.eduos_chapter_id)
      deltas.push({ field: "eduos_chapter_id", claimed: null, verified: row.eduos_chapter_id });
    if (!prior["eduos_topic_id"] && row.eduos_topic_id)
      deltas.push({ field: "eduos_topic_id", claimed: null, verified: row.eduos_topic_id });
    if (prior["verified_question_count"] !== row.question_verified)
      deltas.push({ field: "verified_question_count", claimed: prior["verified_question_count"], verified: row.question_verified });
    if (prior["approved_question_count"] !== row.question_approved)
      deltas.push({ field: "approved_question_count", claimed: prior["approved_question_count"], verified: row.question_approved });
    if (prior["current_verdict"] !== row.verdict)
      deltas.push({ field: "verdict", claimed: prior["current_verdict"], verified: row.verdict });
    if (deltas.length === 0) return null;
    return {
      official_requirement_id: row.official_requirement_id,
      subject: row.subject,
      conflict_type: "ROW_CLAIM_DELTA",
      cause:
        "Prior rows reported unit-level aggregates and outcome codes only; this pass resolves requirement-level chapter, topic and outcome identifiers and separates approved from verified questions.",
      deltas,
    };
  })
  .filter(Boolean);

// ------------------------------------------------------------ Phase 7 depth
type UnitSpec = ReturnType<typeof unitSpec>;
function unitSpec(subject: string, unit: UnitRow, governing: boolean) {
  const outcomes = unit.assessmentOutcomes;
  const sum = (pick: (o: OutcomeRow) => number) => outcomes.reduce((n, o) => n + pick(o), 0);
  const eligible = sum((o) => o.questionDiagnosticEligible);
  const required = requiredVerified(outcomes.length);
  const kinds = [...new Set(outcomes.flatMap((o) => o.questionKinds))].sort();
  const difficulties = [...new Set(outcomes.flatMap((o) => o.questionDifficulties))].sort((a, b) => a - b);
  return {
    subject,
    eduos_unit_id: unit.unitId,
    eduos_unit_title: unit.title,
    unit_status: unit.status,
    governing,
    outcomes: outcomes.length,
    question_total: sum((o) => o.questionTotal),
    question_approved: sum((o) => o.questionApproved),
    question_verified: sum((o) => o.questionVerified),
    diagnostic_eligible: eligible,
    required_diagnostic_eligible: required,
    deficit: Math.max(required - eligible, 0),
    diagnostic_set: Math.min(eligible, DIAGNOSTIC_TARGET),
    reassessment_reserve: Math.max(eligible - DIAGNOSTIC_TARGET, 0),
    question_kinds: kinds,
    question_kind_deficit: Math.max(MIN_QUESTION_TYPES_PER_UNIT - kinds.length, 0),
    difficulty_bands: difficulties.length,
    outcomes_without_eligible_questions: outcomes.filter((o) => o.questionDiagnosticEligible === 0).map((o) => o.code),
    verdict: eligible >= required && kinds.length >= MIN_QUESTION_TYPES_PER_UNIT ? "OK" : "SHORTFALL",
  };
}

const unitSpecs: UnitSpec[] = [];
for (const book of evidence.books) {
  if (book.status === "archived") continue;
  const governing = book.title === GOVERNING_BOOK_TITLE[book.subject];
  for (const unit of book.units) unitSpecs.push(unitSpec(book.subject, unit, governing));
}

// ------------------------------------------------------ verified gap register
const gaps: Record<string, unknown>[] = [];
let gapSeq = 0;
const gap = (subject: string, category: string, severity: string, detail: string, remediation: string) => {
  gapSeq += 1;
  gaps.push({
    gap_id: `VGAP-${String(gapSeq).padStart(3, "0")}`,
    subject,
    category,
    severity,
    detail,
    remediation,
    verified_against: "content/compliance/class-10-2026-27.evidence.json + class-10-2026-27.source-verification.json",
  });
};

for (const s of subjects) {
  const rows = verifiedRows.filter((r) => r.subject === s.subject);
  const unmapped = rows.filter((r) => r.verdict.endsWith("_UNMAPPED"));
  if (unmapped.length > 0)
    gap(
      s.subject,
      "REQUIREMENT_MAPPING",
      "BLOCKING",
      `${unmapped.length} of ${rows.length} official requirements resolve no EduOS topic or outcome: ${unmapped.map((r) => r.official_requirement_id).join(", ")}`,
      "Create the missing topic/outcome rows against the governing book before generation.",
    );
  const noQuestions = rows.filter((r) => r.verdict === "MAPPED_NO_USABLE_QUESTIONS");
  if (noQuestions.length > 0)
    gap(
      s.subject,
      "REQUIREMENT_EVIDENCE",
      "MAJOR",
      `${noQuestions.length} mapped requirements carry no diagnostic-eligible question: ${noQuestions.map((r) => r.official_requirement_id).join(", ")}`,
      "Author and verify at least one item per requirement.",
    );
  const shortfalls = unitSpecs.filter((u) => u.subject === s.subject && u.governing && u.verdict === "SHORTFALL");
  if (shortfalls.length > 0)
    gap(
      s.subject,
      "QUESTION_DEPTH",
      "MAJOR",
      shortfalls.map((u) => `${u.eduos_unit_title}:${u.diagnostic_eligible}/${u.required_diagnostic_eligible}`).join(", "),
      "Author to the depth law before the unit can serve both a diagnostic and a reassessment set.",
    );
}

for (const f of SOURCE_ANCHORED_FINDINGS) {
  const severity = f.baseline_status.includes("CONTRADICTED") || f.baseline_status === "PRIOR_CLAIM_FACTUALLY_WRONG" ? "BLOCKING" : "MAJOR";
  gap(f.subject, f.phase, severity, `${f.finding_id}: ${f.verified_truth}`, f.remediation);
}

// ------------------------------------------------------------------- writers
const writeJson = (path: string, value: unknown) => {
  writeFileSync(resolve(ROOT, path), `${JSON.stringify(value, null, 2)}\n`);
  return path;
};

const provenance = {
  contract_version: VERIFICATION_CONTRACT_VERSION,
  board: "CBSE",
  class_level: 10,
  academic_year: "2026-27",
  evidence_contract_version: evidence.contractVersion,
  source_verification_status: sourceVerification.overallStatus,
  generator: "scripts/compliance/evidence-verify.ts",
  determinism_note: "Derived only from committed inputs; no timestamps are embedded.",
};

const written: string[] = [];
written.push(
  writeJson("EDUOS_CLASS_10_VERIFIED_CROSSWALK.json", {
    provenance,
    total_requirements: verifiedRows.length,
    rows: verifiedRows,
  }),
);
written.push(
  writeJson("EDUOS_CLASS_10_GEMINI_CONFLICTS.json", {
    provenance,
    prior_claim_source: "review-bundles/class10-2026-27-gemini/exports/baseline-to-eduos-crosswalk.json",
    narrative_conflicts: SOURCE_ANCHORED_FINDINGS.filter((f) => f.baseline_status !== "BASELINE_CLAIM_CONFIRMED"),
    row_conflicts: conflicts,
    total_row_conflicts: conflicts.length,
  }),
);
written.push(
  writeJson("EDUOS_CLASS_10_VERIFIED_GAP_REGISTER.json", {
    provenance,
    total_gaps: gaps.length,
    blocking_gaps: gaps.filter((g) => g["severity"] === "BLOCKING").length,
    gaps,
  }),
);
written.push(
  writeJson("EDUOS_CLASS_10_QUESTION_GENERATION_SPEC.json", {
    provenance,
    depth_law: {
      diagnostic_target: DIAGNOSTIC_TARGET,
      diagnostic_minimum: DIAGNOSTIC_MINIMUM,
      minimum_questions_per_outcome: MIN_PER_OUTCOME,
      minimum_question_types_per_unit: MIN_QUESTION_TYPES_PER_UNIT,
      formula: "required = max(2 * diagnostic_target, 2 * outcomes * minimum_per_outcome, 2 * diagnostic_minimum)",
      eligibility: "status = 'approved' AND verification_state = 'verified'",
    },
    total_deficit: unitSpecs.filter((u) => u.governing).reduce((n, u) => n + u.deficit, 0),
    units: unitSpecs,
    generation_constraints: [
      "Only author against governing-book units. Non-governing pilot units are pending retirement.",
      "Do not author items for formative-only topics (Periodic Classification of Elements, Evolution, Motor / Electromagnetic Induction / Electric Generator).",
      "Do not author frustum or Euclid's division lemma items: neither appears in the 2026-27 syllabus.",
      "Every unit needs at least two question kinds; most units currently carry one.",
      "Generation is NOT authorised by this pass.",
    ],
  }),
);

// --------------------------------------------------------- markdown reports
const md: string[] = [];
md.push("# EduOS — Class 10 (2026-27) Evidence Verification");
md.push("");
md.push("Generated by `scripts/compliance/evidence-verify.ts`. Do not edit by hand.");
md.push("");
md.push("## 1. Official source retrieval");
md.push("");
md.push("| Source | HTTP | Bytes | SHA-256 | Probes | Status |");
md.push("|---|---|---|---|---|---|");
for (const s of sourceVerification.sources) {
  const pass = s.probes.filter((p: { result: string }) => p.result === "PASS").length;
  md.push(`| ${s.sourceId} | ${s.httpStatus} | ${s.byteLength} | \`${s.sha256}\` | ${pass}/${s.probes.length} | ${s.verificationStatus} |`);
}
md.push("");
md.push("Full retrieval record, including every probe and its expectation: `content/compliance/class-10-2026-27.source-verification.json`.");
md.push("");
md.push("## 2. Requirement mapping");
md.push("");
md.push("| Subject | Requirements | Mapped with evidence | Mapped without usable questions | Unmapped |");
md.push("|---|---|---|---|---|");
for (const s of subjects) {
  const rows = verifiedRows.filter((r) => r.subject === s.subject);
  md.push(
    `| ${s.subject} | ${rows.length} | ${rows.filter((r) => r.verdict === "MAPPED_WITH_EVIDENCE").length} | ${rows.filter((r) => r.verdict === "MAPPED_NO_USABLE_QUESTIONS").length} | ${rows.filter((r) => r.verdict.endsWith("_UNMAPPED")).length} |`,
  );
}
md.push("");
md.push("## 3. Question depth (diagnostic-eligible = approved AND verified)");
md.push("");
md.push("| Subject | Unit | Governing | Outcomes | Total | Approved | Verified | Eligible | Required | Deficit | Kinds | Verdict |");
md.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const u of unitSpecs)
  md.push(
    `| ${u.subject} | ${u.eduos_unit_title} | ${u.governing ? "yes" : "no"} | ${u.outcomes} | ${u.question_total} | ${u.question_approved} | ${u.question_verified} | ${u.diagnostic_eligible} | ${u.required_diagnostic_eligible} | ${u.deficit} | ${u.question_kinds.length} | ${u.verdict} |`,
  );
md.push("");
md.push("## 4. Source-anchored findings");
md.push("");
for (const f of SOURCE_ANCHORED_FINDINGS) {
  md.push(`### ${f.finding_id} — ${f.baseline_status}`);
  md.push("");
  md.push(`- **Phase:** ${f.phase} · **Subject:** ${f.subject}`);
  md.push(`- **Prior claim:** ${f.baseline_claim}`);
  md.push(`- **Verified truth:** ${f.verified_truth}`);
  md.push(`- **Resolution:** ${f.resolution}`);
  md.push(`- **Remediation:** ${f.remediation}`);
  md.push("");
}
md.push("## 5. Verified gap register");
md.push("");
md.push(`Total ${gaps.length} gaps, ${gaps.filter((g) => g["severity"] === "BLOCKING").length} blocking. Machine-readable: \`EDUOS_CLASS_10_VERIFIED_GAP_REGISTER.json\`.`);
md.push("");
writeFileSync(resolve(ROOT, "EDUOS_CLASS_10_EVIDENCE_VERIFICATION.md"), `${md.join("\n")}\n`);
written.push("EDUOS_CLASS_10_EVIDENCE_VERIFICATION.md");

console.log(written.map((w) => `wrote ${w}`).join("\n"));
console.log(
  `requirements=${verifiedRows.length} rowConflicts=${conflicts.length} gaps=${gaps.length} totalDeficit=${unitSpecs.filter((u) => u.governing).reduce((n, u) => n + u.deficit, 0)}`,
);
