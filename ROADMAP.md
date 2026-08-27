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
