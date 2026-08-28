# EduOS — Technical State

**Last verified:** 2026-08-27 (UTC)
**Evidence sources:** repository at commit `6f570d0`, `package.json`, `src/routes` and `src/lib` listings, live database introspection, `bunx vitest run`, runtime secret presence check.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start v1 (React 19), file routes in `src/routes` |
| Build | Vite 7, Tailwind CSS v4 via `src/styles.css` |
| Runtime | Edge/Worker (Cloudflare workerd) for SSR and server functions |
| Backend | Lovable Cloud (Postgres + Auth + Storage) |
| Server logic | `createServerFn` in `*.functions.ts`, implementations in `*.server.ts` |
| Public HTTP | `src/routes/api/public/*` (Razorpay webhook) |
| AI | Lovable AI Gateway via `@ai-sdk/openai-compatible` (`src/lib/ai-gateway.server.ts`) |
| Tests | Vitest — **46 passing, 5 files** (2026-08-27) |
| Typography | Geist / Geist Mono; dark + light themes |

## 2. Code shape

- ~41 authenticated routes, 16 public routes/entries.
- Domain modules follow a strict triple: `X-shared.ts` (pure), `X.server.ts` (privileged), `X.functions.ts` (thin RPC wrappers).
- Notable modules: `study-plan`, `parent-account`, `parent-diagnostic`, `payment-audit`, `payment-credentials`, `razorpay`, `curriculum`, `blueprint`, `question-bank`, `diagnostic`, `gap`, `interventions`, `outcomes`, `tutor`, plus nine audit modules.
- Auth attachment: `src/start.ts` registers client-side bearer middleware; protected server fns use `requireSupabaseAuth`.

## 3. Database (verified counts)

| Table | Rows |
|---|---|
| `books` | 4 (3 approved Class 10, 1 archived Grade 3) |
| `curriculum_units` | 19 |
| `curriculum_chapters` | 92 |
| `assessment_outcomes` | 96 |
| `question_bank` | 289 — `import` 210, `ai` 51, `manual` 28 |
| `learners` | 17 |
| `parent_orders` | 7 (paid 4, created 2, failed 1) |
| `parent_entitlements` | 4 |
| `payment_webhook_events` | 121 |
| `auth.users` | 25 |
| `user_roles` | admin 1, reviewer 1, educator 5, parent 3, student 15 |

Schema notes verified this pass: `assessment_outcomes` has **no** `chapter_id` column (outcome→chapter linkage is indirect); `parent_entitlements` has no `product_code` column, it uses `kind` (`diagnostic_credit` observed); `profiles` has no `user_id` column. Treat older doc snippets that reference those columns as wrong.

## 4. Security

- RLS enabled across public tables with GRANTs; org isolation via `private` schema `SECURITY DEFINER` helpers to avoid recursive policies.
- `organizations` UPDATE policy scoped to the admin's own org in USING and WITH CHECK.
- Payment credentials stored AES-256-GCM encrypted; admin-only `/payment-settings`.
- Webhook: HMAC verified before parsing; duplicate event ids recorded as duplicates; handler throws 500 to force gateway retry.
- Open accepted warning: one `SECURITY DEFINER` function executable by signed-in users (the org-scoping helper).
- ⚠️ **Unverified:** no security scan or linter run since the Class 10 import and the study-plan work.

## 5. Payments

- `src/lib/razorpay.server.ts` reads `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` at call time; `razorpayMode()` derives mode from the key prefix. No test/live code branches.
- **Verified 2026-08-27:** all three secrets are present and `RAZORPAY_KEY_ID` begins with `rzp_live`. Earlier reports claiming a test-mode blocker are stale.
- ⚠️ **Unverified:** that `RAZORPAY_WEBHOOK_SECRET` is the live-mode endpoint secret, and that a real live capture has completed.
- Webhook endpoint: `https://www.eduos.global/api/public/razorpay-webhook`, events `payment.captured`, `payment.failed`.

## 6. Content pipeline

- Book upload → PDF extraction (`unpdf`) → curriculum spine → outcomes → question bank → concept graph.
- Class 10 import is idempotent through `question_bank.external_ref` (unique index); `question_bank.source` check constraint allows `import`.
- Storage buckets hold uploaded source books.

## 7. Known technical debt

1. Duplicate single-chapter Science book (`26ac60d7…`) overlapping the full Science pack.
2. Maths pack is intentionally thin (15 outcomes / 45 atoms) — diagnostics may report allocation shortfalls for large blueprints.
3. Imported questions remain `draft` / `unverified` pending Verification Center sign-off.
4. Legacy pre-identity orders (if any) carry no `parent_user_id` and are unreachable from the parent portal.
5. Mobile numbers unverified (no OTP).
6. SEO metadata, JSON-LD and staff/audit surfaces are English-only.
7. Apex domain `eduos.global` still awaiting DNS; only `www` is live.

## 8. Commands

```
bun run dev        # dev server on :8080
bunx vitest run    # 46 tests
bun run build      # production build
```

---

### Update protocol

Updated by the Lovable agent after any schema migration, dependency change, secret change, or test-count change. Counts in §3 must be re-queried, not copied. The founder does not normally edit this file.

---

## Update 2026-08-27 (Production Truth, Payment Reconciliation & Pilot Gate)

