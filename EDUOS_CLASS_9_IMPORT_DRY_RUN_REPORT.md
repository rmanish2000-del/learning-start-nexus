# EduOS — Class 9 Import Dry-Run Report (Wave 1 Continuation)

Timestamp: 2026-08-29 00:10 IST (2026-08-28 18:40 UTC)
Command: `bun run scripts/class9/validate.ts` (read-only; the script contains no database client)

## 1. Database writes

**ZERO.** No migration was created, no row was inserted, updated or deleted in any environment.
The dry run re-derives the packs in memory and prints the rows an import *would* write.

## 2. Rows an import would write

| Target | Mathematics | Science | Total |
| --- | --- | --- | --- |
| `curriculum_units` | 6 | 4 | 10 |
| `curriculum_chapters` | 12 | 12 | 24 |
| `curriculum_topics` | 38 | 30 | 68 |
| outcomes (`curriculum_outcomes` / `assessment_outcomes`) | 38 | 30 | 68 |
| outcome atoms | 76 | 60 | 136 |
| `question_bank` | 240 | 160 | 400 |

Every question row would carry `status = draft`, `verification_state = unverified`,
`language = en`, and full provenance. No row would be approved, verified or diagnostic-eligible.

## 3. Idempotency

Identifiers and external references are position-derived, not random. Two consecutive builds
produced byte-identical files (digests in `EDUOS_CLASS_9_VALIDATION_REPORT.md`), so an
upsert keyed on `external_ref` would be a no-op on re-run. 400/400 references are unique.

## 4. Why no staging import was performed

- No isolated staging database exists for this project; the only reachable database is production.
- Preparation does not require rows: validation, the volume matrix and the subject-expert review
  packages are all produced from files.
- Writing 400 draft Class 9 questions into production would create cleanup risk with no benefit
  before human review.

Decision: **files + dry-run evidence only**, which is the assignment's preferred result.

## 5. Exclusion guarantees (verified)

| Guarantee | Evidence |
| --- | --- |
| Class 9 is inactive | `catalogue_classes.class_level = 9`, `is_active = false` |
| Class 9 is non-purchasable | 0 `catalogue_subjects` rows for Class 9 (non-purchasable by absence) |
| Class 9 is invisible in public selectors | no runtime module imports `content/class-9/*` or the Class 9 schema; only the non-runtime scripts and tests reference it |
| Class 9 cannot enter a paid diagnostic | diagnostic allocation selects `status = approved AND verification_state = verified` rows from `question_bank`; no Class 9 row exists at all |
| Class 10 unchanged | Class 10 remains the only active class with Mathematics and Science `purchasable` |

## 6. Rollback of an import (if one is ever performed)

1. Delete `question_bank` rows whose `external_ref` starts with `CBSE/2026-27/C9/`.
2. Delete outcomes, topics, chapters and units with the same reference prefix, child-first.
3. Delete any Class 9 `catalogue_subjects` rows (none exist today).
4. Re-run `scripts/class9/validate.ts` to confirm the file packs are unchanged.

Because nothing was written, no rollback is currently required.
