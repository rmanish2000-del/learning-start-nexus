# EduOS — Project Status

**Last verified:** 2026-09-02 (UTC)
**Evidence sources:** repository at commit `b559058753b9d0acc6a25438fdc0cf79122ce4af` (= deployed production SHA), live HTTP fetches of https://www.eduos.global, live database queries, `bunx vitest run` output, prior reports listed in §7.

---

## 1. One-line status

The Class 10 pilot product is built, imported and deployed; the parent ₹199 diagnostic journey works end-to-end in the database, and the payment gateway now holds **live-mode** credentials. No live acceptance purchase has been verified yet.

## 1a. Class 10 compliance and launch gate (revalidated 2026-09-03, VERIFIED)

| Item | Result |
|---|---|
| Official requirements verified | 84 / 84 mapped |
| Mathematics (041) | **NOT_COMPLIANT** (7 failing gate checks) |
| Science (086) | **NOT_COMPLIANT** (9 failing gate checks) |
| Derived compliance status | `SOURCE_PENDING` |
| Journey · pricing · security | PASS · PASS · PASS |
| Launch gate | **CONTROLLED PILOT ONLY** — external launch withheld |
| Tests | **308 passing / 27 files** |

Verified question depth is 45 items (Mathematics) and 165 (Science); the 326
rebuilt items are loaded but held as `draft`/`unverified` and cannot reach a
paying learner. Coordinate Geometry is currently unsellable (3 verified items).
Eleven of twelve units hold a zero fresh-reassessment reserve. Full evidence:
`EDUOS_CLASS10_COMPLIANCE_BASELINE.md` (+ `EDUOS_CLASS10_COMPLIANCE_MATRIX.json`),
`EDUOS_CLASS10_2026_27_COMPLIANCE_CERTIFICATION.md` and
`EDUOS_CLASS10_LAUNCH_READINESS_REPORT.md`.

### 1a-i. Official source registry (completed 2026-09-03)

Four of the six required 2026-27 source categories are now `final`/`applicable`
with recorded SHA-256 checksums: the CBSE secondary curriculum document, both
subject syllabi, all 27 NCERT Class X chapter PDFs (edition pinned by a composite
checksum) and the NCERT rationalised-content booklet. The SOURCE gate therefore
fails on **two** types instead of five: `sample_paper` and `marking_scheme`, which
CBSE has not yet published for 2026-27 (index URL returns HTTP 404). Six
prior-session 2025-26 sample papers and marking schemes are recorded as
`not_applicable` reference only. Evidence:
`EDUOS_CLASS10_MISSING_OFFICIAL_SOURCES_REPORT.md`,
`content/compliance/class-10-2026-27.sha256-manifest.json`.

### 1a-ii. Draft corpus prepared for SME review (2026-09-03)

All 326 drafts reconcile exactly once between the register and the live database
(sorted `external_ref` MD5 identical). Automated validation returns **0 blockers**
and 242 warnings; 0 exact duplicates, 1 cross-pool near-duplicate pair, 4 NCERT
verbatim-overlap flags. Pools are disjoint (125 diagnostic / 201 fresh
reassessment). Named-SME queues are `EDUOS_CLASS10_MATHS_SME_REVIEW_QUEUE.csv`
(235) and `EDUOS_CLASS10_SCIENCE_SME_REVIEW_QUEUE.csv` (91). **Nothing was
promoted**; every item remains `draft`/`unverified`, and the Science source book
remains unapproved pending a named Science SME signature. Evidence:
`EDUOS_CLASS10_DRAFT_VALIDATION_REPORT.md`.

## 1b. Product language

EduOS is **English only** (founder decision, 2026-08-28). The Hindi toggle and Hindi
dictionary are removed; a regression test blocks their return. See
`EDUOS_POST_VISUAL_ACCEPTANCE_PILOT_GATE.md`.

## 2. Platform

| Area | State | Evidence |
|---|---|---|
| Stack | TanStack Start v1 + React 19 + Vite 7 + Tailwind v4; backend on Lovable Cloud | repo |
| Routes | 16 public/route files + 41 authenticated route files | `src/routes` listing |
| Roles in use | admin 1, reviewer 1, educator 5, parent 3, student 15 (25 auth users) | `user_roles`, `auth.users` |
| Automated tests | **256 passing / 19 files** | `bunx vitest run`, 2026-08-29 |
| Production URL (live, HEAD `463eb6d`) | https://www.eduos.global (also learning-start-nexus.lovable.app) | HTTP 200 + bundle verification |
| Custom domain | `www.eduos.global` live; apex `eduos.global` **awaiting DNS** | project domain status |

