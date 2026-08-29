// Emits EDUOS_CLASS_10_FINAL_CURRICULUM_MAP.json — the rebuilt, active
// 2026-27 CBSE Class 10 Mathematics and Science structure with its official
// requirement linkage. Read-only: derived from committed evidence.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { crosswalk, evidence } from "./allocate";
import { buildItems } from "./build";

const ROOT = resolve(import.meta.dirname, "../../..");
const items = buildItems();

type Row = { subject: string; official_requirement_id: string; official_unit: string; official_chapter: string; official_topic: string; official_source_reference: string | null; assessability: string; eduos_unit_id: string; assessment_outcome_ids: string[] };
const rows = crosswalk.rows as Row[];

const ACTIVE_BOOK_IDS = new Set([
  "1ab1e104-8ecb-465e-a5f0-d9bd94641623", // NCERT Class 10 Mathematics (CBSE)
  "9a9ee914-468e-4ef2-9269-eab8c9ba85a8", // NCERT Class 10 Science (CBSE)
]);
const books = (evidence.books as any[]).filter((b) => ACTIVE_BOOK_IDS.has(b.bookId));

const map = {
  generated_at: "2026-08-29T00:00:00.000Z",
  board: "CBSE",
  class_level: 10,
  academic_year: "2026-27",
  subject_codes: { Mathematics: ["041", "241"], Science: ["086"] },
  official_sources: evidence.officialSources ?? null,
  pilot_content: {
    disposition: "RETIRED_FROM_ACTIVE_2026_27",
    book: "CBSE Class 10 Mathematics — Meridian Pilot",
    action: "book archived, its questions retired; rows and learner history preserved",
  },
  subjects: books.map((book) => {
    const subjectRows = rows.filter((r) => r.subject === book.subject);
    return {
      subject: book.subject,
      book_id: book.bookId,
      book_title: book.title,
      book_status: book.status,
      units: book.units.length,
      chapters: book.units.reduce((n: number, u: any) => n + u.chapters.length, 0),
      requirements: subjectRows.length,
      unmapped_requirements: subjectRows.filter((r) => r.assessment_outcome_ids.length === 0).length,
      new_draft_questions: items.filter((i) => i.subject === book.subject).length,
      unit_detail: book.units.map((u: any) => ({
        unit_id: u.unitId,
        title: u.title,
        status: u.status,
        chapters: u.chapters.map((c: any) => ({ chapter_id: c.chapterId, title: c.title, topics: c.topics.length })),
        assessment_outcomes: u.assessmentOutcomes.length,
        atoms: u.chapters.reduce((n: number, c: any) => n + c.topics.reduce((m: number, t: any) => m + t.curriculumOutcomes.length, 0), 0),
        official_requirements: subjectRows.filter((r) => r.eduos_unit_id === u.unitId).map((r) => r.official_requirement_id),
        new_draft_questions: items.filter((i) => i.unitId === u.unitId).length,
      })),
    };
  }),
};

writeFileSync(resolve(ROOT, "EDUOS_CLASS_10_FINAL_CURRICULUM_MAP.json"), `${JSON.stringify(map, null, 2)}\n`);
console.log(JSON.stringify(map.subjects.map((s) => ({ subject: s.subject, units: s.units, chapters: s.chapters, requirements: s.requirements, unmapped: s.unmapped_requirements, drafts: s.new_draft_questions })), null, 2));
