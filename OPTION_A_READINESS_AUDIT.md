# EduOS — Option A (Coaching Centre) Readiness Audit

**Date:** 2026-08-27 (UTC) · **Scope:** can EduOS run the coaching-centre business model end to end?

---

## 1. Verdict

**Option A is supported**, with three gaps closed in this assignment. Before this pass a centre
could be operated only by direct database work: there was no way to turn an approved application
into a live organization, and rosters had to be typed in one learner at a time.

| Capability | Before | Now |
|---|---|---|
| Centre applies for a pilot | Present (`/` pilot form → `public.pilot_leads`) | Unchanged |
| Platform admin reviews applications | Present (read-only list in `/admin`) | Approval action added |
| Centre organization provisioned | **Missing** | `approveCentreLead` creates the org + first centre admin |
| Centre admin account issued | **Missing** | Created with a one-time password shown once to the approver |
| Educator accounts | Present (`createStaffUser`, `/admin`) | Unchanged |
| Educator ↔ learner assignment | Present (`assignEducator`, `/learners`) | Unchanged |
| Learner created with sign-in | Present, one at a time | Bulk CSV import added |
| Diagnostic assignment to learners | Present (assessment lifecycle: Draft → Published → Assigned) | Unchanged |
| Gap detection, interventions, tutor, outcomes | Present | Unchanged |
| Centre metrics isolated from direct-parent learners | Present (`learner_mode`) | Unchanged |
| Organization data isolation | Present (RLS + `private` schema helpers) | Unchanged |

---

## 2. What was audited

- Application intake: `src/components/landing/pilot-form.tsx`, `public.pilot_leads` (RLS: admin-only
  read/update, public insert).
- Admin workflows: `src/routes/_authenticated/admin.tsx`, `src/lib/admin.functions.ts`,
  `src/lib/admin.server.ts` (`requireAnyRole`, `callerOrgId`).
- Educator management: staff creation, role updates, password reset — all admin-gated server-side.
- Learner management: `src/lib/learners.functions.ts` (`createLearner`, `resetLearnerPin`,
  `assignEducator`); student logins are handle + 6-digit PIN over a synthetic email.
- Assessment assignment and the gap → intervention → tutor → outcome loop.
- Metrics: `src/lib/educator-board.server.ts`, `src/lib/outcome-dashboard.server.ts` — both exclude
  `direct_parent` learners from centre aggregates.

---

## 3. Gaps closed

### 3.1 Centre registration → live organization

`approveCentreLead` (`src/lib/centre-onboarding.functions.ts`, admin-only) does, in one action:

1. creates `public.organizations` for the centre;
2. creates the first centre-admin auth user (pre-confirmed, random one-time password);
3. moves that admin's profile onto the new organization and ensures the `admin` role row;
4. stamps the lead as `approved` with `approved_org_id`, `approved_at`, `approved_by`.

If the admin account cannot be created the empty organization is rolled back, so a retry is clean.
Approval is idempotent: an already-approved lead is rejected.

UI: `/admin` → **Pilot applications** → *Approve & create centre*. The one-time password is shown
once, with a copy action.

### 3.2 Learner import (CSV)

`importLearners` (admin or educator) accepts up to 200 rows and, per row, creates the student auth
user, the `student` role row, and a `centre_managed` learner in the caller's organization, assigned
to the importing staff member. Rows are independent — a duplicate handle skips one row, never the
batch — and the result reports created and skipped rows.

Parsing is pure and shared (`src/lib/centre-onboarding-shared.ts`), so the dialog previews exactly
what the server will accept: header aliases, quoted fields, per-line validation, in-file duplicate
handle detection. Covered by `src/lib/__tests__/centre-onboarding.test.ts`.

UI: `/learners` → **Import CSV**, with a downloadable template.

### 3.3 Educator assignment

Already present and left unchanged: `assignEducator` on `/learners`, plus the bulk path where every
imported learner is assigned to the importing staff member at creation time.

---

## 4. Security notes

- Both new server functions run behind `requireSupabaseAuth` and an explicit `requireAnyRole` check;
  the privileged client is imported inside the handler only after the role check passes.
- The import writes into `callerOrgId(...)` — a centre can never import into another organization.
- Centre-admin passwords are random per approval and never stored in application tables.

## 5. Remaining (not blocking Option A)

- No self-service centre signup: approval stays a deliberate platform-admin action.
- One-time passwords are shown in the UI rather than emailed; add transactional email when the
  pilot expands beyond hand-held onboarding.
- Imported learners inherit the importer as educator; re-assignment is manual per learner.
