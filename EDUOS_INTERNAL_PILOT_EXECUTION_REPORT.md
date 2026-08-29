# EduOS — Internal Pilot Execution Report

Date: 2026-08-29 · Authority: Application Authority · Repository: learning-start-nexus · Priority: P0

## Verdict

**READY_FOR_INTERNAL_PILOT** (paid ₹199 gateway leg excluded — see Known limitations)

Every stage below was executed against the running application with a real
browser session and real backend writes. No stage was simulated or asserted
from source reading alone.

## Phase 1 — Internal pilot dataset

| Entity | Identifier | Internal tag |
|---|---|---|
| Parent auth user | `797af203-d14a-4f4e-af80-d692db369f38` | internal pilot account, synthetic |
| Parent profile | "Internal Pilot Parent", mobile `9800000001` | non-production |
| Child profile | `fcf01804-83b3-434a-9ba5-29a1a70b3702` "Internal Pilot Learner" | `learners.is_demo = true`, focus note "INTERNAL PILOT — non-production test learner." |
| Student login | handle `internalpi-84fee8be`, 6-digit PIN | synthetic `@student.eduos.local` identity |
| Session | `49ed1d84-7369-4c73-a242-14d47a88bc33` | submitted |

No production family data was created, read into the report, or modified.

## Phase 2 — Journey execution

### Journey A — Parent signup → add learner → handle/PIN — PASS
- Signed-in parent with no role row is claimed into the `parent` role and lands
  in the parent portal.
- Parent details (name + mobile) captured in the portal, then "Add child"
  created the learner and the parent-learner link (server response observed:
  learner id, grade 10, board CBSE).
- "Create login" issued the student account and returned the handle;
  `setStudentLoginPin` returned `created: true`.

### Journey B — Learner login → workspace — PASS
- Student signed in at the Student tab with handle + PIN and landed in the
  student workspace with the diagnostic call-to-action, plan placeholder and
  onboarding checklist rendered.

### Journey C — Diagnostic → scoring → report — PASS (unpaid self-serve path)
- Self-serve diagnostic allocated 6 items from the Class 10 Number Systems unit
  (`Number Systems — Parent Diagnostic`), auto-save restored answers across
  reloads, and submission produced a scored review screen
  (`0% (0/6 correct)`, per-item correct answer and rationale shown).
- The paid ₹199 allocation path was not re-executed live (gateway leg excluded);
  its allocation engine is the same `buildDiagnosticPlan` blueprint code and is
  covered by the existing suite plus 5 historical paid orders.

### Journey D — Gap detection → plan → evidence — PASS
Post-submission database truth for the pilot learner:

| Artifact | Count |
|---|---|
| submitted sessions | 1 |
| learning gaps generated | 2 |
| learner evidence rows | 1 |
| mastery history rows | 0 (first diagnostic — no delta yet) |

AI Tutor access remains gated on parental consent, which was left unrecorded in
this run; the gate rendered correctly as "consent unlocks the AI Tutor".

## Phase 3 — Defects found and fixed

**DEF-1 (Launch blocker, fixed) — parent portal dead end.**
`createStudentProfile` refuses with "Complete your parent details before adding
a student" until name + mobile exist, but the only form that captured them
lived in the checkout route. A parent who never opened checkout could not add a
child at all. `ParentDetailsCard` now renders inside "Your children" whenever
details are incomplete (`src/components/parent-learners.tsx`).

**DEF-2 (Launch blocker, fixed) — another family's child name shown to a learner.**
Parent-purchased diagnostics were titled `<Unit> — Parent Diagnostic (<child
name>)` and are reused by the self-serve start path, so the pilot learner's
assessment header read "Parent Diagnostic (Earth Patel)" — a real child's name
from a different family. Titles now carry the order reference instead
(`src/lib/parent-diagnostic.server.ts`), and a migration scrubbed the names from
all existing assessment titles.

No other allocation, selection, scoring, reporting or entitlement failure was
observed.

## Phase 5 — Regression

- Tests: **256 / 256 passing** (19 files)
- Typecheck: **PASS**
- Production build: **PASS**

## Phase 6 — Security

- Student authentication (handle + PIN) and parent authentication both enforced;
  unauthenticated access to `/parent` and `/home` redirects to `/auth`.
- Role enforcement verified live: a signed-in account with no role row is routed
  to parent claim, never into the student workspace.
- Learner isolation verified: the pilot learner only ever saw its own session
  and its own gap/evidence rows; DEF-2 was the single cross-family disclosure
  and is closed.
- Database linter: 2 pre-existing findings only (1 INFO "RLS enabled, no policy",
  1 WARN security-definer function) — both previously reviewed and accepted; no
  new findings from this assignment's migrations.

## Known limitations

1. Live Razorpay ₹199 capture was not re-executed (no live-mode acceptance
   purchase authorised in this assignment).
2. Reassessment execution was not exercised: the rebuilt Class 10 items are
   still `draft`/`unverified`, so no fresh reassessment reserve exists.
3. Mastery delta requires a second submission; only the first diagnostic ran.
