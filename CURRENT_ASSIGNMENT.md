---
# EduOS — Current Assignment

**Last verified:** 2026-09-02 (UTC)
**Evidence source:** the founder's active request in this Lovable thread.

This file holds **only** the active assignment. When it is complete, replace the contents with the next assignment — do not append history.

---

## Governing rules (permanent, inherited by every chat)

- **Founder Non-Execution Rule (mandatory).** Never assign execution work to the founder. Complete all
  possible work through the appropriate AI/tool assignment. Involve the founder only for an unavoidable
  manual action, an inaccessible credential, a payment, a legal/external approval, or a decision that
  cannot be performed by available tools. Any "founder retest/verify/configure" wording anywhere in the
  continuity set is superseded — the AI executes it and the founder only accepts.
- M365 Copilot is AI Program Director and continuity owner; verified results are handed back to it.
- Continue proactively until the objective is fully completed.
- Every delegated task has a separate copy-paste-ready assignment naming the exact tool and mode; every
  implementation or verification stage includes a separate Lovable assignment; every Figma assignment
  includes the complete downloadable implementation package.
- All assignments are written entirely in English. Normal EduOS responses are very short, relevant and in
  Devanagari Hindi, with technical and standard terms in English. Product copy stays English-only.
- Avoid duplicate work unless it is intentional independent verification.
- **Business-Value-First rule (mandatory).** Prioritise work in this order: (1) security and serious
  production risks, (2) revenue/payment/conversion impact, (3) core parent and learner journeys,
  (4) compliance and commercial-release blockers, (5) production defects, (6) necessary UX improvements,
  (7) optional polish. Every assignment must state expected business value and priority; defer or bundle
  low-value polish, duplicate audits and unnecessary documentation; do not repeat completed verification
  without new evidence; do not implement optional features while a higher-value blocker is open; prefer
  one bundled, independently verifiable assignment over multiple small ones.

Full text: `EDUOS_PROJECT_OPERATING_SYSTEM.md` §11, `PRODUCT_DECISIONS.md` D10–D16,
`EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` §G1–G6.

---

## Active assignment

**Title:** Safe PWA Phase 1 — exact verified production promotion
**Received:** 2026-09-03
**Priority:** P0
**Status:** Complete. Patch reconciled as already-present in canonical code; all gates re-run and production republished.

### Outcome

| Item | Result |
|---|---|
| Patch reconciliation | 1067/1068 added lines byte-present; only difference is a stricter `vite-plugin-pwa` pin (`1.3.0` vs `^1.3.0`). No material divergence, no unrelated change |
| Tests | 308/308 passing, 27 files (317 is the staging suite, which carries staging-only tests) |
| PWA safety · offline gating tests | 5/5 · 3/3 |
| Typecheck · build | clean · success, 241 precache entries |
| Service Worker audit | 0 disallowed precache entries; NetworkOnly navigations + `offline.html` fallback; no `clientsClaim`, single gated `skipWaiting`, no background sync |
| Cache Storage | zero private HTML/API/learner/assessment/answer/report/auth/payment content |
| Security scan | 0 critical, 0 error, 3 pre-existing advisory warnings |
| Deployment | Production republished from canonical HEAD; `/api/public/health` → 200 |

Evidence: `EDUOS_SAFE_PWA_PRODUCTION_PROMOTION_VERIFICATION.md`.

---

## Previous assignment (complete)

**Title:** Compliance evidence completion and draft-review preparation (Class 10, 2026-27)
**Received:** 2026-09-03
**Priority:** P0
**Status:** Complete. Local repository only — production untouched, nothing deployed, nothing promoted.

### Outcome

