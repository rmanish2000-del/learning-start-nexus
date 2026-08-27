# EduOS — Class 10 Diagnostic-to-Conversion Experience

Educator assignment is no longer a dependency anywhere in the student journey.
The plan is generated automatically from diagnostic results, gap analysis and
CBSE curriculum outcomes. Educator messaging is a decoration that only renders
when `learners.educator_id` is set.

## Screen states (student home)

| State | Condition | What the student sees |
| --- | --- | --- |
| No learner | no learner row linked to the account | Account setup notice; no educator copy |
| Not started | learner exists, no session | "Complete your diagnostic to generate your personalized study plan." + **Start diagnostic** |
| In progress | a session exists, not submitted | **Resume diagnostic**, progress saves automatically |
| Submitted | latest session submitted | Strength areas, Focus areas, Recommended next topics, diagnostic score |

## Conditional rendering rules

- `educatorAssigned === false` → never render "Waiting for your educator",
  "Your educator will assign one soon", or "Your educator is building it".
  The AI-generated plan is the default experience.
- `educatorAssigned === true` → educator hints and assignment states return
  unchanged for centre-managed learners.
- Focus areas exist → AI Tutor entry points are enabled (interventions are
  materialised automatically, see below).
- Strengths/focus lists empty → an explanatory line replaces the list rather
  than a blocked state.

## Data flow

```text
assessment_sessions.result (outcome-level scoring)
        │
        ├─ outcomes[] ─→ buckets (code, correct, total, pct)
        │        ├─ pct ≥ 70  → Strength areas
        │        └─ pct < 70  → Focus areas
        │                         └─ joined to learning_gaps → recommendations
        │                                                   → interventions
        └─ assessment.unit_id ─→ assessment_outcomes (not yet assessed)
                                     → Recommended next topics (board weight order)
```

Both result shapes are supported: the outcome-level object written by the
diagnostic engine, and the older flat per-item breakdown array.

### Automatic plan materialisation

`materialisePlan` converts `suggested` recommendations into `planned`
interventions with `educator_id = null`. It is idempotent (one intervention per
recommendation/gap) and never touches staff-owned interventions. This is what
unlocks the AI Tutor without an educator in the loop.

### Self-serve diagnostic start

`startSelfServeDiagnostic` picks the published, non-archived Class 10
diagnostic for the learner's subject and creates the session for the student —
no educator assignment step.

## Upgrade flow

After the parent opens the report (`/diagnostic/report/$token`), the upgrade
block presents the **Class 10 Board Success Plan — ₹2,999 annual access**:
personalised practice, progress tracking, AI-guided study path, Maths +
Science coverage. The diagnostic credit is applied to the first invoice when
still valid; the report stays available whether or not the parent upgrades.

## Parent / student journey

1. Parent buys the ₹199 diagnostic and creates the child profile (handle + PIN).
2. Student signs in and sees the diagnostic CTA immediately — no waiting state.
3. Student submits; scoring, gap detection and the plan run server-side.
4. Student home shows strengths, focus areas and next topics; tutor practice is
   available on each focus area.
5. Parent reads the report and is offered the Board Success Plan.
6. If a centre later assigns an educator, educator messaging and workflow
   reappear on top of the same data.

## Files

- `src/lib/study-plan-shared.ts` — pure types and aggregation.
- `src/lib/study-plan.server.ts` — plan assembly, materialisation, self-serve start.
- `src/lib/study-plan.functions.ts` — `getMyStudyPlan`, `startMyDiagnostic`.
- `src/components/study-plan-card.tsx` — adaptive plan UI.
- `src/routes/_authenticated/home.tsx` — integration and educator-conditional hints.
- `src/lib/student-home.server.ts` — neutral action labels when unassigned.
- `src/lib/help-center.ts`, `src/lib/onboarding.ts`, `src/routes/auth.tsx`,
  `src/lib/tutor.functions.ts` — educator-dependent copy neutralised.

## Verification

- Signed in as the pilot student (`earthpatel-e3ab7e1b`) in the preview: home
  renders "Your personalized study plan" with two high-severity focus areas and
  recommended next topics; no educator waiting copy anywhere on the page.
- `bunx vitest run` — 46 tests passing.
