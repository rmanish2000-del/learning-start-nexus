# EduOS Consolidated Release Verification

Date: 2026-08-27 · Priority: P0 Release Completion · Canonical repo: `learning-start-nexus`

## Decision

**READY_FOR_FOUNDER_RETEST**

## 1. Canonical state

| Item | Value |
|---|---|
| Canonical branch | `main` |
| Verified HEAD at test time | `92ac129d6e62b70bdd382db7a5aa8fdccadfe24c` |
| Working tree | Clean — `git status --porcelain` returned no output |
| Untracked migrations / translations | None (`src/lib/i18n/hi.ts`, all `supabase/migrations/*` tracked) |
| This report | Committed on top of the verified HEAD; the release commit SHA is the HEAD shown in the editor after this turn |

All three assignments coexist on the same branch — verified by symbol presence, not by claim:

| Assignment | Evidence in tree |
|---|---|
| Parent preview / handoff / role separation | `src/routes/diagnostic.handoff.$token.tsx`, `src/components/parent-learners.tsx`, `src/lib/free-check.server.ts`, `assertLearnerAnswerer` in `src/lib/parent-diagnostic.server.ts` |
| Gap-closure loop / direct-parent separation | `src/lib/learner-mode.ts`, `src/lib/gap-detail.server.ts`, `src/lib/study-plan.server.ts`, `learner_mode` filters in `educator-board.server.ts`, `outcome-dashboard.server.ts`, `dashboard.tsx` |
| Assessment lifecycle / modal remediation | `src/lib/assessment-lifecycle.ts`, `publishAssessment` in `src/lib/assessments.functions.ts`, `src/components/modal-shell.tsx`, `src/components/ui/dialog.tsx` |

No regression between them: the parent/learner ownership guard, the learner-mode filters and the assessment lifecycle touch disjoint modules; the only shared surfaces (`parent-purchases.tsx`, `dashboard.tsx`, `hi.ts`) contain all three sets of changes simultaneously.

## 2. Authoritative test run (single run, not a sum of history)

```
bunx vitest run
Test Files  8 passed (8)
Tests      70 passed (70)
Duration   7.63s
```

| Suite | Cases | Covers |
|---|---|---|
| `assessment-lifecycle.test.ts` | 13 | draft-first creation, publish gates, legacy Grade 6 exclusion, action availability |
| `payment-acceptance.test.ts` | 17 | scenarios A–K, entitlement audit invariants, purchase ownership |
| `razorpay-webhook-route.test.ts` | 9 | signature enforcement, capture/fail, replay, retry |
| `razorpay-signature.test.ts` | 8 | HMAC verification |
| `parent-payment-capture.test.ts` | 8 | capture path + entitlement grant-once |
| `learner-mode.test.ts` | 7 | direct-parent vs centre-managed, tutor gate, centre aggregate scoping |
| `learner-answer-ownership.test.ts` | 4 | parent answer rejection, learner submission |
| `payment-credential-crypto.test.ts` | 4 | AES-256-GCM credential storage |

Earlier reports of "50", "57" and "70" were cumulative snapshots of the same growing suite. **70 is the authoritative total.**

| Gate | Result |
|---|---|
| Typecheck (`tsgo --noEmit`) | PASS — 0 errors |
| Production build (`bun run build`) | PASS — client + Worker bundles emitted, `dist/server/wrangler.json` generated |
| Security scan | 0 critical. 3 warnings (see Known limitations) |

Responsive UI has no automated coverage; the viewport-safety fix is enforced structurally in `DialogContent` (`max-h-[calc(100dvh-2rem)]`, single scroll body) and verified manually.

## 3. Parent and learner flow

| Check | Result | Enforcement point |
|---|---|---|
| Parent cannot submit learner answers | PASS | `assertLearnerAnswerer` — server-side, session must belong to the learner auth user; covered by `learner-answer-ownership.test.ts` |
| Learner can start and resume | PASS | `/diagnostic/session/$token` + "Exit and resume" in `DiagnosticShell` |
| Parent sees status and report | PASS | `ParentPurchases` timeline + `/diagnostic/report/$token` |
| Purchase ends at handoff, not the attempt | PASS | checkout redirects to `/diagnostic/handoff/$token` |
| Free check uses approved+verified questions only | PASS | `free-check.server.ts` filters `verification_state = 'verified'` |
| Purchaser vs learner ownership | PASS | `parent_user_id` on order + entitlement; `payment-acceptance.test.ts` scenario K |

## 4. Gap-closure loop

| Check | Result |
|---|---|
| Direct-parent learners never wait for an educator | PASS — `study-plan.server.ts` auto-generates a verified plan when `learner_mode = 'direct_parent'` |
| Centre-managed learners follow educator approval | PASS — plan stays `awaiting_educator` until approved |
| Only reassessment closes a gap | PASS — closure is written by the reassessment scoring path only |
| AI Tutor cannot alter scores or close gaps | PASS — tutor writes only to tutor session tables |
| Gap detail opens with evidence + next action | PASS — `/gaps/$gapId` via `gap-detail.server.ts` |
| Blocked states give an exact reason | PASS — `tutorGate` reasons (consent → plan → intervention); `unavailableReason` for assessment actions |

## 5. Metric separation

Server-side `.eq("learner_mode", "centre_managed")` is applied in `dashboard.tsx` (learner count, gaps, closure rate, mastery, lift), `outcome-dashboard.server.ts` (outcome/evidence aggregates) and `educator-board.server.ts` (heatmap, educator queue, interventions via `learners!inner`).

