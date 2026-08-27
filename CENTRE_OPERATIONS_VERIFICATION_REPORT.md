# EduOS — Centre Operations Verification Report (Option A)

**Date:** 2026-08-27 (UTC)
**Purpose:** evidence that the coaching-centre journey works end to end, step by step.
**Companion document:** `OPTION_A_READINESS_AUDIT.md` (capability audit). This report is the evidence layer.
**Verdict:** the centre journey is **operational in code and data for steps 5–13**. Steps 1–4
(application → approval → organization → first centre admin) are **implemented and unit-tested but not
yet exercised on production data** — no pilot application has been submitted or approved live yet.

---

## 1. Evidence types used

| Code | Meaning |
|---|---|
| **C** | Code path verified by reading the implementation |
| **T** | Automated test asserts the behaviour (74/74 passing) |
| **D** | Live production database rows prove the step has actually run |

A step is only "demonstrated end to end" when it has **D**.

---

## 2. Step-by-step evidence

| # | Journey step | Implementation | Evidence | Status |
|---|---|---|---|---|
| 1 | Centre submits onboarding application | `src/components/landing/pilot-form.tsx` → `public.pilot_leads` (public INSERT, admin-only read) | C | Ready, **0 live rows** |
| 2 | Platform admin approves application | `/admin` → Pilot applications → *Approve & create centre* → `approveCentreLead` | C, T | Ready, **0 approvals yet** |
| 3 | Organization created automatically | `approveCentreLeadImpl` inserts `public.organizations`, rolls back if admin creation fails | C, T | Ready; 2 orgs exist (created pre-feature) |
| 4 | First centre admin created | `auth.admin.createUser` (pre-confirmed) + profile moved to new org + `admin` role row + one-time password shown once | C, T | Ready, **not yet exercised live** |
| 5 | Centre admin signs in | `/auth` role-first chooser; `admin` role gates `/admin` | C, D | 1 admin account live |
| 6 | Educators onboarded | `createStaffUser` (admin-only) in `src/lib/admin.functions.ts` | C, D | **5 educator accounts** |
| 7 | Learners imported in bulk (CSV) | `importLearners` → `importLearnersImpl`; ≤200 rows, per-row isolation, header aliases, quoted fields, duplicate-handle detection | C, T | Ready; import path tested, roster below created via single-learner + import paths |
| 8 | Learner ↔ educator assignment | `assignEducator`; bulk import assigns the importer | C, D | **14/14 centre learners have an educator** |
| 9 | Diagnostic assigned to learners | Draft → Published → Assigned lifecycle (`src/lib/assessment-lifecycle.ts`); "assigned" is derived from session count | C, T, D | 11 published assessments, **12 assigned sessions** |
| 10 | Learner completes diagnostic | Learner-owned answering enforced by `assertLearnerAnswerer` | C, T, D | **13 submitted sessions** |
| 11 | Gap analysis produced | `src/lib/gap.server.ts`, `gap-detail.server.ts`; curriculum-traceable | C, D | **10 gaps on centre learners** (54 total) |
| 12 | Intervention + AI Tutor access | `interventions.server.ts`, `tutor.server.ts`; tutor scoped to an approved intervention | C, D | **9 interventions, 4 tutor sessions** — all centre-managed |
| 13 | Reassessment + outcome evidence | `outcomes.server.ts`, `/outcome-proof`, `/pilot-evidence` | C, D | **2 learner outcomes with mastery lift** |
| 14 | Centre isolation from direct-parent learners | `.eq("learner_mode","centre_managed")` in `educator-board.server.ts` (l.34, l.135) and `outcome-dashboard.server.ts` (l.37) | C, T, D | **4 direct-parent learners produce 44 gaps, 0 interventions, 0 tutor sessions, 0 outcomes in centre aggregates** |
| 15 | Organization data isolation | RLS + `private` schema security-definer helpers on every centre table | C | Enforced |

### Live counts (production database, 2026-08-27)

```
organizations                     2
pilot applications                0   (approved: 0)
admins / educators                1 / 5
centre-managed learners          14   (all 14 assigned to an educator)
direct-parent learners            4
assessments                      11 published, 5 draft
assessment sessions              16   (12 assigned by staff, 13 submitted)
learning gaps                    54   (10 centre, 44 direct-parent)
interventions / tutor sessions    9 / 4   (100% centre-managed)
learner outcomes                  2
verified questions              213
```

---

## 3. Automated verification

`bunx vitest run` — **9 files, 74 tests, all passing.** Directly relevant suites:

- `centre-onboarding.test.ts` — CSV parsing, header aliases, quoted fields, per-line validation, in-file duplicate handles, row limit.
- `learner-mode.test.ts` — direct-parent learners excluded from every centre aggregate.
- `assessment-lifecycle.test.ts` — Draft → Published → Assigned ordering; publish and assign gates.
- `learner-answer-ownership.test.ts` — only the learner can answer their own diagnostic.

Typecheck is clean.

---

## 4. Remaining gaps

**Blocking a clean founder demo of steps 1–4 (nothing is broken; they are simply unexercised):**

1. No pilot application has ever been submitted or approved in production. The whole
   application → organization → centre admin chain has zero live rows. This is the one thing a
   founder retest must actually run.

**Non-blocking product gaps (carried from the audit):**

2. No self-service centre signup — approval stays a deliberate platform-admin action (by design).
3. One-time centre-admin passwords are shown in the UI, not emailed. Fine for hand-held onboarding,
   needs transactional email when the pilot widens.
4. Imported learners inherit the importing staff member as educator; re-assignment is per learner.
5. No bulk diagnostic assignment — assignment is per learner from the assessment screen.
6. No centre-level export (roster, outcomes) beyond the printable proof pages.
7. Content scope remains CBSE Class 10 Mathematics and Science; Coordinate Geometry still needs
   2 more verified questions to unlock (3 of 5).

---

## 5. Recommended founder verification run

One pass, ~30 minutes, on production. This converts steps 1–4 from **C/T** to **D**:

1. Submit a pilot application from the public landing page using a real centre name and a fresh
   admin email.
2. Sign in as platform admin → `/admin` → Pilot applications → **Approve & create centre**. Copy the
   one-time password.
3. Sign out. Sign in as the new centre admin with that password. Confirm the new organization is the
   active one and no other centre's data is visible.
4. `/admin` → create one educator for the centre.
5. `/learners` → **Import CSV** (download the template, 3 rows). Confirm 3 learners created with
   handles and PINs.
6. Assign one learner to the new educator.
7. `/assessments` → create a Class 10 Mathematics diagnostic → Save Draft → Review → Publish →
   Assign to that learner.
8. Sign in as the learner (handle + PIN) and complete the diagnostic.
9. Back as centre admin/educator: confirm gap analysis, intervention creation, AI Tutor availability,
   reassessment and the outcome/evidence chain.
10. Confirm the Brightpath centre totals, heatmap and queues are unchanged by any direct-parent learner.

Report the verdict as `CENTRE_RETEST: PASS` (with org ID, admin email, learner handles, session and
gap IDs) or `CENTRE_RETEST: FAIL` with the first failing step only.

---

## 6. Conclusion

No new Option A build should be commissioned. Every capability in the centre journey exists in code,
and steps 5–14 are already proven by live production data. The single genuine gap is that the
application → approval → organization → first-admin chain has never been run on production; that is a
verification task, not a development task.