## 3. Content — Class 10 status (live database, verified 2026-09-02)

| Book | Grade | Status | Units | Chapters | Atoms | Questions |
|---|---|---|---|---|---|---|
| NCERT Class 10 Mathematics (CBSE) | 10 | approved | 7 | 14 | 15 | 280 |
| NCERT Class 10 Science (CBSE) | 10 | **processed** (not yet approved) | 5 | 13 | 55 | 256 |
| CBSE Class 10 Mathematics — Meridian Pilot | 10 | archived 2026-08-29 | 2 | 2 | 5 | 15 |
| NCERT Science — Class 10, Ch. 1 (earlier partial upload) | 10 | archived 2026-08-27 | 1 | 1 | 8 | 44 |
| Knowledge Bank for Children | 3 | archived 2026-08-26 | 6 | 64 | 18 | 35 |

Active Class 10 scope: **2 books, 12 units, 27 chapters, 53 topics, 70 outcomes, 70 atoms, 536 question-bank rows** — 210 `import`/`approved`/`verified` (Maths 45 + Science 165) and 326 `ai`/`draft`/`unverified` (Maths 235 + Science 91). No non-Class-10 book is active.

Import is idempotent via `question_bank.external_ref` unique index. Both packs passed the four validation gates in `EDUOS_CLASS10_IMPORT_EXECUTION_REPORT.md`.

Resolved: the single-chapter Science book (`26ac60d7…`) that duplicated Chapter 1 of the full Science pack is archived and out of every active selector.

## 4. Parent monetization status (VERIFIED)

| Metric | Value |
|---|---|
| `parent_orders` | 7 total — 4 paid, 2 created, 1 failed |
| `parent_entitlements` | 4 |
| `payment_webhook_events` | 121 |
| Gateway credentials | `RAZORPAY_KEY_ID` present with **`rzp_live`** prefix; key secret and webhook secret both present |
| Webhook | `POST /api/public/razorpay-webhook`, HMAC-verified before parsing, idempotent |

⚠️ **Contradiction resolved by evidence:** `EDUOS_RELEASE_READINESS_REPORT.md` and `EDUOS_LIVE_PAYMENT_VALIDATION.md` state the gateway is blocked on `rzp_test_…` keys. The current runtime secret is `rzp_live…`, so that blocker is **stale**. What remains unverified is whether the **live-mode webhook secret** matches the live dashboard endpoint and whether a real ₹199 capture has succeeded end-to-end.

### Shalini Patel → Earth Patel journey (VERIFIED)

- Learner: **Earth Patel**, `ee1b33b7-a570-4528-848f-c23199bd907d`, handle `earthpatel-e3ab7e1b`, grade 10.
- Parent user: `1a174fb9-9d1b-429c-9563-94e66b1dd2f8` (Shalini Patel).
- Orders: one **paid ₹199** (19900 paise) and one **failed ₹2,800** (280000 paise) upgrade attempt.
- Entitlement `b765e0d0…` kind `diagnostic_credit`, granted 2026-08-26 18:51 UTC, **consumed** 18:52 UTC.
- Assessment sessions: **1, status `submitted`**.
- `educator_id` is **NULL** — the self-serve AI study plan path applies (commit `6f570d0`).
- Student auth login was repaired manually; see `EDUOS_STUDENT_LOGIN_ROOT_CAUSE.md`.

⚠️ **Unresolved:** the ₹2,800 failed order — whether that is the ₹2,999-less-₹199-credit upgrade and why it failed is not verified.

## 5. UI/UX state

- Landing V2 with parent CTAs, pricing block and lead capture (`public.pilot_leads`).
- Parent portal `/parent`, diagnostic funnel `/diagnostic → checkout → session → report → upgrade`.
- Role-first sign-in at `/auth` with remembered last role and student handle+PIN guidance.
- Student home shows an auto-generated study plan (strengths / focus areas / next topics) when no educator is assigned; educator messaging renders only when `educator_id` is set.
- Hindi ↔ English toggle across parent surfaces (English fallback). SEO metadata and staff surfaces remain English.
- Dark/light theme, PWA manifest, cookie consent, guided tours and onboarding checklist with one-time completion.

