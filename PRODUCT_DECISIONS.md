# EduOS — Product Decisions

**Last verified:** 2026-08-27 (UTC)
**Evidence sources:** code at commit `6f570d0` (`src/lib/parent-account-shared.ts`, `src/lib/study-plan*.ts`, `src/routes/auth.tsx`, `src/components/parent-purchases.tsx`), database state, prior decision reports.

Only decisions traceable to code or data are listed. Anything else is marked UNVERIFIED.

---

## Scope

| # | Decision | Status | Evidence |
|---|---|---|---|
| 1 | Pilot is **CBSE Class 10 only**, Mathematics + Science | Enforced in code — `PILOT_BOARD = "CBSE"`, `PILOT_CLASS = 10`, add-student schema accepts only those literals | `src/lib/parent-account-shared.ts` |
| 2 | Grade 3 content is archived, not deleted | Enforced — book `66000000…` status `archived`; `archive.rollback_cleanup()` retained | DB, cleanup report |
| 3 | Curriculum hierarchy is unit → chapter → topic → outcome → atoms; **no subtopic level** | Enforced in import loader | import approval report |

## Monetization

| # | Decision | Status | Evidence |
|---|---|---|---|
| 4 | Two products: **₹199 one-time diagnostic** and **₹2,999/yr Board Success Plan** with the ₹199 credited | Live in code and data (₹199 orders present) | `parent_orders`, `/upgrade/:token` |
| 5 | **Identity-first purchase** — no anonymous/bearer-token buying; parent account + student profile required before checkout | Enforced by `createDiagnosticOrder` guard | identity flow report |
| 6 | Razorpay is the only gateway; mode is derived from the key prefix, never a code flag | Enforced — `razorpayMode()` | `src/lib/razorpay.server.ts` |
| 7 | Entitlements and orders are owned by `parent_user_id` + `learner_id`, RLS-scoped to `auth.uid()` | Enforced | schema + tests |
| 8 | Webhook signature is verified **before** any state change; capture is idempotent by event id | Enforced, covered by 9 route tests | `src/routes/api/public/razorpay-webhook.ts` |

## Roles & access

| # | Decision | Status | Evidence |
|---|---|---|---|
| 9 | Roles live in `public.user_roles`, never on profiles; checks go through a `private` schema `SECURITY DEFINER` helper | Enforced | schema |
| 10 | Five roles: admin, educator, student, parent, reviewer | Live — all five populated | `user_roles` |
| 11 | A signed-in user with no role row is sent to `/auth?tab=parent`, never defaulted to student | Enforced | `src/routes/_authenticated/route.tsx` |
| 12 | Students sign in with **handle + 6-digit PIN**, not email; parents and admins can set/reset the PIN | Enforced | `src/lib/parent-account.server.ts`, `/admin` |
| 13 | All audit centres are restricted to admin + reviewer | Enforced | `requireAuditRole` |

## Learning experience

| # | Decision | Status | Evidence |
|---|---|---|---|
| 14 | **No educator dependency for the diagnostic journey.** When `educator_id` is null the plan is generated automatically from results + gaps + curriculum outcomes | Enforced, commit `6f570d0` | `src/lib/study-plan.server.ts`, `src/components/study-plan-card.tsx` |
| 15 | Educator messaging renders only when `educator_id` exists | Enforced | `src/routes/_authenticated/home.tsx` |
| 16 | Educators are assigned by the centre admin after a Board Success Plan purchase — parents never pick one | Enforced in copy | `src/components/parent-purchases.tsx` |
| 17 | Mastery threshold for strength vs focus is **70%** | Enforced | `src/lib/study-plan-shared.ts`, `src/lib/gap.server.ts` |
| 18 | AI Tutor is Socratic and scoped to approved interventions only | Enforced | `src/lib/tutor.server.ts` |
| 19 | Imported questions land as `status=draft`, `verification_state=unverified` and need Verification Center sign-off | Enforced | import execution report |

## Experience & platform

| # | Decision | Status | Evidence |
|---|---|---|---|
| 20 | Hindi covers the parent journey only; English fallback for missing keys | Live | `src/lib/i18n/hi.ts` |
| 21 | Onboarding completion celebrates once and is remembered (`celebration-dismissed-at`); tour restartable from Settings | Enforced | `src/lib/onboarding.ts` |
| 22 | Router is TanStack Router; React Router is not permitted | Standing constraint | `AGENTS.md`, stack rules |
| 23 | Publishing is a manual founder action; the agent does not publish unprompted | Standing constraint | project memory |
| 24 | Pilot standby since 2026-08-24: bug fixes only unless the founder explicitly orders new work | Standing constraint | project memory |

## Deliberately rejected / not done

- Anonymous sign-ups and email auto-confirm — off.
- Mobile-number OTP verification — collected but **not** verified (accepted limitation).
- Board Success Plan fulfilment automation — manual coaching workflow during the pilot.
- Supabase Edge Functions for app logic — replaced by `createServerFn`.

## UNVERIFIED

- Pricing for any product beyond ₹199 / ₹2,999.
- Whether the ₹2,800 order value seen for Earth Patel reflects an intended discounted upgrade price.
- Any commercial/partner decisions not represented in code or data.

---

### Update protocol

Updated by the Lovable agent whenever a decision is implemented, reversed, or contradicted by new code. The founder appends business/pricing decisions directly. Each row must stay traceable to a file or table; drop rows that lose their evidence.


---

## 2026-08-28 06:0x UTC — Assessment lifecycle regression closed (Issues 1 and 2)

- Canonical branch: `main`.
- Issue 1: new assessments no longer inherit hardcoded Grade 6 metadata; scope is derived from the selected CBSE Class 10 book and unit, so drafts stay active and can publish.
- Issue 2: title + two-minute-window deduplication removed. Assessment creation is now idempotent per `clientRequestId`, enforced by a partial unique index on `public.assessments (org_id, client_request_id)`. Two intentional creates with the same title are two separate drafts; a retry of one request returns the draft it already created. No staff content can be silently discarded.
- Migration: `20260828055655_*.sql` (additive nullable column + partial unique index).
- Tests: 97/97 Vitest passing; typecheck clean; production build clean.
- Public-experience release work preserved and unchanged.
- Reports: `EDUOS_ASSESSMENT_LIFECYCLE_REGRESSION_REPORT.md`, `EDUOS_FINAL_PUBLIC_EXPERIENCE_RELEASE_REPORT.md` (section 13).
- Rollback reference: `9e0e2b166d20b3c605dfcd32f733cb9aaa3d7829`.

**Decision:** Assessment titles are labels, never identifiers. Duplicate titles are legitimate. Idempotency is request-scoped only; an edit of an existing draft must be an explicit update against the assessment id and is never inferred from title or creation time.
