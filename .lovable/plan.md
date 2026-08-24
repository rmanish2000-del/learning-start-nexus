# Sprint 6R — Pilot Readiness & Consolidation

Make EduOS ready for the first real learner. No new features — fix the three blockers from the Curriculum Readiness Assessment: real book upload, one assessment pipeline, and a connected curriculum loop.

## Current state (verified in code)

- Book "upload" is JSON-only (`importCurriculum`); `storage_paths` is always empty, no file ever reaches the `books` bucket.
- Two parallel pipelines: Sprint 2 (`assessment_items` + `assessment_item_map`) runs the student session engine; Sprint 6 (`question_bank` + `assessment_question_map`) builds diagnostics **students cannot actually take** — `fetchAssessmentItems` only reads the legacy map.
- 6G gap analysis is read-only; submitted curriculum diagnostics never persist `learning_gaps`, so recommendations, interventions, tutor, and the Sprint 5 reassessment loop never fire for curriculum books.
- `submitAssessment` hardcodes subject "Mathematics" / topic "Fractions" in evidence + gap detection.

## 1. Real Book Upload

- `uploadBookFile` server fn (FormData, staff-only): validate type (PDF/TXT/MD) + size (≤15MB), create the `books` row, store the file in the `books` bucket at `{orgId}/{bookId}/{filename}`, record `storage_paths`/`file_names`/`mime_types`/`file_size_bytes`, status `uploaded`, log `book_events`.
- `extractCurriculumFromBook` server fn (staff-only): status `uploaded → processing`; download via role-checked client, extract text (`unpdf` for PDF — Worker-safe; plain read for TXT/MD), call the Lovable AI gateway for structured Units → Chapters → Topics → Learning Outcomes JSON, then persist through the **existing** `importCurriculum` path. Success → `ready`; failure → `failed` + `processing_error` + event log.
- `/curriculum` UI: Upload Book dialog (file + title/board/grade/subject), per-book "Extract curriculum" action with status badges (uploaded/processing/ready/failed) and error display. JSON import stays as an advanced option.

## 2. Pipeline Consolidation (one runner, one scorer)

- `fetchAssessmentItems`: if the assessment has `assessment_question_map` rows, load from `question_bank` (subtopic label = outcome code); otherwise legacy `assessment_item_map`. Single return shape.
- Extend session runner + scoring to all bank kinds (`mcq`, `true_false`, `fill_blank`, `short_answer`), reusing 6G's `gradeBankAnswer` normalization; `session.$sessionId.tsx` renders the new kinds.
- `submitAssessment`: use the assessment's real `subject`/`topic` (drop the Fractions hardcode); for curriculum assessments, persist `learning_gaps` per outcome (subtopic = outcome code) so Sprint 3 machinery works unchanged; keep the existing idempotent behavior.
- Recommendations: when a gap's outcome has `intervention_map` entries (6C), generate the recommendation from them; otherwise fall back to the existing deterministic rules.
- Deprecate, don't migrate: legacy item bank + Sprint 2 "create assessment" get a "Legacy" badge and creation is disabled; all historical data and Sprint 2–5 audits stay green. No table drops, no data migration.

## 3. Curriculum Path Integration (close the loop)

- Assign: existing `assignAssessment` already works for any published assessment — verify curriculum diagnostics assign cleanly.
- Reassessment: `openOutcomeForIntervention` currently picks "any published reassessment for subject/topic" — prefer the 6F-generated reassessment for the same book/unit as the learner's baseline diagnostic; fall back to legacy lookup.
- Finalize: `finalizeOutcomesForSession` already computes mastery lift from stored rows — verify it fires for curriculum reassessments end-to-end.
- Result: Upload → Extract → Blueprint → Questions → Diagnostic → student takes it → Gaps → Recommendation → Intervention → Tutor → Reassessment → Mastery Lift, all on one stack.

## Database

No schema changes expected — `books`, `learning_gaps`, `learner_outcomes`, and both maps already have the needed columns. (If a gap surfaces during implementation, it will be a minimal additive migration with GRANTs + RLS.)

## Verification

- Regression: sprint-3/4/5, diagnostic-engine, and gap-analysis audit centers still pass.
- Playwright end-to-end: staff uploads a real fixture file → extraction produces a tree → student takes a curriculum diagnostic → gap + recommendation persist → reassessment assigned → mastery lift recorded.
- Build passes; head() metadata on touched routes.

## Out of scope

New UI surfaces, audit-center additions, DOCX/image OCR, batch upload, migrating Sprint 2 history into question_bank.
