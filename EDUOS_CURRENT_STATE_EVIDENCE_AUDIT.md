# EduOS Current-State Evidence Audit

Date: 2026-08-28 (UTC) · Priority: P0 Evidence and Release Baseline · Target authority: APPLICATION
Repository: `rmanish2000-del/learning-start-nexus` · Branch: `main` · Production: https://www.eduos.global

**Mode: read-only.** No redesign, no positioning change, no pricing/scope/claim change. No code was modified to produce this audit. No blocker was encountered.

---

## 1. Canonical baseline

| Item | Value |
|---|---|
| Current HEAD | `229911aaafda002aaf8cb9f1ee0451ebfd13d56f` |
| HEAD date | 2026-08-28 02:18:07 +0000 |
| HEAD subject | "Determined platform positioning" |
| Working tree | Clean — `git status --porcelain` empty |
| Last runtime-affecting commit | `f90b67c929fcea7e9f191753557b9e76698dca9c` (contact info) |
| Diff `f90b67c..HEAD` | `EDUOS_PLATFORM_POSITIONING_REVIEW.md` only |

**Consequence:** deployed production application code is functionally identical to HEAD. The two commits after the last publish are documentation-only; no republish is required for code parity.

## 2. Gates (run this pass, single run)

| Gate | Result |
|---|---|
| `bunx vitest run` | **PASS — 9 files, 74/74 tests**, 6.95s |
| `bunx tsgo --noEmit` | **PASS — 0 errors** |
| Production reachability | `/` 200, `/contact` 200, `/sitemap.xml` 200, `/auth` 307 (canonical redirect), `/dashboard` 200 (client gate then auth redirect) |
| Public webhook endpoint | `/api/public/razorpay-webhook` reachable (200 on GET probe; POST requires valid HMAC) |

Test files: assessment-lifecycle, payment-acceptance, razorpay-webhook-route, razorpay-signature, parent-payment-capture, learner-mode, learner-answer-ownership, payment-credential-crypto, centre-onboarding.

## 3. Code surface (counted, not claimed)

| Surface | Count |
|---|---|
| Authenticated route files (`src/routes/_authenticated`) | 43 |
| Public route files (`src/routes/*.tsx` / `*.ts`) | 16 |
| Domain modules (`src/lib/*.ts`) | 119 |
| Test files | 10 files present, 9 executed as suites |
| Public HTTP endpoints | 1 (`src/routes/api/public/razorpay-webhook.ts`) |

Public marketing/legal surfaces live today: `/`, `/about`, `/contact`, `/privacy`, `/terms`, `/auth`, `/diagnostic` (+ checkout, session, complete, handoff, report), `/free-check/$checkId`, `/upgrade/$token`, `/sitemap.xml`.

## 4. Live database state (queried this pass)

| Table | Rows |
|---|---|
| `organizations` | 6 |
| `auth.users` | 37 |
| `learners` | 23 — `centre_managed` 19, `direct_parent` 4 |
| `books` | 5 |
| `curriculum_units` | 21 |
| `curriculum_chapters` | 94 |
| `assessment_outcomes` | 101 |
| `question_bank` | 304 total — **213 approved + verified** (diagnostic-eligible) |
| `parent_orders` | 8 (5 paid) |
| `parent_entitlements` | 5 |
| `payment_webhook_events` | 242 |

Role distribution (`user_roles`): admin 5, educator 6, student 21, reviewer 1, parent 4.

These counts supersede every earlier snapshot in `TECHNICAL_STATE.md` §3 (which recorded 17 learners / 289 questions / 25 users).

## 5. Commercial and scope truth

| Fact | Evidence |
|---|---|
| Prices shown publicly | ₹199 diagnostic, ₹2,999 annual plan — three occurrences in `src/routes/index.tsx` only |
| Payment mode | `RAZORPAY_KEY_ID` begins `rzp_live` — **live mode** |
| Payment secrets | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` all present at runtime |
| AI provider | `LOVABLE_API_KEY` present (AI Gateway) |
| Curriculum scope | Hard-locked to **CBSE Class 10, Mathematics & Science** in `src/lib/parent-account-shared.ts` (zod errorMap: "The pilot covers CBSE Class 10 only") |
| Currency | INR only |
| School-specific structures | None (no class/section, attendance, term, or timetable tables) |

## 6. What is proven to work end-to-end

Backed by executed tests and prior live verification, not by claim:

1. Centre onboarding → org creation → admin provisioning → CSV learner import (`centre-onboarding.test.ts`, live run for Pilot Learning Centre).
2. Parent purchase → learner handoff → learner-owned attempt; parents are server-side blocked from answering (`learner-answer-ownership.test.ts`).
3. Payment capture, signature enforcement, replay/retry handling, grant-once entitlement (four payment suites, 38 cases).
4. Assessment lifecycle Draft → Publish → Assign with server-side publish gates (`assessment-lifecycle.test.ts`).
5. Direct-parent vs centre-managed metric isolation (`learner-mode.test.ts`).

## 7. Known limitations carried into positioning work

1. No school layer: no class/section grouping, group assignment, multi-teacher mapping, or academic calendar.
2. Catalogue cannot sell outside CBSE Class 10 Math/Science without a code change.
3. No automated responsive/visual regression coverage; viewport safety is structural + manual.
4. Mobile header overflow on the public homepage (identified in the homepage conversion audit, unfixed by design of that read-only pass).
5. Apex `eduos.global` still awaiting DNS; only `www` is live. `notify.eduos.global` email domain not yet verified.
6. Pre-existing security warnings: `SECURITY DEFINER` helpers executable by signed-in users (intentional), `tutor_sessions_update` does not re-validate `learner_id` on UPDATE, `profiles.phone` readable org-wide.
7. Staff/audit surfaces and SEO metadata remain English-only.

## 8. Baseline statement for the synthesis step

At `229911a`, EduOS is a **live, revenue-capable, multi-tenant outcome platform** serving two buyers (parents directly, coaching centres operationally), locked to CBSE Class 10 Mathematics and Science, running live Razorpay, with 74 passing tests, a clean typecheck, a clean tree, and production code parity with HEAD. Any final recommendation should treat schools as an architecture-ready but unbuilt segment.
