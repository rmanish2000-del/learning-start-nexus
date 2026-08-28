# EduOS Classes 9–12 Curriculum, Entitlement and Pricing Architecture

Date: 2026-08-28 (UTC) · Priority: P0 Expansion Foundation · Target authority: APPLICATION
Repository: `rmanish2000-del/learning-start-nexus` · Branch: `main` · Production: https://www.eduos.global

**Mode: audit and architecture only.** No application code was changed, no curriculum imported, no selector activated, no price altered, no deployment performed.

Baseline note: the assignment quotes `d874fb4b0b5973cdef42301ad6021a3d0e20f349`. Repository HEAD at audit time is `55fd10040cf00d23fb2dce638538695ce5d17c59` — the intervening commits are documentation-only continuity updates; runtime code is unchanged.

---

## 0. Defect found during the audit (not fixed, requires approval)

`src/routes/index.tsx` FAQ still states the product "support[s] English and Hindi where currently translated". This contradicts the shipped English-only release. Classification: **public copy defect**, one line, no logic. It is out of scope for this audit's code rule and is listed as founder decision D9.

---

## 1. Phase 1 — Current-state constraint map

Every constraint below was read from source, not assumed.

### 1.1 Scope constants

| Constraint | Location | Value | Class |
|---|---|---|---|
| `PILOT_BOARD` | `src/lib/parent-account-shared.ts:11` | `"CBSE"` | SAFE_TO_GENERALIZE (becomes catalogue row) |
| `PILOT_CLASS` | `parent-account-shared.ts:12` | `10` | SAFE_TO_GENERALIZE |
| `BOARDS` / `CLASSES` arrays | `parent-account-shared.ts:13–14` | single-element | SAFE_TO_GENERALIZE |
| Add-student zod `z.literal(PILOT_CLASS)` with message "The pilot covers CBSE Class 10 only" | `parent-account-shared.ts:39` | hard reject | CURRENT_SCOPE_GUARD |
| `FREE_CHECK_SUBJECTS` | `free-check-shared.ts:12` | `["Mathematics","Science"]` | SAFE_TO_GENERALIZE |
| Catalogue book query `.eq("grade", 10)` | `parent-diagnostic.server.ts:77` | Class 10 only | CURRENT_SCOPE_GUARD |
| Order guard `if (book.grade !== 10) throw "Only Class 10 diagnostics are on sale."` | `parent-diagnostic.server.ts:312` | server refusal | MUST_REMAIN until per-class commercial status exists (then becomes "is this catalogue entry commercially active?") |
| CSV import `grade: z.number().int().min(1).max(12)`, free-text `subject` | `centre-onboarding-shared.ts:10–11` | already general | SAFE_TO_GENERALIZE — but subject is unvalidated free text, REQUIRES_SCHEMA_CHANGE to become a catalogue FK |
| CSV template row `10,Mathematics` | `centre-onboarding-shared.ts:29` | example only | SAFE_TO_GENERALIZE |
| Public copy "CBSE Class 10 Mathematics and Science" | `src/routes/index.tsx` (5 occurrences: lines 33, 58, 210, 456, plus positioning blocks) | marketing | REQUIRES_PRODUCT_DECISION |

### 1.2 Pricing constants

| Constraint | Location | Value | Class |
|---|---|---|---|
| `PRICING.diagnosticPaise` | `parent-diagnostic-shared.ts:16` | 19 900 | REQUIRES_PRICING_DECISION |
| `PRICING.planPaise` | `:17` | 299 900 | REQUIRES_PRICING_DECISION |
| `PRICING.creditPaise` | `:18` | 19 900 | REQUIRES_PRICING_DECISION |
| `PRICING.creditWindowDays` | `:19` | 30 | REQUIRES_PRODUCT_DECISION |
| ₹2,800 derived (`planPaise − creditPaise`) | `:242` | derived, never stored as a literal | MUST_REMAIN as derivation |
| Literal `₹199` / `₹2,999` / `₹2,800` in route copy | `src/routes/index.tsx:489,495,501,507`, `diagnostic.index.tsx`, `diagnostic.checkout.$orderRef.tsx` | display strings | REQUIRES_SCHEMA_CHANGE (must read from a pricing table, not literals) |
| `amount_paise` on `parent_orders` | schema | immutable per order | MUST_REMAIN (order snapshot) |

