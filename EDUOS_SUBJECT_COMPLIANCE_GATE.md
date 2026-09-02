# EduOS Subject Compliance Gate (reusable, all boards/classes/subjects)

**Machine core:** `runComplianceGates` / `deriveComplianceStatus` in `src/lib/compliance-shared.ts`
**Run:** `bun run scripts/compliance/validate.ts` (read-only, deterministic, non-zero exit on failure)

A subject-year passes only when all seven gates pass. Every check is objective and evidence-backed.

## SOURCE_GATE
- at least one applicable official source recorded for the subject-year
- all required source types present (curriculum, subject syllabus, NCERT textbook, rationalised-content notice, sample paper, marking scheme)
- source registry validates with zero errors (checksums, applicability, supersession)

## CURRICULUM_GATE
- every assessable official unit/chapter mapped exactly once
- no duplicate mapping of an official element
- no active platform unit without an official mapping
- every mapped source book is in `approved` state

## OUTCOME_GATE
- every unit has outcomes
- every outcome carries at least one atom (no orphan outcomes)
- no atom without a parent outcome

## QUESTION_GATE
- verified items per unit ≥ `max(2 × diagnostic target, 2 × outcomes × min per outcome, 2 × diagnostic minimum)`
- every atom has at least one question
- ≥2 difficulty bands and ≥2 question types per unit
- zero duplicates

## LEARNING_LOOP_GATE
- diagnostic selects approved + verified items only
- gap detection, intervention generation and tutor scope operate on the session's curriculum
- reassessment reserve available
- outcome report labelled with the academic session

## REVIEW_GATE
- named subject-expert reviewer, review timestamp and explicit decision recorded
- zero unresolved ambiguities from the change diff

## COMMERCIAL_GATE
- the active academic session matches the session under audit
- only an APPROVED curriculum version is purchasable
- public class/subject selectors show exactly the compliant scope
- entitlements scoped to board/class/subject/session
- pricing approved for the session

## Status derivation

Failures resolve to the first blocking category: source → mapping → content/loop → review; otherwise `BLOCKED`. All gates green → `COMPLIANT`, or `COMPLIANT_WITH_ACCEPTED_LIMITATIONS` when the founder has recorded explicit accepted limitations.

## Class 10 2026-27 result (revalidated 2026-09-02)

Mathematics **SOURCE_PENDING** (7 failing checks) · Science **SOURCE_PENDING** (9 failing checks) · overall `SOURCE_PENDING`. Supersedes the 2026-08-28 result of 11/13 failing checks, which predated the source-registry correction. Per-check evidence: `EDUOS_CLASS10_COMPLIANCE_BASELINE.md`, `EDUOS_CLASS_10_GAP_REGISTER.md` and `EDUOS_CLASS_10_2026_27_COMPLETE_COVERAGE_AUDIT.md`.
