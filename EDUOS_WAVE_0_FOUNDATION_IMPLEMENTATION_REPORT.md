# EduOS — Wave 0 Curriculum Catalogue, Versioning, Entitlement and Pricing Foundation

**Date:** 2026-08-28 (UTC) · **Priority:** P0 Expansion Foundation
**Repository:** `rmanish2000-del/learning-start-nexus` · **Branch:** `main`
**Starting HEAD:** `48548b420c601f8bcaf11a47c6853a55ebfb5526`
**Architecture authority:** `EDUOS_CLASSES_9_12_EXPANSION_ARCHITECTURE.md` (commit `ae29e2760c3a3c397bb35e434631a507b81b51e0`), founder decisions D1–D9.

Wave 0 is a **foundation-only** release. It adds data-driven curriculum, entitlement and pricing
structure. It activates nothing: production remains CBSE Class 10 Mathematics and Science at
₹199 / ₹2,999 / ₹199 credit / ₹2,800 upgrade, and no new class, subject, bundle or price is
purchasable or even visible.

---

## 1. Schema changes (all additive)

New tables:

| Table | Purpose |
|---|---|
| `catalogue_boards` | Boards (CBSE seeded) |
| `catalogue_academic_years` | Academic-year versioning (`2026-27` seeded, D2) |
| `catalogue_classes` | Classes 9–12; only Class 10 is `is_active` |
| `catalogue_streams` | Science / Commerce / Humanities, all inactive |
| `catalogue_subjects` | The sellable unit: canonical code, version, `supersedes_id`, `is_active`, `commercial_status`, `review_state`, reviewer identity + timestamp, `curriculum_approved`, `outcomes_reviewed`, `diagnostic_eligible`, `reassessment_ready`, per-subject question targets, `chapter_group_marks`, `archived_at` |
| `catalogue_subject_sources` | Source references (`ncert_reference` / `board_syllabus` / `original` / `licensed`) with `copyright_cleared`; never stores textbook text |
| `learner_subject_selections` | Explicit per-learner subject selections |
| `entitlements` | Successor entitlement model (subject diagnostic, subject annual, class bundle, selected-subject bundle, diagnostic credit, centre sponsored) |
| `price_bundles`, `price_plans`, `discount_rules`, `centre_contracts` | Configurable pricing with effective dates, INR, `tax_mode` (inactive, D6), active/inactive |

New columns: `learners.stream_label`, `books.catalogue_subject_id`, `parent_orders.catalogue_subject_id`,
`parent_orders.price_snapshot jsonb`, `parent_entitlements.catalogue_subject_id`. All nullable or defaulted.
Nothing was dropped, renamed or rewritten; `parent_entitlements` and the `PRICING` constant remain authoritative
for the current live journeys.

**RLS/GRANTs:** every new table has RLS enabled with explicit GRANTs. Catalogue and pricing rows are readable
only when commercially available / active; staff and reviewers may read all catalogue rows; only admins may write.
Entitlements and learner selections are readable by the learner, their parent and their centre staff only, and are
written exclusively by the server (service role). Centre contracts are visible to their own organisation only.

## 2. Migration and backfill

One migration, applied successfully. Backfill:

- CBSE board, academic year 2026-27, Classes 9–12 (only Class 10 active), three inactive streams.
- Two catalogue subjects: `CBSE-2026-27-C10-MAT`, `CBSE-2026-27-C10-SCI`, both `purchasable`,
  `diagnostic_eligible`, review `approved`.
- 4 books linked to their catalogue subject, 4 source rows recorded.
- 8 orders linked to their catalogue subject.
- 5 legacy `parent_entitlements` mirrored into `entitlements` (credits → `diagnostic_credit`,
  Board Success Plan → `class_bundle` scoped to Class 10) — grandfathered without rewriting any legacy row.
- Live prices recorded as configuration: `CBSE-2026-27-C10-DIAGNOSTIC` = 19 900 paise,
  `CBSE-2026-27-C10-ANNUAL` = 299 900 paise, tax mode inactive; credit rule `DIAGNOSTIC_CREDIT_199` = 19 900 paise.

## 3. Database evidence (post-migration)