Good news: money is server-authoritative in one module. There is exactly **one** pricing source of truth to generalise, plus display literals to delete.

### 1.3 Assessment / diagnostic engine

| Constraint | Location | Value | Class |
|---|---|---|---|
| `DIAGNOSTIC_QUESTION_TARGET` | `parent-diagnostic-shared.ts` | 20 | SAFE_TO_GENERALIZE (per class-subject override) |
| `DIAGNOSTIC_QUESTION_MINIMUM` | same | 5 | SAFE_TO_GENERALIZE |
| Unit purchasability filter `approvedQuestions >= DIAGNOSTIC_QUESTION_MINIMUM` | `parent-diagnostic.server.ts:133` | 5 | MUST_REMAIN as a gate, value becomes per-subject |
| Eligibility filter `status=approved AND verification_state=verified` | `parent-diagnostic.server.ts:98–101` | strict | MUST_REMAIN |
| `CHAPTER_GROUP_MARKS = 20` | `parent-diagnostic-shared.ts` | CBSE Class 10 marks assumption | REQUIRES_SCHEMA_CHANGE (per class-subject marks weighting) |
| `GAP_THRESHOLD_PCT = 70`, band cut-offs 40/60/80 | `parent-diagnostic-shared.ts` | universal | SAFE_TO_GENERALIZE (subject override optional) |
| Blueprint largest-remainder allocation | `diagnostic-shared.ts:67–212` | subject-agnostic | SAFE_TO_GENERALIZE — no change needed |
| Assessment draft scope derived from book + unit | `assessments.server.ts` `createAssessmentDraft` | already data-driven | SAFE_TO_GENERALIZE |
| Publishing gates, `client_request_id` idempotency | `assessments.server.ts` | scope-neutral | MUST_REMAIN |

### 1.4 Curriculum and question bank

`books(board, grade, subject)` are plain columns with no catalogue table, no academic year, no version, no commercial status. `curriculum_units/chapters/topics/outcomes` carry `status` but no review metadata beyond question level. `question_bank` already has `verification_state`, `verified_by`, `verified_at`, `external_ref`, `source`, `stimulus`, `parent_question_id`. Classification: **REQUIRES_SCHEMA_CHANGE** for catalogue, academic year, versioning and commercial status; question-level review metadata is reusable as-is.

### 1.5 Entitlements and orders

`parent_entitlements(kind ∈ diagnostic_credit | board_success_plan, learner_id, order_id, expires_at)`. No board, class, subject, bundle, stream or credit amount. Plan expiry is a hardcoded `+365 days` at `parent-diagnostic.server.ts:395`. Classification: **REQUIRES_SCHEMA_CHANGE**, additive only.

### 1.6 Study plans, tutor, reports, dashboards

`study-plan*.ts`, `tutor.server.ts`, `gap.server.ts`, `outcomes.server.ts` read subject/topic as strings from learner and outcome rows. They are already subject-agnostic; the exposure is that **AI Tutor boundaries and study-plan copy have only ever been reviewed against Maths/Science**. Classification: REQUIRES_CONTENT_REVIEW per subject, not schema change.

### 1.7 Tests and continuity docs

13 test files, 105 passing. `payment-acceptance`, `parent-payment-capture`, `learner-answer-ownership`, `centre-onboarding` all embed 19 900 / 299 900 and grade 10 fixtures — CURRENT_SCOPE_GUARD, must be extended rather than replaced. `PRODUCT_DECISIONS.md`, `TECHNICAL_STATE.md`, `PROJECT_STATUS.md` all assert Class 10 scope — REQUIRES_PRODUCT_DECISION on update timing.

**Summary counts:** 12 SAFE_TO_GENERALIZE, 7 CURRENT_SCOPE_GUARD, 9 REQUIRES_SCHEMA_CHANGE, 6 REQUIRES_PRODUCT_DECISION, 5 REQUIRES_PRICING_DECISION, 6 REQUIRES_CONTENT_REVIEW, 5 MUST_REMAIN.

