# EduOS — P0 Founder Feedback Remediation Report

Date: 2026-08-26 · Priority: P0 Launch Blocker · Source: founder testing on production

## Decision

**REMEDIATED** — all 8 reported issues are closed in code. Typecheck clean, 46/46
automated tests pass, browser verification done on the sign-in and diagnostic
surfaces. Nothing is published; publish remains a founder decision.

## Issue-by-issue

| # | Issue | Status | Where fixed |
|---|---|---|---|
| 1 | Educator assignment model unclear | Fixed | `src/components/parent-purchases.tsx` |
| 2 | Guided tour loses focus | Fixed | `src/components/guided-tour.tsx` |
| 3 | Diagnostic page loses navigation | Fixed | `src/components/diagnostic-shell.tsx` |
| 4 | "Onboarding complete!" repeats | Fixed | `src/lib/onboarding.ts`, `src/components/onboarding-checklist.tsx` |
| 5 | Unassigned-educator confusion | Fixed | `src/components/parent-purchases.tsx` |
| 6 | Handle + PIN recovery missing | Fixed | `src/routes/auth.tsx`, admin override on `/admin` |
| 7 | Student login UX confusing | Fixed | `src/routes/auth.tsx` |
| 8 | Pilot scope leakage | Fixed | `src/lib/parent-account-shared.ts`, landing/about copy |

### 1 & 5 — Educator assignment

The parent portal now answers "what happens next" without the parent having to
ask. The three-step card states plainly that the diagnostic needs no educator,
that an educator is assigned by the centre admin within one working day of a
Board Success Plan purchase, and that the parent never picks one. The per-student
badge no longer reads "Awaiting educator assignment" (which implied the parent
was blocked); it reads "No educator needed for the diagnostic" with a one-line
explanation of who acts next.

### 2 — Guided tour focus

`goTo` measures the target, scrolls it to the viewport centre when it is not
already comfortably in view, clears the stale spotlight while the page moves,
and repaints only once the scroll has settled. Steps whose target is not
rendered are skipped; targets that unmount mid-tour advance the tour instead of
stranding the overlay.

### 3 — Diagnostic navigation

The diagnostic shell keeps its focus-mode chrome but is no longer a dead end:
"Home" and a bordered "Parent portal" control sit in the header at every
breakpoint. Verified in-browser on `/diagnostic`.

### 4 — Onboarding completion

Completion is recorded in a browser-level `celebration-dismissed-at` flag, and
the checklist only celebrates a transition from incomplete to complete during
the same session — an already-complete checklist never fires it on sign-in. The
modal copy now says it is a one-time message. Settings → Onboarding still offers
an explicit "Restart tour" for anyone who wants it back.

### 6 & 7 — Student credential recovery and role discovery

- The sign-in page remembers the last role used on the device
  (`eduos.auth.lastRole`) and restores it on the next visit, so a returning
  student is not dropped onto the parent form. An explicit `?tab=` in the URL
  always wins over the remembered value.
- The student panel states "Handle and 6-digit PIN — not an email" and carries
  the recovery path inline.
- Parents can create or reset a student's PIN from the parent portal.
- Admins can list every student login and set or reset a 6-digit PIN from
  `/admin` for support cases where the parent cannot.

### 8 — Pilot scope

`PILOT_BOARD` is locked to CBSE and `PILOT_CLASS` to 10; the add-student schema
accepts those literals only, so no other board or class can be submitted even by
a crafted request. The diagnostic catalogue is already filtered to grade 10.
Public copy on the landing page and `/about` was rewritten off the old Grade 6
Fractions demo onto CBSE Class 10 Mathematics.

## Verification

- Typecheck: clean.
- Tests: 46/46 passing (`vitest run`).
- Browser: `/auth` remembers the Student role across a reload; `/diagnostic`
  shows Home + Parent portal and the "CBSE Class 10 · one-time ₹199" scope
  badge; no console errors.

## Not changed

The live-mode Razorpay credential blocker from the release readiness report is
unrelated to this feedback and remains open.
