# EduOS — Class 10 (CBSE, 2026–27) Subject-Expert Review Guide

Scope: the 326 rebuilt Class 10 draft items (Mathematics 235, Science 91).
Status of every item today: `draft` / `unverified` / `REVIEW_PENDING`.
Nothing in these files changes the database. Approval happens only after signed
decisions are returned and imported.

## Package contents

| File | Purpose |
| --- | --- |
| `EDUOS_CLASS10_MATHEMATICS_EXPERT_REVIEW.xlsx` | 235 Mathematics items, one per row |
| `EDUOS_CLASS10_SCIENCE_EXPERT_REVIEW.xlsx` | 91 Science items, one per row |
| `EDUOS_CLASS10_EXPERT_DECISIONS_IMPORT_TEMPLATE.csv` | Flat decision sheet for all 326 items |
| `EDUOS_CLASS10_EXPERT_REVIEW_GUIDE.md` | This guide |

Generator: `scripts/class10/export_expert_review.py` (deterministic, read-only,
sourced from `EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json`).
No learner, parent, payment or account data appears in any file.

## Workbook layout

Sheet **Review** — columns A–N are system-generated and locked:

Question ID · Subject · Unit · Chapter · Official requirement · Outcome ·
Atom/concept · Question · Options · Correct answer · Explanation · Difficulty ·
Source reference · Current status

Columns O–T are the only editable cells (green):

| Column | Rule |
| --- | --- |
| Expert decision | Drop-down: `APPROVE`, `REVISE`, `REJECT` |
| Expert correction | Required when the decision is `REVISE` — give the exact replacement wording, options or answer |
| Expert comments | Reason for `REVISE` / `REJECT`, or any caution on an approved item |
| Reviewer name | Full name of the person taking responsibility for the decision |
| Qualification | e.g. "M.Sc. Mathematics, 12 years CBSE Class 10" |
| Review date | `YYYY-MM-DD` |

Sheet protection is on (no password) so the system columns cannot be edited by
accident. Filtering and sorting stay available.

Sheet **Summary** — live counts: totals, decision counts, and a per-unit
breakdown of questions / approved / revise / rejected. The numbers update as
decisions are entered.

## How to review an item

1. Check the question against the stated **Official requirement**, **Outcome** and
   **Source reference** for the 2026–27 syllabus. Out-of-syllabus or rationalised
   content is a `REJECT`.
2. Verify the **Correct answer** independently, including any arithmetic.
3. Check the **Explanation** teaches the method, not just the answer.
4. Check language, units, and that options contain exactly one defensible answer.
5. Confirm the **Difficulty** (1 easy → 4 hard) is honest for a Class 10 cohort.
6. Record the decision. Every row must carry a decision — blanks block sign-off.

Decision meanings:

- **APPROVE** — usable as written; may be published to learners.
- **REVISE** — sound intent, defective execution; the correction column must contain the fix.
- **REJECT** — off-syllabus, wrong, ambiguous or unsalvageable.

## Returning the review

Return the completed workbook(s), or the completed CSV, to the EduOS application
team. On receipt we:

1. Reconcile the returned Question IDs to the 326 in the register.
2. Apply corrections to `REVISE` items and re-run the deterministic validator.
3. Promote only `APPROVE` items to `verified`; only then can they be selected by a
   live diagnostic or reassessment.
4. Record reviewer name, qualification and date against each item for the
   compliance REVIEW_GATE.

Until that import runs, the Class 10 2026–27 compliance status stays
`SOURCE_PENDING / REVIEW_PENDING` and no draft item can reach a learner.