---

## 2. Phase 2 — Target curriculum model

Additive tables; nothing existing is dropped.

```text
boards
 └ academic_years
    └ catalogue_classes            (9, 10, 11, 12)
       └ catalogue_streams?        (nullable: Science, Commerce, Humanities)
          └ catalogue_subjects     (the sellable unit: board+year+class+subject)
             └ subject_sources     (books / reference material, non-copyrighted)
                └ curriculum_units  (existing)
                   └ curriculum_chapters (existing)
                      └ assessment_outcomes (existing)
                         └ question_bank (existing)
```

### 2.1 `catalogue_subjects` — the sellable unit

| Column | Purpose |
|---|---|
| `id uuid` | stable ID |
| `board_id`, `academic_year`, `class_level int`, `stream text NULL` | placement |
| `code text` | canonical code, e.g. `CBSE-2026-C11-SCI-PHY` |
| `display_name text` | "Physics" |
| `version int`, `supersedes_id uuid NULL` | versioning |
| `is_active bool` | visible internally |
| `commercial_status text` | `draft \| content_review \| pilot \| purchasable \| retired` |
| `review_state`, `reviewer_id`, `reviewed_at` | human gate |
| `diagnostic_eligible bool` | derived + explicitly flipped by gate |
| `min_questions_per_outcome int`, `diagnostic_target int` | replaces global 5/20 |
| `reassessment_ready bool` | fresh-item inventory confirmed |
| `chapter_group_marks int` | replaces the hardcoded 20 |
| `archived_at timestamptz` | archive, never delete |

`subject_sources` records source type (`ncert_reference`, `board_syllabus`, `original`, `licensed`), an internal reference string, and an explicit `copyright_cleared bool` — it never stores textbook text.

### 2.2 Classes 11–12 stream handling

Stream is a **navigation label**, not a constraint. Per-learner truth lives in `learner_subject_selections(learner_id, catalogue_subject_id, selected_at, source)`. Maths + Biology together is simply two rows. Entitlements are always per `catalogue_subject_id`, never per stream, so no combination is structurally forbidden.

### 2.3 Migration plan (additive, four steps, each independently revertible)

1. Create catalogue tables + GRANTs + RLS (`SELECT` to `authenticated` where `commercial_status='purchasable'`; full access via `service_role`; org-scoped writes for admins).
2. Backfill: one `boards` row (CBSE), one `academic_years` row, `catalogue_classes` 9–12, and **one** `catalogue_subjects` row per existing Class 10 Maths/Science book, marked `purchasable`, `diagnostic_eligible=true`.
3. Add nullable `catalogue_subject_id` to `books`, `learners`, `parent_orders`, `parent_entitlements`; backfill the Class 10 rows; leave nullable.
4. Only after every read path tolerates the column, tighten NOT NULL — a separate, later migration, never in Wave 0.

No destructive statement appears anywhere in this plan.

---

## 3. Phase 3 — Content pipeline (AI-assisted, human-gated)

```text
official syllabus reference (no textbook text)
 → structured draft (Gemini via AI Gateway)
 → JSON-schema validation (reject on any violation)
 → curriculum mapping to outcomes
 → original question generation
 → automated structural checks (schema, options, single key, units, length)
 → duplicate detection (normalised prompt hash + embedding near-duplicate)
 → answer verification (independent second pass, disagreement = block)
 → subject-matter review (human)
 → approval  → diagnostic eligibility → reassessment eligibility
```

Hard invariants, enforced server-side:

- Every AI-produced row enters as `status='draft'`, `verification_state='unverified'`, `source='ai'`.
- No code path may set `approved`/`verified` without a `question_verifications` row naming a human reviewer. This already holds via `apply_question_verification()`; it must be extended to catalogue rows.
- `commercial_status='purchasable'` may only be set by an admin action that records reviewer evidence.
- Reassessment inventory must be **disjoint** from diagnostic inventory for the same outcome.

