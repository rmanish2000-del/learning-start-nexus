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

---

## 2026-08-28 — Figma-Informed Public Visual Refinement (Direction B) — CURRENT

- Approved direction: Recommendation B (refine production toward verified Figma composition; evergreen + Geist retained; Option B dark identity NOT adopted).
- Refined: public navigation chrome (64px bar, padded nav, CTA elevation), hero composition and hierarchy, new dark illustrative product-preview card (marketing-only ink tokens), four-step process stat row (process facts only, no statistics), problem-section transition/elevation.
- Deliberately unchanged (no Figma evidence): How EduOS Works, Parents, Centres, Schools, Trust, Pricing, FAQ, Free Learning Check form, footer architecture, About and Contact bodies.
- Product truth unchanged: India/INR, CBSE Class 10 Mathematics and Science, Rs199 diagnostic, Rs2,999 annual plan, Rs199 credit / Rs2,800 upgrade, all routes and backend behaviour.
- Verification: 97/97 Vitest, typecheck clean, production build success, no console errors, no horizontal overflow at 390/768/1280/1440, single H1, dark theme verified.
- Report: EDUOS_FIGMA_REFINEMENT_RELEASE_REPORT.md
- Rollback reference (pre-release): 1fcae5f27ae75e73657e4f8affbd889ef94d9d1a (code-only; no schema changes).
- Known limitation: Figma source covers ~1.5 sections and is a Figma Make code instance, so exact token extraction and full-site parity are not possible.
- Next founder acceptance gate: visual acceptance of the refined public hero, product preview and problem section on https://www.eduos.global.

---

## 2026-08-28 — Wave 0 implementation of decisions D1–D9

- D1 catalogue-driven scope, D2 academic-year versioning from CBSE 2026-27, D3 Classes 9–12 subject structure,
  D4 configurable pricing (no new price approved or active), D5 one ₹199 credit per learner applied once,
  D6 tax configured but inactive, D7 named subject-expert sign-off required before commercial activation,
  D8 centre contract pricing per active learner/year, D9 English-only copy — all implemented structurally.
- Commercial scope decision unchanged: CBSE Class 10 Mathematics and Science, ₹199 diagnostic, ₹2,999 annual
  plan, ₹199 credit, ₹2,800 upgrade. No future class, subject, bundle or price may be purchased.

---

## 2026-08-28 11:44 UTC — Wave 0 Production Closeout

- Canonical branch: `main` (working branch `edit/edt-09c92cdc`, canonical tree).
- Wave 0 application commit: `e38a303b361ec1848c12ce7e490a8e0a7945f528` — "Implemented Wave 0 foundation".
- Deployed production commit: `e6e34008bd264b1533707180428d860dda76a6f9` (Wave 0 + P0 profile-org RLS hardening migration `20260828114401_*.sql`).
- Deployment: https://www.eduos.global — LIVE, HTTP 200, verified 2026-08-28 ~11:47 UTC.
- Tests 135/135 (13 files) · typecheck clean · production build clean · worktree clean.
- Migrations committed: `20260828112426_*` (Wave 0 additive) and `20260828114401_*` (profiles org_id self-assignment fix). Translations: none required (English-only).
- Security: the critical finding "any user can join any organization" (pre-existing profiles INSERT/UPDATE policy allowing self-assigned `org_id`) was found during the closeout scan and fixed: self-insert must have `org_id IS NULL`, self-update must keep `org_id` unchanged, admins remain scoped to their own org. Rescan: 0 critical, warnings only.
- Database: Wave 0 migration applied; 2 purchasable subjects; 1 active class (Class 10); 0 active streams; 0 orphan catalogue links; 0 duplicate canonical codes; 5 legacy entitlements grandfathered; RLS active on every new table; order amounts unchanged (19 900 / 280 000 paise); active plans 19 900 / 299 900 paise.
- Production verification: ₹199, ₹2,999, ₹2,800, CBSE Class 10 Mathematics and Science all present; Classes 9/11/12, Commerce, Humanities and all streams absent from public surfaces; English-only copy intact.
- Rollback: code `48548b420c601f8bcaf11a47c6853a55ebfb5526`; both migrations are additive/policy-only and require no data rollback.
- Next gate: Wave 1 — Class 9 Mathematics and Science content preparation (not started).

---

## 2026-09-02 — D10–D16: Founder Non-Execution Rule and multi-AI continuity governance

Durable governance decisions. Permanent unless the founder explicitly revokes them.

- **D10 Founder Non-Execution Rule (mandatory).** Never assign execution work to the founder. All
  possible work is completed through the appropriate AI/tool assignment. The founder is involved only for
  an unavoidable manual action, an inaccessible credential, a payment, a legal/external approval, or a
  decision that cannot be performed by available tools. This supersedes every earlier founder-retest,
  founder-verification or founder-configuration instruction in the continuity set.
- **D11.** M365 Copilot is AI Program Director and continuity owner; verified results are handed back to it.
- **D12.** Continue proactively until the objective is fully completed.
- **D13.** Every delegated task has a separate copy-paste-ready assignment naming the exact tool and mode;
  every implementation or verification stage includes a separate Lovable assignment.
- **D14.** Every Figma assignment includes the complete downloadable implementation package.
- **D15.** All assignments are written entirely in English. Normal EduOS responses are very short,
  relevant and in Devanagari Hindi, with technical and standard terms in English. D9 (English-only
  product copy) is unchanged: this is a communication rule, not a product-language change.
- **D16.** Avoid duplicate work unless it is intentional independent verification.

---

## 2026-09-03 — D17: Business-Value-First rule (permanent governance)

- **D17 Business-Value-First (mandatory).** Work is prioritised in this order: (1) security and serious
  production risks; (2) revenue, payment and conversion impact; (3) core parent and learner journeys;
  (4) compliance and commercial-release blockers; (5) production defects; (6) necessary UX improvements;
  (7) optional polish and nonessential features.
- Credit-efficiency rules: every assignment must state expected business value and priority; defer or
  bundle low-value polish, duplicate audits and unnecessary documentation; avoid repeating completed
  verification without new evidence or risk; never implement optional features while a higher-value
  blocker is open; prefer one bundled, independently verifiable assignment over multiple small
  assignments; no avoidable founder execution work (D10); continue proactively through appropriate
  AI/tool assignments until completion.

No product, pricing, scope, schema or runtime decision is changed by this entry.
