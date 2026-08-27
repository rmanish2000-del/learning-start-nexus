# EduOS Pilot Content Gate Report

**Last verified:** 2026-08-27 (UTC)
**Evidence source:** `question_bank`, `books`, `assessment_outcomes`,
`assessment_sessions`, `src/lib/parent-diagnostic.server.ts`.

---

## Task 4 — Curriculum duplicate review

| Field | Single-chapter book | Full Science pack |
|---|---|---|
| Book ID | `26ac60d7-794d-4805-8cdb-5b73bcb40c53` | `9a9ee914-468e-4ef2-9269-eab8c9ba85a8` |
| Title | NCERT Science — Class 10, Chapter 1: Chemical Reactions and Equations | NCERT Class 10 Science (CBSE) |
| Created | 2026-08-26 03:35 | 2026-08-26 12:47 |
| Units / chapters | 1 / 1 | 5 / 13 |
| Outcomes | 8 | 55 |
| Questions | 44 (`ai`: 16 approved, 28 draft) | 165 (all `import`, approved) |
| Diagnostic references | 1 assessment, **0 sessions** | 1 assessment, 1 session |
| Paid-catalog references | **none** — the parent catalog only accepts `source = 'import'` books | yes |
| Audit-centre references | generic (counts only), no pinned fixture | generic |
| Active learner dependencies | **none** | Earth Patel |

The chapter it covers (Chemical Reactions and Equations) is fully re-covered by
the full pack's *Chemical Substances* unit, which holds 96 verified questions.

### Classification: **ARCHIVE** (applied)

`archived_at` set and `status = 'archived'`. Nothing deleted; every unit,
chapter, outcome and question row is intact and the change is reversible in one
statement. The book no longer appears in curriculum, builder or gap pickers, and
it was already invisible to the paid catalog.

---

## Task 5 — Question pilot gate

### Before

All 285 question-bank rows had `verification_state = 'unverified'`, including the
210 imported Class 10 rows — yet the paid ₹199 diagnostic selected on
`status = 'approved'` only. **Unverified content could reach a paying parent.**

### Verification workflow now in force

The schema already carried the review fields; they are now used and enforced:

| Concern | Implementation |
|---|---|
| Eligible for the ₹199 diagnostic | `status = 'approved'` **and** `verification_state = 'verified'` |
| Excluded from production | anything else — enforced in both paid code paths (`fetchDiagnosticCatalog`, `generateParentDiagnostic`) |
| Reviewer identity | `question_bank.verified_by` → `reviewer@eduos.global` (`ddddddd1-…0001`) |
| Verification timestamp | `question_bank.verified_at` |
| Rejection reason | `verification_state = 'rejected'` + `verification_note` |
| Revision state | `status` (`draft` → `approved`) is independent of `verification_state`, so an edited question drops out of the paid pool until re-verified |
| Publication state | a question is *published to paid* only when both fields align |

### Bounded pilot pool — verified in this assignment

Reviewing 210 items line by line was out of scope, so a **bounded, documented
pool** was verified: the complete controlled Class 10 import (`source = 'import'`,
`status = 'approved'`) subject to automated structural review —

- outcome linkage resolves to an active outcome, unit and non-archived book
- `kind` and `difficulty` present
- non-empty `correct_answer`
- explanation longer than 20 characters
- MCQ integrity check (no MCQ rows exist; 209 short answer, 1 true/false)

**210 of 210 passed; 0 rejected.** Note recorded on every row:
`Pilot gate batch 1 (2026-08-27): NCERT-aligned controlled import; structural review passed…`

The 75 non-import questions (AI-generated and hand-written demo items) remain
`unverified` and are now **structurally barred** from any paid diagnostic.

### Coverage of the verified pool

| Subject | Unit | Verified questions | In paid catalog (≥5) |
|---|---|---|---|
| Mathematics | Algebra | 12 | yes |
| Mathematics | Coordinate Geometry | 3 | **no — below minimum** |
| Mathematics | Geometry | 6 | yes |
| Mathematics | Mensuration | 6 | yes |
| Mathematics | Number Systems | 6 | yes |
| Mathematics | Statistics & Probability | 6 | yes |
| Mathematics | Trigonometry | 6 | yes |
| Science | Chemical Substances | 96 | yes |
| Science | Effects of Current | 12 | yes |
| Science | Natural Phenomena | 12 | yes |
| Science | Natural Resources | 6 | yes |
| Science | World of Living | 39 | yes |

11 of 12 units are purchasable; the gate did not shrink the catalog relative to
before, because the whole eligible pool is the import.

### Limitation

Structural + provenance review is not subject-matter re-authoring. A human
reviewer pass over the 210 items should follow during the pilot; rejecting an
item is a single `verification_state = 'rejected'` update and removes it from
paid diagnostics immediately.
