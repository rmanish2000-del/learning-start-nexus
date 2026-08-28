# EduOS — Project Status

**Last verified:** 2026-08-28 (UTC)
**Evidence sources:** repository at commit `6f570d0`, live database queries (books, curriculum, question_bank, parent_orders, parent_entitlements, user_roles, assessment_sessions), `bunx vitest run` output, runtime secret inspection, prior reports listed in §7.

---

## 1. One-line status

The Class 10 pilot product is built, imported and deployed; the parent ₹199 diagnostic journey works end-to-end in the database, and the payment gateway now holds **live-mode** credentials. No live acceptance purchase has been verified yet.

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
| Automated tests | **105 passing / 12 files** | `bunx vitest run`, 2026-08-28 |
| Production URL (English-only release live, HEAD `d874fb4`) | https://www.eduos.global (also learning-start-nexus.lovable.app) | project settings |
| Custom domain | `www.eduos.global` live; apex `eduos.global` **awaiting DNS** | project domain status |

## 3. Content — Class 10 import status (VERIFIED)

| Book | Grade | Status | Units | Chapters |
|---|---|---|---|---|
| NCERT Class 10 Mathematics (CBSE) | 10 | approved | 7 | 14 |
| NCERT Class 10 Science (CBSE) | 10 | approved | 5 | 13 |
| NCERT Science — Class 10, Ch. 1 (earlier partial upload) | 10 | approved | 1 | 1 |
| Knowledge Bank for Children | 3 | archived | 6 | 64 |

Aggregate: **4 books, 19 units, 92 chapters, 96 assessment outcomes, 289 question-bank rows** of which **210 have `source = import`** (Maths 45 + Science 165, per the import execution report), 51 AI-generated, 28 manual.

Import is idempotent via `question_bank.external_ref` unique index. Both packs passed the four validation gates in `EDUOS_CLASS10_IMPORT_EXECUTION_REPORT.md`.

⚠️ **Unresolved:** the single-chapter Science book (`26ac60d7…`) duplicates Chapter 1 content of the full Science pack. Not verified whether it is intentionally retained or leftover.

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