- **Production was stale.** Bundle-content probing of https://www.eduos.global proved the deployed build predated the whole educator-free study-plan release (`ffbac9e`…`6f570d0`). Republished at the end of that assignment. Evidence: `EDUOS_PRODUCTION_TRUTH_REPORT.md`.
- **Razorpay live verified:** key `rzp_live_…`, live webhook active at `/api/public/razorpay-webhook` with `payment.captured` + `payment.failed`, secrets proven to correspond by a signature-valid live delivery. Evidence: `EDUOS_PAYMENT_RECONCILIATION_REPORT.md`.
- **₹2,800 upgrade order:** ₹2,999 − ₹199 credit, gateway order created with **0 attempts and no payment** — parent dismissed checkout. No money moved, no entitlement, credit still applied to a retry.
- **Two `created` orders:** abandoned before the gateway; new `expire_stale_parent_orders()` housekeeping moved both to `expired`.
- **Pilot content gate:** the 210 imported Class 10 questions are now `verified` (reviewer `reviewer@eduos.global`, structural review), and the paid diagnostic selects only `approved` + `verified` questions. 11 of 12 units are purchasable (Coordinate Geometry has 3 verified items, below the 5 minimum). Evidence: `EDUOS_PILOT_CONTENT_GATE_REPORT.md`.
- **Duplicate single-chapter Science book archived** (not deleted).
- **Security:** 0 P0, 1 P1 (org-wide staff phone visibility), 2 P2. 46/46 tests pass. Evidence: `EDUOS_SECURITY_AND_DB_SCAN_REPORT.md`.
- **Decision:** READY_FOR_FOUNDER_LIVE_PAYMENT once the publish lands.


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

Key files: `src/lib/assessments.server.ts` (`createAssessmentDraft`), `src/lib/assessments.functions.ts`, `src/routes/_authenticated/assessments.tsx`, `src/lib/__tests__/assessment-request-idempotency.test.ts`, `src/lib/__tests__/fake-supabase.ts` (unique-index emulation).

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

## 2026-08-28 — Wave 0 foundation

- New tables: `catalogue_boards`, `catalogue_academic_years`, `catalogue_classes`, `catalogue_streams`,
  `catalogue_subjects`, `catalogue_subject_sources`, `learner_subject_selections`, `entitlements`,
  `price_bundles`, `price_plans`, `discount_rules`, `centre_contracts`. All with GRANTs + RLS.
- New columns: `learners.stream_label`, `books.catalogue_subject_id`, `parent_orders.catalogue_subject_id`,
  `parent_orders.price_snapshot`, `parent_entitlements.catalogue_subject_id` (all nullable/defaulted).
- New modules: `src/lib/catalogue-shared.ts` (pure rules) and `src/lib/catalogue.server.ts` (readers).
  `parent-diagnostic.server.ts` now also refuses non-purchasable catalogue subjects at order creation.
- Tests: **135 passing, 14 files**. `bunx vitest run`, `bunx tsgo --noEmit`, `bun run build` all clean.
- Legacy `parent_entitlements` and the `PRICING` constant remain the authoritative live write paths.

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

## 2026-08-28 — Annual CBSE/NCERT Subject-Compliance Framework (P0) — CURRENT

- New reusable compliance core: `src/lib/compliance-shared.ts` (source registry contracts + validation, curriculum version lifecycle, snapshot model, deterministic annual change diff, impact analysis, question-rollover classification, seven-gate subject compliance gate, compliance-status derivation). Pure and client-safe; no runtime app behaviour changed.
- New data: `content/compliance/cbse-2026-27.sources.json` (official source registry), `content/compliance/cbse-2026-27.official-curriculum.json` (reference spine, `PENDING_OFFICIAL_RETRIEVAL`), `content/compliance/class-10-2026-27.snapshot.json` (read-only live export).
- New tooling: `scripts/compliance/export-snapshot.{ts,sql}`, `validate.ts`, `report.ts`, `analysis.ts`.
- New documents: `EDUOS_ANNUAL_CURRICULUM_COMPLIANCE_STANDARD.md`, `EDUOS_OFFICIAL_SOURCE_REGISTRY_SPEC.md`, `EDUOS_CURRICULUM_CHANGE_CLASSIFICATION_AND_IMPACT.md`, `EDUOS_SUBJECT_COMPLIANCE_GATE.md`, `EDUOS_ANNUAL_ROLLOVER_RUNBOOK.md`, generated `EDUOS_CLASS_10_2026_27_COMPLETE_COVERAGE_AUDIT.md`.
- **Class 10 2026-27 verdict: SOURCE_PENDING for both Mathematics and Science.** Blocking facts: no checksummed CBSE/NCERT document could be retrieved in this environment; the NCERT Class 10 Science book is still `processed` (not `approved`); two Meridian-pilot Maths units are active without an official mapping; verified depth falls short of the 2× law in 9 of 10 Maths-side units and 4 of 5 Science units (only Chemical Substances, 96 verified, clears it); "The Human Eye and the Colorful World" spelling diverges from the official "Colourful"; no named subject-expert reviewer recorded; entitlements not yet session-scoped.
- Tests: **184 passing, 15 files**; `bunx tsgo --noEmit` clean. No schema migration, no database writes, no Class 9 or Class 12 work.