## 6. Audit & security state

- Audit centres deployed and gated to `admin` / `reviewer`: curriculum, gap analysis, assessment builder/blueprint, diagnostic engine, question bank, launch, sprint 3/4/5, RLS verification, payment audit, pilot evidence, outcome proof.
- Last recorded audit run: Curriculum 7/7, Gap 7/7, Builder 3/3 — all PASS (`EDUOS_CLASS10_IMPORT_EXECUTION_REPORT.md`).
- RLS enabled with org isolation through `private` schema `SECURITY DEFINER` helpers. One accepted linter warning (`SECURITY DEFINER` helper callable by signed-in users). No critical findings open at last release.
- ⚠️ **Unverified:** no security scan has been re-run since the import and the study-plan changes.

## 7. Publishing state

- Latest published release documented: Pilot Release 1.0, 2026-08-26 17:03 UTC.
- Commits after that release — including `6f570d0` "Removed educator dependency" — are in the repository. Whether they have been published to production is **NOT VERIFIED**; publishing is a manual founder action and standing policy is not to publish without an explicit request.

## 8. Source reports

`EDUOS_PRODUCTION_RELEASE_REPORT.md`, `EDUOS_RELEASE_READINESS_REPORT.md`, `EDUOS_LIVE_PAYMENT_VALIDATION.md`, `EDUOS_CLASS10_IMPORT_EXECUTION_REPORT.md`, `EDUOS_CLASS10_IMPORT_APPROVAL_FINAL.md`, `EDUOS_CLASS10_DIAGNOSTIC_EXPERIENCE_IMPLEMENTATION.md`, `EDUOS_P0_FOUNDER_REMEDIATION_REPORT.md`, `EDUOS_STUDENT_LOGIN_ROOT_CAUSE.md`, `EDUOS_ROLE_LIFECYCLE_AUDIT.md`.

---

### Update protocol

Updated by the Lovable agent at the end of any turn that changes deployed behaviour, imports content, or changes payment/publish state. The founder updates §7 after each manual publish. Every edit must refresh the "Last verified" date and cite the query or command used.

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

## Update 2026-08-27 (Release identity + handoff package)

**Last verified:** 2026-08-28 (UTC)

| Item | Value |
|---|---|
| Canonical branch | `main` |
| Last functional commit | `92ac129d6e62b70bdd382db7a5aa8fdccadfe24c` |
| **Deployed production HEAD** | **`e73bbb047889fe3e8043be90e56e833f068a04dc`** (documentation-only above `92ac129`; no code delta) |
| Intermediate documentation commit | `db55f6fdf44d4368bca557a80d000cb639a751d4` |
| Production URL (English-only release live, HEAD `d874fb4`) | https://www.eduos.global (200 OK on `/` and `/diagnostic`, re-checked 2026-08-27) |
| Rollback | `54baba6d79f0f227b44ef3140d2720f026551b0c`; pre-consolidation `e03ce27` |

- **Authoritative test total corrected:** the "46/46 tests pass" figure recorded in §2 and in the previous update was accurate at the time of that assignment; the current authoritative single run is **70 passed / 8 files** (`bunx vitest run`, `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` §2). Historical figures retained above as written.
- **`EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` added** to the canonical repository as the session-continuity bootstrap document; it carries the deployed SHA and inline `[CORRECTED 2026-08-27]` annotations where its claims were disproved by repository evidence.
- **Publishing state (§7) superseded:** the verified canonical HEAD was published; production serves `e73bbb0`.
- **Note:** `EDUOS_PROJECT_OPERATING_SYSTEM.md` does not exist in the repository. Its rules live in the handoff package (§14–§16) and `PRODUCT_DECISIONS.md`.

---

## Update 2026-08-27 (Handoff file location audit)

**Last verified:** 2026-08-28 (UTC) · Canonical branch: `main`

| Handoff file | Repository path | Tracked | State |
|---|---|---|---|
| `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` | repository root | Yes — introduced in `db55f6fdf44d4368bca557a80d000cb639a751d4` | **Current** (no superseding release since) |
| `EDUOS_PROJECT_OPERATING_SYSTEM.md` | repository root | Yes — created in this documentation commit | **Current** (new; rules extracted from `EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` §1, §3–§8, §14–§17) |