| Check | Result |
|---|---|
| Orphan entitlements | 0 |
| Orphan book → catalogue links | 0 |
| Duplicate canonical catalogue codes | 0 |
| Duplicate legacy entitlement mirrors | 0 |
| Distinct order amounts | 19 900 / 280 000 paise (unchanged) |
| Purchasable catalogue subjects | 2 (Class 10 Mathematics, Science) |
| Active classes | 1 (Class 10) |
| Linter | 2 pre-existing findings only (`payment_credentials` intentionally policy-less; org-scoping SECURITY DEFINER helper) — no new finding |

## 4. Code changes

| File | Change |
|---|---|
| `src/lib/catalogue-shared.ts` | New. Pure domain: canonical codes, commercial availability, version resolution, historical lookup, commercial-readiness gate, learner selections (stream nullable, PCM/PCB/PCMB), entitlement resolution/expiry/renewal, plan resolution by effective date, diagnostic-credit rule (D5), immutable price snapshot |
| `src/lib/catalogue.server.ts` | New. Catalogue, pricing, bundle and entitlement readers plus `isSubjectPurchasable` and `learnerHasSubjectAccess` |
| `src/lib/parent-diagnostic.server.ts` | Diagnostic order creation now additionally refuses any book whose catalogue subject is not `purchasable`. The explicit Class 10 guard is retained; the change can only refuse more, never less |
| `src/lib/__tests__/wave0-foundation.test.ts` | New. 30 assertions across catalogue, versioning, selections, entitlements, credit, pricing and gates |
| Continuity docs | `PROJECT_STATUS.md`, `CURRENT_ASSIGNMENT.md`, `PRODUCT_DECISIONS.md`, `TECHNICAL_STATE.md`, `ROADMAP.md`, `EDUOS_PROJECT_OPERATING_SYSTEM.md`, `EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` |

No UI file was changed. No selector, price, copy or public claim changed.

## 5. Commercial-readiness gate

`evaluateCommercialReadiness()` blocks activation unless: curriculum approved · outcomes reviewed ·
catalogue review approved · ≥ `diagnostic_target` verified items per unit · ≥ 1 verified item per weighted
outcome · a disjoint reassessment inventory of the same size · a named subject-expert sign-off (D7) ·
active pricing. `isCommerciallyAvailable()` is the single filter every selector must use; draft,
content-review, pilot, retired, inactive and archived entries are invisible — enforced in the RLS policy as
well as in code.

## 6. Test evidence

**135 tests passing, 13 files** (authoritative total; 105 before Wave 0). Typecheck clean. Production build clean.
Coverage of the 25 required cases: hierarchy/canonical codes, academic-year isolation, historical preservation,
nullable stream + explicit selections, PCM/PCB/PCMB, subject and bundle entitlements, parent and centre-sponsored
access, expiry and renewal, credit applied once only, same-learner and qualifying-plan enforcement, immutable
order snapshots, effective-date pricing, inactive plans unpurchasable, draft curriculum unpurchasable,
unreviewed content not diagnostic-ready, missing reassessment coverage blocking activation, plus the pre-existing
Class 10 payment, ownership, centre-isolation, assessment lifecycle/idempotency and English-only suites.

## 7. Backward compatibility

Existing learners, organizations, books, outcomes, questions, assessments, reports, orders, entitlements,
diagnostic credits and centre metrics are untouched. Legacy code paths still read `parent_entitlements` and
`PRICING`; the new tables are a parallel, additive model. No destructive statement was issued.

## 8. Inactive future capabilities

Classes 9, 11 and 12; all streams; bundles; subject-annual plans; discount rules beyond the existing ₹199 credit;
centre contracts; tax computation. All exist structurally and are inactive.

## 9. Known limitations

Content volume (~40 verified items per unit) remains the binding constraint. `NOT NULL` tightening of the new
`catalogue_subject_id` columns is deliberately deferred. Legacy `parent_entitlements` remains the authoritative
write path for current purchases; migrating writes to `entitlements` is a later wave. Academic-year rollover
policy is undecided. Currency remains INR.

## 10. Rollback

Code: revert to `48548b420c601f8bcaf11a47c6853a55ebfb5526`. Data: none required — every migration statement is
additive, so the unused tables and nullable columns can be left in place with zero effect on the application.
To retract Wave 0's only behavioural addition, revert the catalogue check in `parent-diagnostic.server.ts`, or
simply leave the two catalogue subjects `purchasable` (their current state, identical to today's behaviour).