### 3.1 JSON schemas (contract summary)

| Schema | Required fields |
|---|---|
| `catalogue.subject` | code, board, academic_year, class_level, stream?, display_name, version, commercial_status, min_questions_per_outcome, diagnostic_target, chapter_group_marks |
| `catalogue.source` | source_type, internal_reference, copyright_cleared, notes (never full text) |
| `curriculum.unit` | code, title, position, subject_code |
| `curriculum.chapter` | code, title, position, unit_code, estimated_marks |
| `curriculum.outcome` | code, title, category, bloom_level, difficulty(1–5), diagnostic_weight, question_types[], intervention_strategy, prerequisite_codes[] |
| `question.item` | outcome_code, kind, difficulty, competency, cognitive_level, stimulus?, prompt, options?, correct_answer, explanation, source='ai'\|'manual', originality_attestation |
| `question.answer_key` | correct_answer, accepted_variants[], tolerance?, unit? |
| `review.evidence` | reviewer_id, action, note, checked_items[], timestamp |

All schemas reject any field carrying more than a short original stimulus, and every item requires an originality attestation.

---

## 4. Phase 4 — Subject-specific requirements

**Mathematics** — LaTeX/MathML notation field; step-validation metadata for multi-step items; `accepted_variants` to permit alternate valid methods; explicit numerical `tolerance` and significant figures; diagrams original SVG only; per-subject `calculator_allowed` flag mirroring board policy.

**Science** — `discipline` tag (Physics/Chemistry/Biology) on outcomes; SI-unit validation on every numeric answer; balanced-equation validation for chemistry items; all diagrams original; experiment items require a safety-review checkbox in reviewer evidence.

**Social Science** — `discipline` tag (History/Geography/Political Science/Economics); every date and factual claim carries a verification note; maps and images must be original or public-domain with recorded provenance; a neutrality check in the review rubric for political and historical items.

**English** — reading passages must be original or licensed with recorded licence reference; grammar items require `accepted_variants`; subjective responses are **not** auto-scored in Wave 3 — they are rubric-scored and excluded from diagnostic allocation; rubric stored alongside the item; automated scoring limitation stated in the report.

**Computer Applications / IT / Computer Science** — `language` and `language_version` metadata; syntax validation by parsing; expected-output verification through executable test cases where the language allows it in the review tooling (never at runtime in the Worker); curriculum-year matching so a syllabus revision invalidates affected items via `version`/`supersedes_id`.

---

## 5. Phase 5 — Entitlement model

New table `entitlements` (successor to `parent_entitlements`, which remains readable and untouched):

`id, learner_id, board_id, academic_year, class_level, stream NULL, catalogue_subject_id NULL, bundle_id NULL, entitlement_type, starts_at, expires_at, status, source_order_id, credit_amount_paise, credit_consumed_at, sponsor_type (parent|centre), org_id NULL`

`entitlement_type ∈ subject_diagnostic | subject_annual | class_bundle | selected_subject_bundle | diagnostic_credit | centre_sponsored`.

Resolution rule (single server helper, used by every gate): a learner may access a class-subject if an entitlement row is `active`, unexpired, and matches either the exact `catalogue_subject_id` or a bundle that contains it.

Backward compatibility: a view maps each legacy `parent_entitlements` row to the new shape — `diagnostic_credit` → `diagnostic_credit`, `board_success_plan` → `class_bundle` scoped to CBSE Class 10 — so grandfathered purchases resolve without any data rewrite. Migration is additive; the legacy table is never dropped during expansion.

---

## 6. Phase 6 — Pricing architecture

All figures below are **founder-approval hypotheses**. Live pricing (₹199 / ₹2,999 / ₹2,800 credit) is unchanged by this document.

Tables:

