// Deterministic build of the Class 10 (2026-27) draft question bank.
//
//   bun scripts/class10/gen/build.ts
//
// Writes EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json. Nothing is written to the
// database by this script and no item is ever marked eligible or approved.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { allocate, outcomeRefs, poolTag } from "./allocate";
import { GEOMETRY_AUTHORS } from "./math-geometry";
import { NUMBER_ALGEBRA_AUTHORS } from "./math-number-algebra";
import { TRIG_MENS_STATS_AUTHORS } from "./math-trig-mens-stats";
import { SCIENCE_AUTHORS } from "./science";
import {
  GENERATION_METHOD,
  ORIGINALITY_DECLARATION,
  type Draft,
  type GeneratedItem,
  type OutcomeAuthor,
  type Pool,
} from "./types";

const ROOT = resolve(import.meta.dirname, "../../..");

/** Fixed stamp: the build must be byte-identical on every run. */
export const GENERATED_AT = "2026-08-29T00:00:00.000Z";
export const BATCH_PREFIX = "C10-2627-REBUILD";

const AUTHORS: OutcomeAuthor[] = [
  ...NUMBER_ALGEBRA_AUTHORS,
  ...GEOMETRY_AUTHORS,
  ...TRIG_MENS_STATS_AUTHORS,
  ...SCIENCE_AUTHORS,
];

const authorByCode = new Map(AUTHORS.map((a) => [a.outcomeCode, a]));

function subjectTag(subject: "Mathematics" | "Science"): "MATH" | "SCI" {
  return subject === "Mathematics" ? "MATH" : "SCI";
}

function requirementSlug(requirementIds: string[]): string {
  const first = requirementIds[0];
  if (!first) return "UNMAPPED";
  // REQ_MATH_2026_001 -> REQ001
  const tail = first.split("_").pop() ?? "000";
  return `REQ${tail}`;
}

export function buildItems(): GeneratedItem[] {
  const refs = outcomeRefs();
  const items: GeneratedItem[] = [];
  const seenRef = new Set<string>();

  for (const unit of allocate()) {
    for (const slot of unit.perOutcome) {
      const ref = refs.get(slot.outcomeId);
      if (!ref) throw new Error(`no outcome ref for ${slot.outcomeId}`);
      const author = authorByCode.get(ref.outcomeCode);
      if (!author) throw new Error(`no author module for outcome ${ref.outcomeCode}`);

      const pools: { pool: Pool; drafts: Draft[]; need: number }[] = [
        { pool: "DIAGNOSTIC", drafts: author.diagnostic, need: slot.diagnostic },
        { pool: "FRESH_REASSESSMENT", drafts: author.reassessment, need: slot.reassessment },
      ];

      for (const { pool, drafts, need } of pools) {
        if (drafts.length < need) {
          throw new Error(`${ref.outcomeCode} ${pool}: authored ${drafts.length} of ${need} required items`);
        }
        for (let i = 0; i < need; i += 1) {
          const draft = drafts[i]!;
          const externalRef = `C10-2627-${subjectTag(ref.subject)}-${requirementSlug(ref.officialRequirementIds)}-${poolTag(pool)}-${String(i + 1).padStart(3, "0")}`;
          if (seenRef.has(externalRef)) throw new Error(`duplicate external reference ${externalRef}`);
          seenRef.add(externalRef);

          items.push({
            ...draft,
            externalRef,
            board: "CBSE",
            classLevel: 10,
            academicYear: "2026-27",
            subject: ref.subject,
            officialRequirementIds: ref.officialRequirementIds,
            officialSourceReference: ref.officialSourceReference,
            bookId: ref.bookId,
            unitId: ref.unitId,
            unitTitle: ref.unitTitle,
            chapterId: ref.chapterId,
            chapterTitle: ref.chapterTitle,
            topicId: ref.topicId,
            topicTitle: ref.topicTitle,
            outcomeId: ref.outcomeId,
            outcomeCode: ref.outcomeCode,
            outcomeTitle: ref.outcomeTitle,
            atomId: ref.atomId,
            atomStatus: ref.atomId ? "MAPPED" : "ATOM_MAPPING_REQUIRED",
            pool,
            scoringRule:
              draft.kind === "mcq" || draft.kind === "true_false" || draft.kind === "assertion_reason"
                ? `Exact option match. ${draft.marks} mark for the correct option, 0 otherwise.`
                : `Answer-key match with educator override. ${draft.marks} marks maximum, partial credit at reviewer discretion.`,
            sourceAlignment: ref.officialSourceReference
              ? `Aligned to ${ref.officialRequirementIds.join(", ")} (${ref.officialSourceReference}).`
              : `Aligned to ${ref.officialRequirementIds.join(", ")}.`,
            originality: ORIGINALITY_DECLARATION,
            batch: `${BATCH_PREFIX}-${subjectTag(ref.subject)}-${poolTag(pool)}`,
            status: "draft",
            verificationState: "unverified",
            reviewQueue: ref.subject === "Mathematics" ? "MATHEMATICS_EXPERT_REVIEW" : "SCIENCE_EXPERT_REVIEW",
            reviewStatus: "REVIEW_PENDING",
            reviewerId: null,
            reviewerName: null,
            reviewedAt: null,
            generationMethod: GENERATION_METHOD,
            generatedAt: GENERATED_AT,
          });
        }
      }
    }
  }
  return items;
}

export function summarise(items: GeneratedItem[]) {
  const by = (fn: (i: GeneratedItem) => boolean) => items.filter(fn).length;
  return {
    total: items.length,
    mathematics: by((i) => i.subject === "Mathematics"),
    science: by((i) => i.subject === "Science"),
    diagnostic: by((i) => i.pool === "DIAGNOSTIC"),
    reassessment: by((i) => i.pool === "FRESH_REASSESSMENT"),
    outcomes: new Set(items.map((i) => i.outcomeId)).size,
    atoms: new Set(items.map((i) => i.atomId).filter(Boolean)).size,
    requirements: new Set(items.flatMap((i) => i.officialRequirementIds)).size,
    atomMappingRequired: by((i) => i.atomStatus === "ATOM_MAPPING_REQUIRED"),
    byFormat: Object.fromEntries(
      [...new Set(items.map((i) => i.kind))].sort().map((k) => [k, by((i) => i.kind === k)]),
    ),
    byDifficulty: Object.fromEntries(
      [1, 2, 3, 4, 5].map((d) => [d, by((i) => i.difficulty === d)]).filter(([, n]) => (n as number) > 0),
    ),
  };
}

if (import.meta.main) {
  const items = buildItems();
  const summary = summarise(items);
  const out = {
    generator: GENERATION_METHOD,
    generated_at: GENERATED_AT,
    board: "CBSE",
    class_level: 10,
    academic_year: "2026-27",
    activation: "None of these items is diagnostic-eligible or reassessment-eligible. Named expert review is required.",
    summary,
    items,
  };
  writeFileSync(resolve(ROOT, "EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}