| Item | Result |
|---|---|
| Official source categories completed | 4 of 6 now `final`/`applicable`: CBSE curriculum, both subject syllabi, NCERT textbooks (27 chapter PDFs, composite checksum), NCERT rationalised-content booklet |
| Still missing | `sample_paper`, `marking_scheme` for 2026-27 — CBSE has not published them (index HTTP 404). No substitute used; 2025-26 equivalents recorded as `not_applicable` |
| Source registry | Regenerated, 14 records, 0 errors, 2 pending-confirmation warnings |
| 326-draft reconciliation | Register 326 = database 326, sorted `external_ref` MD5 identical, 0 orphans |
| Automated draft validation | **0 blockers**, 242 warnings; 0 exact duplicates, 1 near-duplicate pair, 4 NCERT verbatim flags |
| Pool allocation | 125 DIAGNOSTIC / 201 FRESH_REASSESSMENT, disjoint, never combined |
| SME queues | Mathematics 235 rows, Science 91 rows — separate files, six empty SME sign-off columns each |
| Promotions | **None.** All 326 remain `draft`/`unverified`; Science source book remains unapproved |
| Compliance verdict | `SOURCE_PENDING` — Mathematics and Science remain NOT_CERTIFIED |
| Tests · typecheck | 308 passing / 27 files · clean |
| Deployment | Not performed |

### Deliverables

`EDUOS_CLASS10_MISSING_OFFICIAL_SOURCES_REPORT.md`, `EDUOS_CLASS10_DRAFT_VALIDATION_REPORT.md`,
`EDUOS_CLASS10_DUPLICATE_REPORT.md`, `EDUOS_CLASS10_COPYRIGHT_CONTAMINATION_REPORT.md`,
`EDUOS_CLASS10_POOL_ALLOCATION_REPORT.md`, `EDUOS_CLASS10_MATHS_SME_REVIEW_QUEUE.csv`,
`EDUOS_CLASS10_SCIENCE_SME_REVIEW_QUEUE.csv`, `content/compliance/class-10-2026-27.{missing-sources,sha256-manifest,draft-db-snapshot,draft-validation}.json`,
regenerated `content/compliance/cbse-2026-27.sources.json` and `EDUOS_CLASS_10_GAP_REGISTER.md`.

New reproducible tooling: `scripts/compliance/retrieve-missing-sources.ts`,
`scripts/compliance/update-source-register.ts`, `scripts/class10/sme-review-prepare.ts`,
covered by `src/lib/__tests__/class10-sme-review-prepare.test.ts`.

### Rollback

Revert the commit for this assignment. It touches documentation, compliance evidence files and
new scripts only — no schema, no migration, no data mutation, no deployment.

### Next gate

Named Mathematics and Science SME sign-off on the two review queues (content governance, not software),
plus CBSE publication of the 2026-27 sample papers and marking schemes. No Class 9, 11 or 12 work, no
pricing expansion and no new features until Class 10 receives a compliance certificate.

---

## Assignment: Canonical Evidence Reconciliation — Class 10 Certification Review Package (2026-09-02)

**Mode:** Lovable, local repository + live database analysis. Read-only. No deployment.
**Status:** Complete.

| Item | Result |
|---|---|
| Deliverables | `EDUOS_CLASS10_CERTIFICATION_REVIEW_PACKAGE_CORRECTED.md`, `EDUOS_CLASS10_CONTRADICTION_RECONCILIATION_REGISTER.md` |
| Reconciliation base HEAD | `8b58bd61449c04236caed1f9a230eec72fbbbcaf` (assignment named `96615046…`; discrepancy disclosed) |
| Superseded evidence commit | `916614a399b8a2786cf26a93827d077120dd3bad` — not used |
| Contradictions | 2 VALID (C-09, C-11), 7 RESOLVED, 3 STALE, 0 UNSUPPORTED |
| Certification status | Mathematics NOT_CERTIFIED · Science NOT_CERTIFIED |
| Validation | 293/293 tests, typecheck clean, build clean, JSON↔CSV exact, source hashes re-verified live |
| Security | 0 critical / 0 error / 3 warn (advisory) |
| Deployment | None. Production remains `b559058753b9d0acc6a25438fdc0cf79122ce4af`, health 200 |

### Next gate

Named SME review and promotion of the 326 existing Class 10 draft items, Science book approval, and
retrieval of the five missing official source types. No new authoring is required — the deficit
(235 Mathematics + 91 Science) equals the existing draft corpus exactly.


---

## 2026-09-03 — P0 SECURITY CLOSED: payment credential access lockdown

`payment_credentials_admin_readable_secrets` is **remediated**. Any-organisation
admin policies on `public.payment_credentials` were dropped; `anon` and
`authenticated` privileges revoked on the credential and audit tables; RLS
enabled with zero policies (service-role-only access); credential audit made
append-only by trigger. Supersedes any earlier statement that admin-readable
payment credential policies were acceptable or that the credential table was
already fully locked down.