- `price_plans(id, code, plan_type, currency, board_id, academic_year, class_level, stream NULL, catalogue_subject_id NULL, bundle_id NULL, amount_paise, tax_mode, effective_from, effective_to, is_active)`
- `price_bundles(id, code, display_name, member_subject_ids[])`
- `discount_rules(id, code, kind (coupon|credit|centre_override), value_paise|percent, conditions jsonb, valid_from, valid_to, max_uses)`
- `centre_contracts(org_id, plan_code, negotiated_amount_paise, active_learner_cap, effective dates)`
- Order snapshot: `parent_orders.amount_paise` plus a new `price_snapshot jsonb` capturing plan code, list price, discounts and tax at purchase time. Snapshots are immutable.

Candidate ladder to validate (not to ship): Free Learning Check — one class-subject; Subject Diagnostic ₹199; Annual Subject Plan ₹1,499–₹1,999; Classes 9–10 Core Bundle ₹3,999–₹4,999; Classes 11–12 Selected-Subject Bundle ₹4,999–₹6,999; centre plans proposal-based per active learner/year.

Credit rule, server-enforced and unchanged in spirit: same learner; the diagnostic must be for a subject contained in the target plan or bundle; applied at most once per diagnostic order (`credit_consumed_at` set transactionally); computed on the server, displayed before checkout, and written into the order snapshot for audit. Route components must render prices resolved by the server, never literals.

---

## 7. Phase 7 — Product and UX impact

| Surface | Change |
|---|---|
| Public copy (`index.tsx`) | scope sentences become data-driven ("currently available" list); pricing blocks read resolved plans |
| Parent learner profile | class picker 9–12, stream picker for 11–12, multi-select subjects from purchasable catalogue |
| Free Learning Check | subject list from catalogue where `diagnostic_eligible`, not `FREE_CHECK_SUBJECTS` |
| Diagnostic catalogue | filter on learner's class + `commercial_status='purchasable'`, replacing `.eq("grade", 10)` |
| Checkout | plan resolution + credit preview from `price_plans` |
| Entitlement display / parent dashboard | list per subject with expiry and source (parent vs centre) |
| Learner home, reports, study plans, AI Tutor | scoped to entitled subjects; tutor boundary prompt parameterised per subject |
| Centre CSV import | `subject` validated against catalogue codes; unknown subject rejected with a clear message |
| Educator assignment, assessment builder, dashboards | subject filter sourced from catalogue |
| Sitemap and metadata | one route per purchasable class-subject, generated from the catalogue |

Rule: **draft or content-review entries never appear in any selector or sitemap.** Purchasability is decided server-side, not by the client filter.

---

## 8. Phase 8 — Quality and release gates (one per class-subject)

Minimum coverage derived from the existing allocation logic rather than invented:

- The engine allocates by blueprint weight with largest-remainder rounding across outcomes, targeting `DIAGNOSTIC_QUESTION_TARGET = 20`, and refuses a unit below `DIAGNOSTIC_QUESTION_MINIMUM = 5` approved+verified items.
- Therefore, per **unit**: at least 20 approved+verified items so the target is reachable without repetition, and at least 1 per outcome carrying non-zero weight, so no weighted outcome is silently unmeasured.
- Reassessment requires a **disjoint** second set: a further 20 per unit, minimum.
- Practical floor per class-subject: `40 × units` verified items, with per-outcome coverage ≥ 1 and difficulty spread across at least three of the five difficulty levels.

Gate checklist (all must pass, per class-subject): curriculum approved · outcomes reviewed · minimum verified coverage above · difficulty distribution · competency coverage · answer-key verification · subject-expert sign-off · diagnostic allocation dry run · fresh reassessment inventory · report verification · AI Tutor boundary verification · pricing configured · entitlement resolution verified · checkout regression green · parent/learner separation test green · centre isolation (RLS) test green · production verification after release.

---

## 9. Phase 9 — Delivery waves

- **Wave 0** — catalogue, versioning, entitlements, pricing configuration, resolver helpers, backfill of existing Class 10 rows. No user-visible change.
- **Wave 1** — Class 9 Mathematics, Class 9 Science.
- **Wave 2** — Class 9 and Class 10 Social Science.
- **Wave 3** — Classes 9–10 English; Classes 9–10 Computer Applications / IT.
- **Wave 4** — Class 11 Physics, Chemistry, Mathematics.
- **Wave 5** — Class 11 Biology, Computer Science.
- **Wave 6** — Class 12 Physics, Chemistry, Mathematics, Biology, Computer Science.