- Repository-wide search (`git ls-files`, root and all folders) found no prior
  `EDUOS_PROJECT_OPERATING_SYSTEM.md` at any path and no second copy of the
  consolidated verification report. The earlier note stating the operating-system
  file does not exist is therefore **superseded** by its creation here.
- Documentation-only change: no application code, schema, migration or translation
  touched. Test, typecheck and build results carry over unchanged from
  `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` §2 (70 passed / 8 files; typecheck
  PASS; production build PASS).
- Rollback reference: `e73bbb047889fe3e8043be90e56e833f068a04dc` (previous deployed
  documentation HEAD); application rollback `54baba6d79f0f227b44ef3140d2720f026551b0c`.

## Update 2026-08-27 (Documentation HEAD SHA stamp)

- **Documentation HEAD full SHA: `18321a2dbc0b32b3eb55e6c8988740d8a0a07894`** — contains `EDUOS_PROJECT_OPERATING_SYSTEM.md`, `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md`, this file, `CURRENT_ASSIGNMENT.md`, and `EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md`; all tracked; working tree clean at stamp time.
- **Production application SHA (separate): `92ac129d6e62b70bdd382db7a5aa8fdccadfe24c`** — last functional/code-bearing commit; all commits above it are documentation-only.
- This stamping update is documentation-only; no production redeploy required.


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

## 2026-08-28 — Wave 0 Curriculum Catalogue, Entitlement and Pricing Foundation

- Additive migration added the curriculum catalogue (boards, academic years, classes, streams, subjects,
  subject sources), learner subject selections, the new `entitlements` model, and configurable pricing
  (`price_plans`, `price_bundles`, `discount_rules`, `centre_contracts`) plus `parent_orders.price_snapshot`.
- Backfilled CBSE 2026-27, Classes 9–12 (only Class 10 active) and the two live Class 10 subjects; books,
  orders and legacy purchases mapped; live prices recorded as configuration (₹199 / ₹2,999, unchanged).
- Commercial scope is unchanged: CBSE Class 10 Mathematics and Science only. Classes 9, 11, 12, all streams,
  bundles and future prices exist structurally but are inactive and invisible.
- Tests: 135 passing (13 files). Typecheck and production build clean. No new security or RLS finding.
- Evidence: `EDUOS_WAVE_0_FOUNDATION_IMPLEMENTATION_REPORT.md`. Rollback: `48548b420c601f8bcaf11a47c6853a55ebfb5526`.
- Next gate: Wave 1 — Class 9 Mathematics and Science content preparation.

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

## 2026-08-30 07:19 UTC — P0 Quality Gate Production Deployment

- Canonical branch: `main`.
- Deployed production commit: **`463eb6ddd610d0e117520dc333e4228cf851b5b8`** — "Fixed parent form & session bugs" (merge of defect-fix branch; application delta in parent commits).
- Production URL: https://www.eduos.global — LIVE, HTTP 200, verified 2026-08-30 ~07:19 UTC.
- Deployment ID: `209dfb7fd3e224ad4c42fc77d55a4499882d52ebbda44e34bcdb5069d6b03137`.
- Defects closed:
  - Raw Zod validation JSON displayed to parents in `ParentDetailsCard` — now sanitized via `friendlyErrorMessage` and inline `zodFieldErrors`.
  - Student assessment session crash when `result` column held a `DiagnosticReport` object instead of a `ResultEntry[]` array — now normalized via `normalizeResultEntries`/`asResultEntries`.
- Tests 271/271 passing · typecheck clean · production build clean · worktree clean.
- Bundle-content verification: `/assets/parent-details-card-D31pK5_f.js` and `/assets/user-errors-B0PWSwqR.js` present and contain the new friendly-error strings, proving the defect-fix code is served from production.
- Security: 0 critical findings (3 pre-existing warnings remain under review).
- No schema changes, no migrations, no translations.
- Rollback: previous production commit `e6e34008bd264b1533707180428d860dda76a6f9`; no data rollback required.
- Next gate: subject-expert approval of the 326 rebuilt Class 10 items (content governance, not software).
