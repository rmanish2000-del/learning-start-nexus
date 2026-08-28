# EduOS — Roadmap

**Last verified:** 2026-08-27 (UTC)
**Evidence sources:** repository at commit `6f570d0`, database state, `EDUOS_CLASS10_IMPORT_APPROVAL_FINAL.md`, `EDUOS_LIVE_PAYMENT_VALIDATION.md`, `EDUOS_PRODUCTION_RELEASE_REPORT.md`, project memory (pilot standby since 2026-08-24).

This roadmap records what is done and what is queued. It does **not** authorise work — see `CURRENT_ASSIGNMENT.md`.

---

## Done (verified)

| Phase | Outcome |
|---|---|
| Phase 1 — Foundation | Org/profile/role schema, role-based dashboards, RLS isolation, Verification Center |
| Sprint 2 — Assessment engine | Item bank, diagnostics, scoring, evidence chain, cross-org test runner |
| Sprint 3 — Gaps & interventions | Gap detection below 70%, recommendations, educator intervention board |
| Sprint 4 — AI Tutor V1 | Socratic tutor scoped to approved interventions, privacy-preserving RLS |
| Sprint 5 — Outcome proof | Reassessment, mastery index, learner outcome report |
| Sprint 5A/5B — Launch readiness | Legal pages, cookie consent, reviewer role, consent, PWA, onboarding tours |
| Sprint 6 / 6C-G / 6R | Book upload, curriculum extraction, blueprint, question bank, diagnostic engine, pipeline consolidation |
| UX 9.0 + UX Phase 1 | Landing V2, lead capture, gap queue, heatmaps, prioritised queues |
| Parent monetization v1 | ₹199 diagnostic + ₹2,999 plan, Razorpay, identity-first purchase, payment audit |
| Hindi v1 | Parent journey translated with English fallback |
| Class 10 launch cleanup | Grade 3 archived, Class 10 Maths + Science imported and validated |
| P0 founder remediation | 8 founder-reported issues closed |
| Educator-free diagnostic journey | Auto-generated study plan when `educator_id` is null |

## Open items (evidence-backed, not yet scheduled)

| # | Item | Why it is open |
|---|---|---|
| 1 | Live ₹199 acceptance purchase + refund | Live keys are in place but no verified live capture exists |
| 2 | Confirm the live-mode webhook secret matches the live dashboard endpoint | Not verifiable from the app side |
| 3 | Publish the post-release commits (including `6f570d0`) | Publishing is manual; publish state after 2026-08-26 17:03 UTC is unverified |
| 4 | Verification Center sign-off on the 210 imported questions | They remain `draft` / `unverified` |
| 5 | Resolve the duplicate single-chapter Science book | Overlaps the full Science pack |
| 6 | Thicken the Maths pack (currently 15 outcomes / 45 atoms) | Causes diagnostic allocation shortfalls |
| 7 | Re-run security scan and DB linter | None run since the import and study-plan work |
| 8 | Point apex `eduos.global` DNS | Domain status: awaiting DNS |
| 9 | Investigate the failed ₹2,800 upgrade order for Earth Patel | Cause unverified |
| 10 | Investigate the 2 `created` orders that never reached `paid` | Cause unverified |

## Candidate next (UNVERIFIED — no founder approval on record)

- Mobile OTP verification for parents.
- Automating Board Success Plan fulfilment (currently manual coaching).
- Hindi coverage for SEO metadata and staff surfaces.
- Additional boards/classes beyond CBSE Class 10 — explicitly out of pilot scope today.

## Constraint

Project memory records **pilot standby since 2026-08-24: bug fixes only** unless the founder explicitly orders new work.

---

### Update protocol

The founder owns the "Candidate next" section and sets priorities. The Lovable agent moves items between Open and Done only with evidence (query, test run, or report) and refreshes the "Last verified" date on each move.

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

**Unblocked:** staff assessment authoring is safe for pilot use; centre-facing authoring can proceed.

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

## 2026-08-28 — Classes 9–12 Expansion Architecture (under review) — CURRENT

- Pilot **deferred** by founder decision; curriculum expansion is under architecture review.
- Current production scope is unchanged: English-only, CBSE Class 10 Mathematics and Science, pricing unchanged.
- Target expansion scope (not yet supported): Classes 9–10 Mathematics, Science, Social Science, English, Computer Applications/IT; Classes 11–12 Science stream — Physics, Chemistry, Mathematics, Biology, Computer Science, English Core where applicable.
- Architecture: database-driven catalogue (board → academic year → class → stream → subject → source → unit → chapter → outcome → question), per-subject commercial status and diagnostic eligibility, additive entitlement table with bundles and grandfathered legacy rows, configuration-driven pricing with immutable order snapshots.
- Delivery waves: Wave 0 architecture; W1 Class 9 Maths/Science; W2 Class 9–10 Social Science; W3 Class 9–10 English + CA/IT; W4 Class 11 Physics/Chemistry/Maths; W5 Class 11 Biology/CS; W6 Class 12 all five. Each wave is a separate implementation and content-verification assignment.
- Minimum content bar derived from live allocation logic: ≥20 approved+verified items per unit for the diagnostic, plus a disjoint ≥20 for reassessment, ≥1 per weighted outcome.
- **No class-subject may be marked supported until it passes its own release gate.**
- Reference: `EDUOS_CLASSES_9_12_EXPANSION_ARCHITECTURE.md`.


---

## 2026-08-28 — Wave 0 Preparation Gate (founder decisions recorded) — CURRENT

- Founder decisions D1–D9 recorded in `EDUOS_CLASSES_9_12_EXPANSION_ARCHITECTURE.md` §14:
  catalogue approved, academic-year versioning from CBSE 2026–27, subject list approved
  (including Classes 11–12 English Core), pricing approved for architecture only, single
  ₹199 diagnostic credit rule approved, tax configurable but inactive, named subject-expert
  sign-off required before commercial activation, centre pricing per active learner/year
  approved for architecture, and the stale Hindi FAQ claim fixed.
- Scope of this assignment: documentation plus a one-line public copy correction. No curriculum
  tables, no migration, no content import, no class or subject activation, no pricing change,
  no new selectors.
- **Next gate:** Wave 0 catalogue, versioning, entitlement and pricing-foundation implementation.

---

## Wave 0 — COMPLETE (2026-08-28)

Catalogue, academic-year versioning, learner subject selections, entitlement model, pricing configuration and
Class 10 backfill shipped. No user-visible change; no new class, subject or price activated.

**Next gate: Wave 1 — Class 9 Mathematics and Science content preparation.**