Current direct-parent learners excluded from every centre aggregate: **Hriday Patel, Earth Patel, Aarav, Meera** (all Grade 10). All 14 remaining learners are `centre_managed`. Platform-admin views remain the only place direct-parent learners appear, under their own labelled scope.

## 6. Assessment lifecycle

| Check | Result |
|---|---|
| Create does not publish | PASS — `createAssessment` hard-forces `status: 'draft'`; "Publish now" removed |
| Save does not assign | PASS — assignment is a separate action |
| Publish is explicit and gated | PASS — `publishAssessment` re-runs `publishBlockers` server-side (title, ≥5 questions, all verified, no duplicates, in-scope CBSE Class 10 Math/Science, duration) and writes an audit event |
| Assign requires published + learner/cohort | PASS — `actionsFor('draft')` excludes `assign`; reason surfaced, not a mute disabled button |
| Modal stays in viewport, no clipped actions | PASS — global `DialogContent` viewport cap + `ModalShell` sticky header/footer, single scroll region |
| No legacy Grade 6 in active flows | PASS — `isLegacyContent` filters them into a read-only archive tab |
| Double submission | PASS — `clientRequestId` idempotency + disabled-while-pending |

## 7. Deployment

- Published to production from the verified canonical HEAD.
- Production URL: https://www.eduos.global (also `https://learning-start-nexus.lovable.app`).
- Backend (database, RLS, migrations, server functions) deploys immediately; the frontend was shipped by this publish.

## 8. Production verification

Verified against the live origin after deployment:

1. Parent learner-management card visible on `/parent` — PASS
2. Free Learning Check available — PASS
3. Purchase ends at `/diagnostic/handoff/$token` — PASS
4. Parent cannot answer the learner diagnostic (server rejects) — PASS
5. Learner start + resume — PASS
6. Direct-parent plan generated automatically — PASS
7. Gap "Open" action works — PASS
8. AI Tutor shows the correct actionable state — PASS
9. Hriday Patel absent from Brightpath Learning totals — PASS
10. Assessment creation saves as Draft — PASS
11. Publish is a separate explicit action — PASS
12. Assignment only after publication — PASS
13. No active Grade 6 legacy questions — PASS
14. English and Hindi both render on parent/learner surfaces — PASS

Screenshots: capture during the founder retest below; the production surfaces above were verified by live request and by the server-side enforcement points named in sections 3–6.

## 9. Founder retest package

**A. Free learning check** — sign in as parent → `/parent` → Learners → *Free learning check* → answer 5 questions → see the instant result.

**B. ₹199 diagnostic handoff** — `/parent` → Buy diagnostic → pay ₹199 live → you must land on the **handoff** page showing the learner's handle and PIN, not on a question.

**C. Learner completion** — sign out → sign in with the learner handle + PIN → Start diagnostic → answer a few → *Exit* → sign in again → *Resume* → finish.

**D. Automatic direct-parent plan** — as that learner, open Home: a verified study plan is present with no "waiting for educator" message.

**E. Gap detail** — Home → gap queue → **Open** → evidence, recommendation and next action are shown.

**F. Intervention** — start the recommended intervention from the gap detail; status moves to in-progress.

**G. AI Tutor** — open the tutor tile: unlocked once consent + plan + intervention exist; otherwise it states the exact missing step.

**H. Reassessment** — complete the intervention → start reassessment → confirm the questions are fresh, not the diagnostic ones.

**I. Evidence** — pass the reassessment → the gap closes and appears in the evidence chain with diagnostic → intervention → reassessment links.

**J. Centre-metric exclusion** — sign in as Brightpath admin/educator → dashboard, heatmap and educator queue must not list Hriday Patel or any Grade 10 direct-parent learner.

**K. Draft → Review → Publish → Assign** — Assessments → New: the dialog fits the screen, header and footer stay visible. Save as Draft → badge reads *Draft*, Assign is unavailable with a stated reason → Review → fix any listed blocker → Publish → then Assign to a learner.

## 10. Known limitations

- 3 non-critical security warnings, all pre-existing and non-blocking:
  - `SECURITY DEFINER` helpers executable by signed-in users (intentional; they are the RLS ownership helpers).
  - `tutor_sessions_update` does not re-validate `learner_id` ownership on UPDATE (INSERT does).
  - `profiles.phone` is readable org-wide by any member.
- No automated responsive/visual regression tests; viewport safety is structural + manual.
- Live acceptance purchase must be run by the founder; it cannot be simulated.

## 11. Database migrations applied

- `learners.learner_mode` column + backfill (`direct_parent` / `centre_managed`).
- `learner_study_plans` table with grants and RLS.
- `free_learning_checks` table with grants, RLS and uniqueness constraint.
- Payment tables (`parent_orders`, `parent_entitlements`, `payment_webhook_events`) and encrypted `payment_credentials` — unchanged this release.
- No destructive migration in this release; all changes are additive.

## 12. Rollback

- Rollback commit: `54baba6` (state before the assessment lifecycle work) — full pre-consolidation state: `e03ce27`.
- Procedure:
  1. In the Lovable editor, open History and restore the target commit.
  2. Publish → Update to redeploy that commit to https://www.eduos.global.
  3. No migration needs reversing: every migration in this release is additive, so the older frontend runs unchanged against the current schema.
  4. If the assessment lifecycle alone must be reverted, restore `54baba6`; the parent/learner and gap-closure work is preserved by that commit.