Evidence: migration `20260903045542_c9575a2f-747a-40b2-9f0e-2c94e1f15e2c.sql`,
tests 320/320 (incl. 12 new credential-access regression cases), typecheck and
production build clean, security scan zero critical/high.

Razorpay key rotation: **not required** (credential table empty; live keys live
only in platform environment secrets and were never exposed). Optional
precautionary rotation is the only external-credential dependency.

### Production verification (2026-09-03)

Independent post-deployment verification of the payment-credentials lockdown:
migration applied exactly once; zero policies and zero `anon`/`authenticated`
privileges on both credential tables; RLS on; service-role path intact; audit
immutability proven live via a rolled-back probe; credential APIs return masked
status only; checkout and webhook signature verification green; secret scans of
repository and client bundle clean; 320/320 tests, typecheck, build and security
scan pass; production health 200. Details in
`EDUOS_PAYMENT_SETTINGS_SECURITY_AUDIT.md`.

## 2026-09-03 — SME workflow production closeout and current-year content activation

- Deployed SHA (production artifact verified): `3e6866900afacfd2ebe232d1b2e4f43af57372ca`
- Production: https://www.eduos.global — health 200, landing 200; `/sme-review/mathematics`,
  `/sme-review/science`, `/sme-review/` all 302 to `/auth` for anonymous document requests.
- SME workflow live: per-subject queues, four outcomes (only `verified` promotes), mandatory
  reviewer name, qualification and per-item decision basis, append-only decision trail.
- Draft queue unchanged and unreviewed: Mathematics 235 + Science 91 = 326.
- Pilot activation: learner-facing item pools now require `status=approved` AND
  `verification_state=verified` (diagnostic workspace + unit builder), matching the
  build-time rule already enforced in `assessments.server.ts`.
- Migration `20260903145431_...` archived every published paper that was out of current-year
  scope, empty, or contained a non-verified item. Remaining published papers:
  Mathematics "Number Systems — Parent Diagnostic" 12/12 verified items,
  Science "Chemical Substances — Parent Diagnostic" 40/40 verified items.
- Verified approved+verified pool: Mathematics 45, Science 165 (210 total).
- AI Tutor boundary re-audited: writes only `tutor_sessions` / `tutor_interactions`;
  no writes to mastery, assessments, evidence, gaps, recommendations or interventions.
- Tests 339/339, typecheck clean, clean worktree.
- Rollback: republish the previous artifact and
  `UPDATE public.assessments SET status='published' WHERE id IN (...)` for the archived papers.

## 2026-09-04 — Pilot invitation production closeout (COMPLETE)

- Canonical SHA: `01099a65c00f8620292121eebc481a673fab2496`; worktree clean.
- Migration `20260904191218_8acf9525-ce6b-4731-90b0-fa8207ef1782.sql` (`public.pilot_invitations`)
  applied and present in the repository; no pending migrations.
- Production https://www.eduos.global — landing 200, `/api/public/health` `{"status":"ok","environment":"production"}`.
- Invitation states re-verified live on production: valid (masked email, scope, Google + alternate
  sign-in), accepted, expired, withdrawn, invalid — each renders its own message and no valid link
  is served for a consumed/expired/withdrawn token.
- Single-use + expiry are enforced server-side in `acceptInvitation` (conditional claim on
  `accepted_at IS NULL`, expiry and revocation re-checked against the row, email-bound).
- Internal parent `797af203-…` after acceptance: 1 profile, 1 role, 2 learner links (pre-existing),
  2 pilot grants (1 pre-existing + 1 from the invitation, expires 2026-10-19), 0 orders,
  0 entitlements. No order/payment/invoice/discount/credit/Razorpay record written.
- Invitations in the database are internal-only (`internal.pilot+*@eduos.local`,
  `pilot.parent.*@internal.eduos.test`). External-user mode remains INTERNAL_ONLY.
- Tests 405/405 (35 files), typecheck clean, production build clean, security scan: 3 pre-existing
  warnings, no criticals, none from this work.
- Rollback: republish the previous artifact; invitation rows are additive and inert if unused.
