# Centre Onboarding — Live End-to-End Verification

Executed against the running application and the live database. Every step
below was driven through the real UI (no direct data seeding except the two
corrective backfills noted).

Test centre: **Meridian Coaching Centre** (org `22659f0e-…`)
Centre admin: `anita.deshmukh@meridiancoaching.test`

| # | Step | Result | Evidence |
|---|------|--------|----------|
| 1 | Submit centre application | PASS | Public landing form → row in `pilot_leads` (Meridian Coaching Centre, Anita Deshmukh) |
| 2 | Approve the application | PASS | Platform admin → Admin → "Approve & create centre"; lead status `approved`, one-time password issued on screen |
| 3 | Organization created | PASS | `organizations` row `22659f0e-…` "Meridian Coaching Centre" |
| 4 | First centre admin created | PASS | Auth user + profile scoped to the new org + `admin` role |
| 5 | Sign in as centre admin | PASS | Signed in; context bar reads "Org: Meridian Coaching Centre" |
| 6 | Import learners (CSV) | PASS | 3 learners imported: `anaya.mrd`, `rudra.mrd`, `tara.mrd` |
| 7 | Educator assignment | PASS | Assignments queue: 0 needing assignment, all 3 assigned to the centre admin |
| 8 | Assign a diagnostic | PASS | Curriculum JSON import → blueprint outcomes (5) → AI question bank (15, all approved) → Diagnostic Engine generated "Unit 1 — Number Systems — Unit Diagnostic (Auto)" → assigned to Anaya Bhat |
| 9 | Complete one diagnostic | PASS | Student signed in with handle + PIN, answered 9 questions, submitted; session `submitted`, score recorded |
| 10 | Outcomes, evidence, isolation | PASS | 3 outcome-level gaps + 3 recommendations generated with curriculum traceability (`LO_MAT10_U1_01..03`); zero rows leaked into the other centre's org |

## Bugs found and fixed during the run

1. **Imported learners could not see their own work.** `importLearnersImpl`
   created the auth user but left the profile attached to the first
   organization created by the signup trigger, so the org-scoped learner
   policy hid the learner from their own account (student home showed
   "No activities assigned yet" despite an assigned diagnostic).
   Fixed by re-homing the profile to the importing centre during import;
   the three already-imported accounts were backfilled.
2. **Approval dialog discarded the one-time password.** The post-approval
   refetch unmounted the dialog before the temporary centre-admin password
   could be copied. The dialog now stays mounted until dismissed.
3. **Sidebar showed a hard-coded centre name** ("Brightpath Learning") for
   every organization. It now renders the signed-in user's own centre.

## Remaining gap (product, not a defect)

A newly approved centre starts with an **empty content library** — no books,
outcomes, or questions. Before it can assign a diagnostic it must import a
curriculum (JSON or PDF upload), generate blueprint outcomes, generate and
approve questions, then generate a diagnostic. That chain works end to end
(proven above) but it is manual setup work; a shared CBSE Class 10 starter
pack for new centres would remove it.

## Checks

- Unit tests: 74/74 passing.
- Centre isolation: Meridian gaps/sessions carry `org_id = 22659f0e-…`; the
  existing centre's aggregates are unchanged.
