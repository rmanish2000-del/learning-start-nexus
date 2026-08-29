// Deterministic allocation of the verified deficit across units, outcomes and
// pools. Reads only committed evidence — no database access, no network.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Pool } from "./types";

const ROOT = resolve(import.meta.dirname, "../../..");
const read = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

export const spec = read("EDUOS_CLASS_10_QUESTION_GENERATION_SPEC.json");
export const crosswalk = read("EDUOS_CLASS_10_VERIFIED_CROSSWALK.json");
export const evidence = read("content/compliance/class-10-2026-27.evidence.json");

/** Half of a unit's requirement is held back as a fresh-reassessment reserve. */
export const DIAGNOSTIC_TARGET: number = spec.depth_law.diagnostic_target;

export type OutcomeRef = {
  subject: "Mathematics" | "Science";
  bookId: string;
  unitId: string;
  unitTitle: string;
  outcomeId: string;
  outcomeCode: string;
  outcomeTitle: string;
  chapterId: string | null;
  chapterTitle: string | null;
  topicId: string | null;
  topicTitle: string | null;
  atomId: string | null;
  officialRequirementIds: string[];
  officialSourceReference: string | null;
};

type EvUnit = {
  unitId: string;
  title: string;
  status: string;
  chapters: {
    chapterId: string;
    title: string;
    topics: {
      topicId: string;
      title: string;
      curriculumOutcomes: { curriculumOutcomeId: string; assessmentOutcomeIds: string[] }[];
    }[];
  }[];
  assessmentOutcomes: { assessmentOutcomeId: string; code: string; title: string }[];
};

type EvBook = { bookId: string; title: string; subject: string; status: string; units: EvUnit[] };

/** assessment outcome id -> the real chapter / topic / atom that carries it. */
function locationIndex(book: EvBook) {
  const index = new Map<string, { chapterId: string; chapterTitle: string; topicId: string; topicTitle: string; atomId: string }>();
  for (const unit of book.units) {
    for (const chapter of unit.chapters) {
      for (const topic of chapter.topics) {
        for (const atom of topic.curriculumOutcomes) {
          for (const aoId of atom.assessmentOutcomeIds) {
            if (!index.has(aoId)) {
              index.set(aoId, {
                chapterId: chapter.chapterId,
                chapterTitle: chapter.title,
                topicId: topic.topicId,
                topicTitle: topic.title,
                atomId: atom.curriculumOutcomeId,
              });
            }
          }
        }
      }
    }
  }
  return index;
}

export function outcomeRefs(): Map<string, OutcomeRef> {
  const refs = new Map<string, OutcomeRef>();
  for (const book of evidence.books as EvBook[]) {
    if (book.subject !== "Mathematics" && book.subject !== "Science") continue;
    const loc = locationIndex(book);
    for (const unit of book.units) {
      for (const ao of unit.assessmentOutcomes) {
        const at = loc.get(ao.assessmentOutcomeId) ?? null;
        const rows = (crosswalk.rows as { subject: string; official_requirement_id: string; official_source_reference: string | null; assessment_outcome_ids: string[] }[])
          .filter((r) => r.assessment_outcome_ids.includes(ao.assessmentOutcomeId))
          .sort((a, b) => a.official_requirement_id.localeCompare(b.official_requirement_id));
        refs.set(ao.assessmentOutcomeId, {
          subject: book.subject as "Mathematics" | "Science",
          bookId: book.bookId,
          unitId: unit.unitId,
          unitTitle: unit.title,
          outcomeId: ao.assessmentOutcomeId,
          outcomeCode: ao.code,
          outcomeTitle: ao.title,
          chapterId: at?.chapterId ?? null,
          chapterTitle: at?.chapterTitle ?? null,
          topicId: at?.topicId ?? null,
          topicTitle: at?.topicTitle ?? null,
          atomId: at?.atomId ?? null,
          officialRequirementIds: rows.map((r) => r.official_requirement_id),
          officialSourceReference: rows[0]?.official_source_reference ?? null,
        });
      }
    }
  }
  return refs;
}

export type UnitAllocation = {
  subject: "Mathematics" | "Science";
  unitId: string;
  unitTitle: string;
  required: number;
  existingEligible: number;
  targetDiagnostic: number;
  targetReassessment: number;
  newDiagnostic: number;
  newReassessment: number;
  outcomes: string[];
  perOutcome: { outcomeId: string; diagnostic: number; reassessment: number }[];
};

/**
 * Depth law restated as two pools: the first `DIAGNOSTIC_TARGET` eligible items
 * of a unit form the diagnostic set, the remainder is the fresh-reassessment
 * reserve. Existing approved-and-verified items fill the diagnostic pool first,
 * so the deficit we author is exactly what the compliance validator reports.
 */
export function allocate(): UnitAllocation[] {
  const refs = outcomeRefs();
  const out: UnitAllocation[] = [];
  for (const unit of spec.units as {
    subject: "Mathematics" | "Science";
    eduos_unit_id: string;
    eduos_unit_title: string;
    governing: boolean;
    diagnostic_eligible: number;
    required_diagnostic_eligible: number;
    deficit: number;
  }[]) {
    if (!unit.governing || unit.deficit === 0) continue;
    const required = unit.required_diagnostic_eligible;
    const targetDiagnostic = Math.min(DIAGNOSTIC_TARGET, Math.ceil(required / 2));
    const targetReassessment = required - targetDiagnostic;
    const existing = unit.diagnostic_eligible;
    const existingDiagnostic = Math.min(existing, targetDiagnostic);
    const existingReassessment = existing - existingDiagnostic;
    const newDiagnostic = Math.max(0, targetDiagnostic - existingDiagnostic);
    const newReassessment = Math.max(0, targetReassessment - existingReassessment);

    const outcomes = [...refs.values()]
      .filter((r) => r.unitId === unit.eduos_unit_id)
      .sort((a, b) => a.outcomeCode.localeCompare(b.outcomeCode, "en"))
      .map((r) => r.outcomeId);

    const perOutcome = outcomes.map((outcomeId) => ({ outcomeId, diagnostic: 0, reassessment: 0 }));
    for (let i = 0; i < newDiagnostic; i += 1) perOutcome[i % perOutcome.length]!.diagnostic += 1;
    for (let i = 0; i < newReassessment; i += 1) perOutcome[i % perOutcome.length]!.reassessment += 1;

    out.push({
      subject: unit.subject,
      unitId: unit.eduos_unit_id,
      unitTitle: unit.eduos_unit_title,
      required,
      existingEligible: existing,
      targetDiagnostic,
      targetReassessment,
      newDiagnostic,
      newReassessment,
      outcomes,
      perOutcome,
    });
  }
  return out;
}

export function poolTag(pool: Pool): string {
  return pool === "DIAGNOSTIC" ? "DIAG" : "REASS";
}
