# EduOS Assessment Lifecycle Regression Report

Scope: two P0 defects in staff assessment creation, fixed and verified separately.
Product law reaffirmed: **Create → Draft**. Creation never publishes and never assigns.
Assessment titles are labels, not identifiers.

---

## ISSUE 1 — New assessments classified as legacy and unpublishable

### Reproduction
Staff created an assessment from the creation dialog. The draft did not appear in
Active Assessments, surfaced under the read-only archive, and the publish gate
refused it with an active-scope error.

### Root cause
`createAssessment` persisted hardcoded pilot metadata (`grade: 6`,
`subject: Mathematics`, `topic: Fractions`) taken from the archived Grade 6 item
bank. `isLegacyContent` therefore flagged every new record as archived pilot
content, and the publish gate (active scope = CBSE Class 10 Mathematics and
Science) could never pass.

### Fix
- New `createAssessmentDraft` in `src/lib/assessments.server.ts` derives board,
  grade, subject and topic from the selected curriculum book and unit.
- `src/lib/assessments.functions.ts` rejects legacy Grade 6 item-bank payloads
  outright with an explanatory error.
- Creation dialog in `src/routes/_authenticated/assessments.tsx` rebuilt as
  Book → Unit → verified-question selection.

### Tests
`src/lib/__tests__/assessment-draft-creation.test.ts` (11 tests): metadata
inheritance for Mathematics and Science, active (non-legacy) classification,
archived/demo book rejection, non-CBSE rejection, unit/outcome alignment,
duplicate-question rejection, unverified-question rejection, draft status.

### Verification
Valid Class 10 draft stays active, publishes, and can then be assigned. Legacy
Grade 6 content remains archived and read-only.

### Commit
`af55c744e5ba61c2d19f5d3e2b4dd0f9c4de2ce6` (Issue 1 correction, superseded by the
combined HEAD below).

---

## ISSUE 2 — Same-title drafts silently discarded

### Reproduction
1. Draft A: CBSE Class 10 book/unit, title `Same Title Regression Test`,
   description A, verified question set A, clientRequestId A.
2. Draft B, moments later: same title, description B, question set B,
   clientRequestId B.
3. Observed defect: the UI reported "saved as draft", the server returned
   **Draft A's id**, and description B plus question set B were never persisted.
   No warning was shown; the second row never existed in `public.assessments`.

### Root cause
`createAssessment` treated `title + created_by + status=draft + created_at`
within a 2-minute window as the idempotency key:

```ts
const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
// ...eq("title", data.title).gte("created_at", since)
if (existing) return { id: existing.id, deduped: true };
```

The supplied `clientRequestId` was only used as a boolean trigger and was never
compared or persisted. Any second intentional create with a repeated title inside
the window short-circuited before the insert — silent staff-content loss.

### Fix
Idempotency is now request-scoped and enforced by the database.

- Migration `20260828055655_*.sql`: additive `client_request_id uuid` column on
  `public.assessments` plus partial unique index on `(org_id, client_request_id)`
  where the column is not null. No backfill, no global uniqueness, nullable —
  rollback is a drop of the index and column with no data implications.
- `createAssessmentDraft` persists the request id. On unique violation `23505`
  it re-reads the row created for that exact `(org_id, client_request_id)` pair
  and returns it as `deduped: true`. Every other error still throws.
- The title/time-window lookup was deleted with no fallback.
- The client regenerates the request id on form reset and after a successful
  save, so each intentional Create action carries a fresh id while a retry of an
  in-flight submission reuses it. The submit button is disabled while pending.
- Editing an existing draft remains an explicit update keyed by assessment id;
  no update is ever inferred from title or creation time.
- Authorization, tenant scoping, active-scope validation, verified-question
  validation and publish gates are unchanged and still run before any insert.

### Tests
`src/lib/__tests__/assessment-request-idempotency.test.ts` (12 tests), plus the
test double now emulates the unique index:

1. one request creates exactly one draft;
2. retry with the same request id returns the same draft, no duplicate;
3. same title with a different request id creates a second draft;
4. Draft A retains description A and question set A;
5. Draft B retains description B and question set B, and is the returned row;
6. same title across different users does not collide;
7. same title across different organizations does not collide;
8. three rapid intentional submissions remain three distinct drafts;
9. concurrent double-submit of one request collapses to one draft;
10. request id does not bypass active-scope validation;
11. request id does not bypass verified-question validation;
12. failed question-map insert leaves no partial assessment.

Issue 1 cover (11 tests) re-ran green, proving no regression.

### Verification
Draft A and Draft B both appear in Active Assessments with their own
descriptions and question maps; the create response carries Draft B's id.
Draft → Review → Publish → Assign sequencing is unchanged.

### Combined authoritative result
Full Vitest suite: **97/97 passing** (11 files). Typecheck clean. Production
build clean.

### Commit
Recorded in `EDUOS_FINAL_PUBLIC_EXPERIENCE_RELEASE_REPORT.md` as the final
combined application SHA.

---

## Known limitations
- Idempotency keys are stored on the assessment row rather than a separate
  idempotency ledger; a deleted draft frees its key for reuse. Acceptable for
  the pilot: keys are client-generated UUIDs and never reused in practice.
- `client_request_id` is internal and never surfaced as a UI label.
- Requests submitted without a request id (older clients) are always treated as
  new intentional creates — the safe direction, since no content is discarded.
