// Automated academic validation of the generated Class 10 draft bank.
//
//   bun scripts/class10/gen/validate.ts
//
// Writes EDUOS_CLASS_10_VALIDATION_RESULTS.json and EDUOS_CLASS_10_REVIEW_QUEUE.json.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { crosswalk, evidence } from "./allocate";
import { buildItems, summarise } from "./build";
import { RECOMPUTE } from "./recompute";
import type { GeneratedItem } from "./types";

const ROOT = resolve(import.meta.dirname, "../../..");

export type Finding = {
  externalRef: string;
  check: string;
  severity: "ERROR" | "HUMAN_REVIEW_REQUIRED";
  detail: string;
};

/** Topics the verified baseline keeps out of active 2026-27 diagnostics. */
const EXCLUDED_TERMS = [
  "frustum",
  "euclid's division lemma",
  "electric motor",
  "electric generator",
  "domestic electric circuit fuse rating calculation of a generator",
  "cross multiplication method",
];

const MARKUP = /<\/?[a-z][^>]*>|\*\*\S|__[a-z0-9]|```|&nbsp;/i;

/** Very small shingle overlap measure used for near-duplicate detection. */
function shingles(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 4 <= words.length; i += 1) out.add(words.slice(i, i + 4).join(" "));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const s of a) if (b.has(s)) inter += 1;
  return inter / (a.size + b.size - inter);
}

export function validate(items: GeneratedItem[]) {
  const findings: Finding[] = [];
  const push = (i: GeneratedItem, check: string, detail: string, severity: Finding["severity"] = "ERROR") =>
    findings.push({ externalRef: i.externalRef, check, severity, detail });

  const validRequirements = new Set<string>((crosswalk.rows as { official_requirement_id: string }[]).map((r) => r.official_requirement_id));
  const validOutcomes = new Set<string>();
  const validAtoms = new Set<string>();
  const validUnits = new Set<string>();
  const validChapters = new Set<string>();
  for (const book of evidence.books as any[]) {
    for (const unit of book.units) {
      validUnits.add(unit.unitId);
      for (const ao of unit.assessmentOutcomes) validOutcomes.add(ao.assessmentOutcomeId);
      for (const chapter of unit.chapters) {
        validChapters.add(chapter.chapterId);
        for (const topic of chapter.topics) for (const atom of topic.curriculumOutcomes) validAtoms.add(atom.curriculumOutcomeId);
      }
    }
  }

  const refSeen = new Map<string, number>();
  const promptSeen = new Map<string, string>();
  const perOutcomeShingles = new Map<string, { ref: string; pool: string; set: Set<string> }[]>();

  let numericChecked = 0;

  for (const item of items) {
    // --- identity and mapping
    if (!/^C10-2627-(MATH|SCI)-REQ\d{3}-(DIAG|REASS)-\d{3}$/.test(item.externalRef)) {
      push(item, "external_reference_format", `malformed reference ${item.externalRef}`);
    }
    refSeen.set(item.externalRef, (refSeen.get(item.externalRef) ?? 0) + 1);
    if (item.officialRequirementIds.length === 0) push(item, "requirement_mapping", "no official requirement");
    for (const req of item.officialRequirementIds) {
      if (!validRequirements.has(req)) push(item, "requirement_mapping", `unknown requirement ${req}`);
    }
    if (!validUnits.has(item.unitId)) push(item, "curriculum_mapping", `unknown unit ${item.unitId}`);
    if (item.chapterId && !validChapters.has(item.chapterId)) push(item, "curriculum_mapping", `unknown chapter ${item.chapterId}`);
    if (!validOutcomes.has(item.outcomeId)) push(item, "outcome_mapping", `unknown outcome ${item.outcomeId}`);
    if (item.atomId && !validAtoms.has(item.atomId)) push(item, "atom_mapping", `unknown atom ${item.atomId}`);
    if (!item.atomId) push(item, "atom_mapping", "atom unavailable", "HUMAN_REVIEW_REQUIRED");
    if (item.academicYear !== "2026-27") push(item, "academic_year", `unexpected year ${item.academicYear}`);

    // --- status gates
    if (item.status !== "draft" || item.verificationState !== "unverified") {
      push(item, "activation_gate", "item is not in the draft/unverified state");
    }
    if (item.reviewStatus !== "REVIEW_PENDING" || item.reviewerName !== null) {
      push(item, "review_gate", "review fields must stay pending and unnamed");
    }

    // --- answer integrity
    if (!item.correctAnswer.trim()) push(item, "answer_present", "empty correct answer");
    if (item.options) {
      const opts = item.options;
      if (new Set(opts).size !== opts.length) push(item, "duplicate_options", "repeated option text");
      if (!opts.includes(item.correctAnswer)) push(item, "answer_in_options", "correct answer absent from options");
      if (opts.length < 2) push(item, "option_count", "fewer than two options");
    }
    if (!item.explanation || item.explanation.length < 30) push(item, "explanation_present", "explanation too short");

    // --- markup and contamination
    for (const [field, text] of [
      ["prompt", item.prompt],
      ["correctAnswer", item.correctAnswer],
      ["explanation", item.explanation],
    ] as const) {
      if (MARKUP.test(text)) push(item, "markup_contamination", `${field} contains HTML or Markdown markup`);
    }
    const haystack = `${item.prompt} ${item.explanation}`.toLowerCase();
    for (const term of EXCLUDED_TERMS) {
      if (haystack.includes(term)) push(item, "exclusion_leakage", `references excluded scope: ${term}`);
    }

    // --- numeric recomputation
    if (item.numericCheck) {
      const fn = RECOMPUTE[item.numericCheck.fn];
      if (!fn) {
        push(item, "numeric_recomputation", `no independent implementation for ${item.numericCheck.fn}`);
      } else {
        numericChecked += 1;
        const got = fn(item.numericCheck.args);
        const tol = item.numericCheck.tolerance ?? 1e-9;
        if (!Number.isFinite(got) || Math.abs(got - item.numericCheck.expect) > tol) {
          push(
            item,
            "numeric_recomputation",
            `${item.numericCheck.fn}(${item.numericCheck.args.join(", ")}) recomputed as ${got}, item claims ${item.numericCheck.expect}`,
          );
        }
      }
    }

    // --- duplicates
    const key = item.prompt.trim().toLowerCase();
    const prior = promptSeen.get(key);
    if (prior) push(item, "duplicate_prompt", `identical prompt to ${prior}`);
    else promptSeen.set(key, item.externalRef);

    const bucket = perOutcomeShingles.get(item.outcomeId) ?? [];
    const set = shingles(item.prompt);
    for (const other of bucket) {
      const sim = jaccard(set, other.set);
      if (sim >= 0.6) {
        push(
          item,
          other.pool === item.pool ? "near_duplicate_same_pool" : "near_duplicate_across_pools",
          `${Math.round(sim * 100)}% four-word overlap with ${other.ref}`,
        );
      }
    }
    bucket.push({ ref: item.externalRef, pool: item.pool, set });
    perOutcomeShingles.set(item.outcomeId, bucket);
  }

  for (const [ref, count] of refSeen) {
    if (count > 1) findings.push({ externalRef: ref, check: "duplicate_reference", severity: "ERROR", detail: `${count} items share this reference` });
  }

  // --- pool separation: no prompt may appear in both pools
  const diag = new Set(items.filter((i) => i.pool === "DIAGNOSTIC").map((i) => i.prompt.trim().toLowerCase()));
  for (const item of items.filter((i) => i.pool === "FRESH_REASSESSMENT")) {
    if (diag.has(item.prompt.trim().toLowerCase())) {
      push(item, "pool_separation", "prompt also present in the diagnostic pool");
    }
  }

  const errors = findings.filter((f) => f.severity === "ERROR");
  return {
    summary: summarise(items),
    checks: {
      itemsValidated: items.length,
      numericClaimsRecomputed: numericChecked,
      errors: errors.length,
      humanReviewRequired: findings.length - errors.length,
      duplicates: findings.filter((f) => f.check.startsWith("duplicate")).length,
      nearDuplicates: findings.filter((f) => f.check.startsWith("near_duplicate")).length,
      exclusionLeakage: findings.filter((f) => f.check === "exclusion_leakage").length,
      markupContamination: findings.filter((f) => f.check === "markup_contamination").length,
      poolSeparationBreaches: findings.filter((f) => f.check === "pool_separation").length,
    },
    findings,
  };
}

export function reviewQueues(items: GeneratedItem[]) {
  const row = (i: GeneratedItem) => ({
    external_ref: i.externalRef,
    requirement: i.officialRequirementIds,
    official_source: i.officialSourceReference,
    unit: i.unitTitle,
    chapter: i.chapterTitle,
    topic: i.topicTitle,
    outcome: { id: i.outcomeId, code: i.outcomeCode, title: i.outcomeTitle },
    atom: { id: i.atomId, status: i.atomStatus },
    pool: i.pool,
    format: i.kind,
    difficulty: i.difficulty,
    marks: i.marks,
    question: i.prompt,
    options: i.options ?? null,
    answer: i.correctAnswer,
    explanation: i.explanation,
    automated_validation: "PASS",
    reviewer_decision: null,
    reviewer_id: null,
    reviewer_name: null,
    reviewer_notes: null,
    reviewed_at: null,
    review_status: i.reviewStatus,
  });
  return {
    MATHEMATICS_EXPERT_REVIEW: items.filter((i) => i.subject === "Mathematics").map(row),
    SCIENCE_EXPERT_REVIEW: items.filter((i) => i.subject === "Science").map(row),
  };
}

if (import.meta.main) {
  const items = buildItems();
  const results = validate(items);
  const queues = reviewQueues(items);
  const failing = new Set(results.findings.filter((f) => f.severity === "ERROR").map((f) => f.externalRef));
  for (const queue of Object.values(queues)) {
    for (const row of queue) if (failing.has(row.external_ref)) row.automated_validation = "FAIL";
  }

  writeFileSync(
    resolve(ROOT, "EDUOS_CLASS_10_VALIDATION_RESULTS.json"),
    `${JSON.stringify({ generated_at: "2026-08-29T00:00:00.000Z", ...results }, null, 2)}\n`,
  );
  writeFileSync(
    resolve(ROOT, "EDUOS_CLASS_10_REVIEW_QUEUE.json"),
    `${JSON.stringify(
      {
        generated_at: "2026-08-29T00:00:00.000Z",
        note: "No named subject expert has been assigned. Every row stays REVIEW_PENDING and no item is diagnostic- or reassessment-eligible.",
        counts: {
          MATHEMATICS_EXPERT_REVIEW: queues.MATHEMATICS_EXPERT_REVIEW.length,
          SCIENCE_EXPERT_REVIEW: queues.SCIENCE_EXPERT_REVIEW.length,
        },
        queues,
      },
      null,
      2,
    )}\n`,
  );
  console.log(JSON.stringify(results.checks, null, 2));
  for (const f of results.findings.slice(0, 40)) console.log(`${f.severity} ${f.externalRef} ${f.check}: ${f.detail}`);
}
