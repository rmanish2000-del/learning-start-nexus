# EduOS SME Review Workflow — Verification Evidence

**Scope:** named subject-expert review of the 326 existing Class 10 CBSE 2026–27
draft questions. No new content, no automatic approval, no certification change.

## Provenance limitation (read first)

The assignment cited verified staging commit
`f861a64adf110acd8783243ed336b0c704f12673` and an evidence file
`EDUOS_SME_REVIEW_STAGING_VERIFICATION.md`. **Neither is resolvable from the
canonical repository `learning-start-nexus`** — the commit is not an ancestor of
production HEAD and the evidence file did not exist. Byte-equivalence with the
staging artifact therefore **could not be established**. The workflow below was
implemented directly in the canonical repository against the acceptance criteria
in the assignment and verified here on first-hand evidence.

## Implementation

| Concern | Where |
|---|---|
| Queue + decision assembly (RLS client) | `src/lib/sme-review.server.ts` |
| Reviewer/admin server-function boundary | `src/lib/sme-review.functions.ts` |
| Shared contract, rules, candidate flags | `src/lib/sme-review-shared.ts` |
| Reviewer UI (`/sme-review`) | `src/routes/_authenticated/sme-review.tsx` |
| Database guarantees | migration `question_verifications_append_only` |
| Regression tests (14) | `src/lib/__tests__/sme-review.test.ts` |

## Guarantees verified

- **Authorization** — both server functions call
  `requireAnyRole(..., ["admin", "reviewer"])`; educators and parents are refused.
  The route sits under `_authenticated`.
- **No bulk approval** — the decision input accepts a single `questionId` (uuid);
  there is no array input and no select-all control. A statement-level database
  trigger raises `Bulk verification is not permitted` for any multi-row insert.
- **Explicit approval only** — a question reaches `status='approved'` +
  `verification_state='verified'` only when a reviewer inserts an explicit
  `verified` decision. Rejection never promotes.
- **Append-only trail** — `BEFORE UPDATE` and `BEFORE DELETE` triggers on
  `question_verifications` raise unconditionally, for every role including
  `service_role`; `UPDATE/DELETE/TRUNCATE` are revoked from `anon`/`authenticated`.
- **Named reviewer** — decisions require a reviewer name (2–120 chars), stored in
  the immutable note as `Named SME: <name>`.
- **Science book stays unapproved / both subjects NOT_CERTIFIED** — no code path
  changes book approval or certification state; the UI states this explicitly.

## Queue reconciliation (live database)

| Subject | Drafts (`draft` + `unverified`) | Expected |
|---|---|---|
| NCERT Class 10 Mathematics (CBSE) | 235 | 235 |
| NCERT Class 10 Science (CBSE) | 91 | 91 |
| **Combined unique items** | **326** | **326** |

## Advisory candidates — corrected counts

The assignment asked for **6 NCERT-overlap candidates and 2 near-duplicate
pairs**. The canonical validator artifact
`content/compliance/class-10-2026-27.draft-validation.json` supports
**4 overlap candidates and 1 near-duplicate pair**. The lower, evidence-backed
figures are surfaced; the additional items were **not fabricated**.

- Overlap candidates: `C10-2627-MATH-REQ024-DIAG-004`,
  `C10-2627-MATH-REQ022-DIAG-009`, `C10-2627-MATH-REQ032-DIAG-001`,
  `C10-2627-MATH-REQ034-REASS-005`
- Near-duplicate pair: `C10-2627-MATH-REQ001-DIAG-012` ↔
  `C10-2627-MATH-REQ001-REASS-013` (similarity 0.909)

Both sets are advisory only; a test asserts they equal the validator artifact.

## Gates

- Tests: 334/334 pass (29 files), including 14 new SME-review tests.
- Typecheck: clean. Production build: clean.
- Security scan: no new critical/high findings introduced by this change.

## Rollback

1. Revert the application commit containing `src/lib/sme-review*` and
   `src/routes/_authenticated/sme-review.tsx`, then republish.
2. Database rollback (optional — the guards are strictly protective):
   ```sql
   DROP TRIGGER IF EXISTS question_verifications_no_update_trg ON public.question_verifications;
   DROP TRIGGER IF EXISTS question_verifications_no_delete_trg ON public.question_verifications;
   DROP TRIGGER IF EXISTS question_verifications_no_bulk_trg ON public.question_verifications;
   ```
   The promotion trigger's `status` clause can be reverted to the prior body.

## Unresolved risks

- Staging equivalence unverifiable (see provenance limitation).
- Certification remains `SOURCE_PENDING`; both subjects `NOT_CERTIFIED` until
  named SME decisions are recorded on all 326 items.