Each wave is a separate implementation assignment plus a separate content-verification assignment, and ships only through its own release gate.

---

## 10. Copyright risk register

| Risk | Control |
|---|---|
| NCERT textbook text reproduced in prompts or explanations | schemas forbid long passages; originality attestation per item; reviewer check |
| Textbook exercises copied as questions | duplicate detection against known exercise phrasing; reviewer sign-off |
| Textbook diagrams or maps | original SVG only, or public-domain with recorded provenance |
| Published answer keys | answers independently derived and verified, never transcribed |
| English reading passages | original or licensed with licence reference stored |
| Uploaded PDFs used as sources | stay in private storage; used for structure only; never served to learners |

---

## 11. Testing requirements

Extend, never replace, the 105 existing tests: catalogue resolution and purchasability filtering; entitlement resolution across subject / bundle / credit / centre-sponsored / grandfathered legacy rows; price resolution with effective dating and credit application; order snapshot immutability; allocation with per-subject targets; reassessment disjointness; selector suppression of non-purchasable entries; RLS isolation for the new tables; and regression proof that existing Class 10 journeys and prices are byte-identical after Wave 0.

## 12. Known limitations

Question volume, not code, is the binding constraint — roughly 40 verified items per unit per class-subject. Subjective English scoring is out of scope for automated diagnostics. Code execution for CS items cannot run in the Worker runtime and must happen in review tooling. Multi-board expansion beyond CBSE is structurally supported but content-unproven. Currency remains INR. Academic-year rollover policy is undecided.

## 13. Rollback considerations

Every migration is additive; new columns are nullable; the legacy `parent_entitlements` table and `PRICING` constant remain in place through Wave 0. Rollback of Wave 0 is a code revert plus leaving unused tables in place — no data loss. Content waves roll back by flipping `commercial_status` to `content_review`, which removes the entry from every selector within one request cycle without touching purchases already made.

## 14. Founder decisions — recorded 2026-08-28

| # | Decision | Founder ruling | Implementation consequence |
|---|---|---|---|
| D1 | Catalogue-driven scope model | **APPROVED** — database-driven curriculum catalogue | Wave 0 builds the catalogue tables; hardcoded Class 10 guards become data flags, not deletions |
| D2 | Academic-year and versioning policy | **APPROVED** — versioning begins with CBSE 2026–27 | First `academic_years` row is `2026-27`; rollover policy still to be defined per year |
| D3 | Subject list per class | **APPROVED** — Classes 9–10 core subjects and Classes 11–12 Science subjects, **including English Core** | Wave list in §9 stands; English Core is in scope for 11–12 |
| D4 | Pricing ladder | **APPROVED FOR ARCHITECTURE ONLY** — configurable pricing; final prices remain unapproved | `price_plans` / `price_bundles` / `discount_rules` are built; no price value ships without a separate approval |
| D5 | Diagnostic-credit rule | **APPROVED** — one eligible ₹199 credit, same learner, qualifying subject or bundle, applied once | Server enforces single consumption via `credit_consumed_at`; no per-year multiplier |
| D6 | Tax handling | **APPROVED FOR CONFIGURATION** — rules remain inactive until accounting approval | `tax_mode` column exists and defaults to inactive; no tax is computed or displayed |
| D7 | Subject-expert review resourcing | **APPROVED** — named subject-expert sign-off required before commercial activation | `commercial_status='purchasable'` requires reviewer evidence naming the expert |
| D8 | Centre contract pricing | **APPROVED FOR ARCHITECTURE** — priced by active learner/year with contract-specific curriculum access | `centre_contracts` carries the learner cap and the entitled catalogue subjects; not self-serve |
| D9 | Stale "English and Hindi" homepage FAQ | **FIX NOW** | Implemented: the FAQ answer now states the interface is English only |

No decision above authorises curriculum tables, data migration, content import, class or subject
activation, price changes, or new selectors. Those belong to Wave 0 and the content waves.
