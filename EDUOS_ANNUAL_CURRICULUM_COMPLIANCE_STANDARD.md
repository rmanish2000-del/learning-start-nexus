# EduOS Annual CBSE/NCERT Curriculum Compliance Standard

**Status:** ACTIVE (v1) · **Owner:** Founder · **Machine core:** `src/lib/compliance-shared.ts` · **Validator:** `compliance-validator/1.0.0`

This standard is reusable for every board, class and subject EduOS ever offers. Class 10 Mathematics and Science for session 2026-27 are its first application. Class 9 is on HOLD. Class 12 generation has not begun.

---

## 1. Compliance definition

A subject-year is **compliant** only when all seven statements below are simultaneously true and machine- or reviewer-evidenced.

1. **Source truth.** Every assessable element traces to an official CBSE or NCERT document recorded in the source registry with a checksum, retrieval timestamp and applicability decision. No coaching material, no third-party site, no model output is authority.
2. **Complete coverage.** Every assessable unit, chapter and topic in the official syllabus for that session exists in the platform curriculum, mapped exactly once.
3. **No out-of-syllabus content.** No active platform node is assessable unless it maps to an official element for that session. Enrichment content is allowed but must be flagged non-assessable and excluded from diagnostics.
4. **Learning-outcome integrity.** Every mapped topic carries at least one learning outcome; every outcome carries at least one atom; no orphans in either direction.
5. **Question sufficiency and depth.** Verified items per unit ≥ `max(2 × diagnostic target, 2 × outcomes × minimum per outcome, 2 × diagnostic minimum)`, with ≥2 difficulty bands and ≥2 question types, and no duplicates. The factor of two exists so a learner can sit a diagnostic and then a *fresh* reassessment without seeing the same item.
6. **Loop integrity.** Diagnostic → gap → intervention → tutor → reassessment → outcome report all operate within the same session's scope, and reports are labelled with the academic session.
7. **Named human review.** A subject expert with a name, timestamp and explicit decision has approved the mapping and content. Absence of a reviewer is a blocking gap, not a warning.

A subject-year that fails any statement is **not** compliant and must not be sold, activated or advertised for that session.

## 2. Non-negotiable laws

- **Annual regeneration, never mutation.** A new session is a new curriculum version. The previous session's nodes, questions, evidence and reports are preserved verbatim and marked `SUPERSEDED`, never edited in place, never deleted.
- **Historical evidence is immutable.** Learner evidence, diagnostics and outcome reports are read-only artefacts of the session they were produced in. A later syllabus change never re-labels past learner history.
- **No silent rollover.** No question, outcome or blueprint automatically becomes valid for a new session. Everything is re-classified (`src/lib/compliance-shared.ts` → `classifyQuestionRollover`).
- **Ambiguity escalates.** Anything the diff engine cannot prove is `AMBIGUOUS` / `HUMAN_REVIEW_REQUIRED` and blocks activation.
- **Official first.** Where sources conflict, the authority order in the source registry decides; an erratum or corrigendum overrides everything for the corrected item.
- **Commerce follows compliance.** A subject becomes purchasable only after the compliance gate passes for the *active* session. Entitlements are scoped to board/class/subject/session and never leak across years.
- **Determinism.** Every compliance verdict is reproducible from committed files plus a read-only snapshot export; the validator version is recorded with the verdict.

## 3. Curriculum version lifecycle

`DRAFT → SOURCE_VERIFIED → MAPPED → GAP_ANALYSED → CONTENT_READY → SUBJECT_EXPERT_REVIEWED → APPROVED → ACTIVE → SUPERSEDED → ARCHIVED`

Transitions are forward-only, one step at a time; `ARCHIVED` is terminal; a rollback is a new version, not a reversal. Exactly one `ACTIVE` version may exist per board/class/subject at a time (`validateVersionSet`).

Version identity: `board · class · subject · academicSession · sourceVersion · curriculumVersion`.

## 4. Compliance status vocabulary

`NOT_ASSESSED` · `SOURCE_PENDING` · `MAPPING_INCOMPLETE` · `CONTENT_GAPS` · `REVIEW_PENDING` · `COMPLIANT` · `COMPLIANT_WITH_ACCEPTED_LIMITATIONS` · `SUPERSEDED` · `BLOCKED`

Only `COMPLIANT` and `COMPLIANT_WITH_ACCEPTED_LIMITATIONS` (with founder-recorded limitations) permit sale for the session. The status is derived, not typed by hand: `deriveComplianceStatus(gates)`.

Each recorded verdict stores: board, class, subject, session, status, assessment timestamp, source set, curriculum version, gap count, reviewer evidence, validator version and report reference.

## 5. Public claim discipline

EduOS may state that its content is "prepared against the CBSE/NCERT syllabus for session X" only for subject-years whose recorded status is compliant. Until then, public copy must not claim syllabus completeness, board alignment guarantees or exam-outcome guarantees. Certification, accreditation and "CBSE-approved" style claims are never permitted — EduOS is not a board-approved publisher.

## 6. Artefacts of this standard

| Artefact | Path |
|---|---|
| Machine contracts, diff engine, gates | `src/lib/compliance-shared.ts` |
| Source registry (data) | `content/compliance/cbse-2026-27.sources.json` |
| Official curriculum reference spine | `content/compliance/cbse-2026-27.official-curriculum.json` |
| Live coverage snapshot (read-only export) | `content/compliance/class-10-2026-27.snapshot.json` |
| Exporter / validator / report generator | `scripts/compliance/*` |
| Source registry specification | `EDUOS_OFFICIAL_SOURCE_REGISTRY_SPEC.md` |
| Change classification and impact model | `EDUOS_CURRICULUM_CHANGE_CLASSIFICATION_AND_IMPACT.md` |
| Subject compliance gate definition | `EDUOS_SUBJECT_COMPLIANCE_GATE.md` |
| Class 10 2026-27 coverage audit (generated) | `EDUOS_CLASS_10_2026_27_COMPLETE_COVERAGE_AUDIT.md` |
| Annual rollover runbook | `EDUOS_ANNUAL_ROLLOVER_RUNBOOK.md` |

## 7. Current application state (2026-08-28)

CBSE Class 10 Mathematics and Science, session 2026-27: **SOURCE_PENDING** for both subjects. The framework is in force; the subjects are not yet certified compliant. Details and per-unit evidence are in the generated coverage audit.
