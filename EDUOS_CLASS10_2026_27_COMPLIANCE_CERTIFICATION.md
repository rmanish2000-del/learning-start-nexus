# EduOS — Class 10 (CBSE, 2026-27) Compliance Certification

**Date:** 2026-08-29 (UTC) · **Priority:** P0 · **Authority:** Application Authority (`learning-start-nexus`)
**Validator:** `compliance-validator/1.0.0` (`bun run scripts/compliance/validate.ts`)
**Standard applied:** `EDUOS_ANNUAL_CURRICULUM_COMPLIANCE_STANDARD.md` · `EDUOS_SUBJECT_COMPLIANCE_GATE.md`

---

## 0. Verdict

| Subject | Verdict | Failing gate checks |
|---|---|---|
| CBSE Class 10 **Mathematics** (041) | **NOT_COMPLIANT** | 7 |
| CBSE Class 10 **Science** (086) | **NOT_COMPLIANT** | 9 |
| Overall derived status | `SOURCE_PENDING` | — |

Neither subject may be advertised as syllabus-complete for session 2026-27. Both
remain **sellable in their current, honestly-scoped form** (see the launch
readiness report) but neither carries a compliance certificate.

The blocking reason common to both subjects is **not** content mapping — mapping
is complete. It is (a) two of six required official source types still
unretrieved, (b) verified question depth far below the reassessment-safe law,
and (c) the absence of a named subject-expert review, which the standard defines
as blocking rather than advisory.

---

## 1. Methodology

Evidence is machine-derived and reproducible. No claim in this document is
asserted by hand.

1. **Live snapshot export** — `bun run scripts/compliance/export-snapshot.ts`
   re-exported `content/compliance/class-10-2026-27.snapshot.json` (94,694 bytes)
   directly from the production database, read-only. This replaced the
   pre-rebuild snapshot, so every number below reflects the post-rebuild corpus.
2. **Deterministic gate run** — `bun run scripts/compliance/validate.ts` executed
   the seven reusable gates in `src/lib/compliance-shared.ts` against that
   snapshot plus the committed official curriculum spine and source registry.
3. **Runtime probe** — `fetchDiagnosticCatalog()` (the exact function that builds
   the paid parent catalogue) was executed against production data to establish
   what a paying parent can actually buy today.
4. **Baseline reconciliation** — the founder-supplied baselines (38 Mathematics +
   46 Science = 84 requirements) were re-crosswalked via
   `scripts/compliance/gemini-bundle.ts`.
5. **Regression suite** — 256 Vitest cases, typecheck, production build.

### 1a. Correction applied during this audit

The two CBSE subject syllabus documents had been retrieved, checksummed and
probed live in the previous assignment
(`content/compliance/class-10-2026-27.source-verification.json`,
HTTP 200, `SOURCES_VERIFIED`, 10/10 and 12/12 probes PASS) but the source
registry still carried them as `pending_confirmation` with null checksums. That
was a stale record, not a missing source. `content/compliance/cbse-2026-27.sources.json`
now records both as `status: final`, `applicability: applicable`, with the real
official URL, retrieval timestamp, SHA-256 and an `evidenceRef`. Registry
validation: **0 errors, 3 warnings** (the three genuinely unretrieved sources).

---

## 2. Requirement coverage — 84/84

| Subject | Official units | Official chapters | Baseline requirements | Mapped to a live EduOS unit | Unmapped |
|---|---|---|---|---|---|
| Mathematics | 7 | 14 | 38 | 38 | 0 |
| Science | 5 | 13 | 46 | 42 | 4 (label alias only) |

`CURRICULUM_GATE` **passes for both subjects** against the official CBSE spine:
every assessable official unit and chapter maps exactly once, and no active
platform unit is out of syllabus.

The four Science "unmapped" rows (`REQ_SCI_2026_041`–`044`) are a **label
mismatch in the founder baseline file**, not a content gap. The baseline names
the unit *"Unit IV: How Things Work"*; the official CBSE 2026-27 Science syllabus
and EduOS both name it *"Effects of Current"*. The underlying chapters
(Electricity; Magnetic Effects of Electric Current) are present, mapped and
carry outcomes and questions. Classified **Non-Blocking — baseline alias**.

### 2a. Per-unit evidence (live snapshot, 2026-08-29)

| Subject | Unit | Outcomes | Approved+verified items | Required (reassessment-safe) | Depth |
|---|---|---|---|---|---|
| Mathematics | Number Systems | 2 | 6 | 40 | FAIL |
| Mathematics | Algebra | 4 | 12 | 40 | FAIL |
| Mathematics | Geometry | 2 | 6 | 40 | FAIL |
| Mathematics | Coordinate Geometry | 1 | 3 | 40 | FAIL |
| Mathematics | Trigonometry | 2 | 6 | 40 | FAIL |
| Mathematics | Mensuration | 2 | 6 | 40 | FAIL |
| Mathematics | Statistics & Probability | 2 | 6 | 40 | FAIL |
| Science | Chemical Substances — Nature and Behaviour | 32 | 96 | 40 | PASS |
| Science | World of Living | 13 | 39 | 40 | FAIL (−1) |
| Science | Natural Phenomena | 4 | 12 | 40 | FAIL |
| Science | Effects of Current | 4 | 12 | 40 | FAIL |
| Science | Natural Resources | 2 | 6 | 40 | FAIL |

Totals: Mathematics 45 verified items, Science 165 verified items.

### 2b. The 326 rebuilt items are present but invisible

| Book | Source | Status | Verification | Count |
|---|---|---|---|---|
| NCERT Class 10 Mathematics (CBSE) | `import` | approved | verified | 45 |
| NCERT Class 10 Mathematics (CBSE) | `ai` | **draft** | **unverified** | **235** |
| NCERT Class 10 Science (CBSE) | `import` | approved | verified | 165 |
| NCERT Class 10 Science (CBSE) | `ai` | **draft** | **unverified** | **91** |

The 326 rebuilt items are loaded, validated (0 errors) and correctly gated: the
paid catalogue query filters on `source = 'import'`, `status = 'approved'` and
`verification_state = 'verified'`, so no unverified item can reach a paying
learner. Approving them is a **human review act**, not an engineering act, and
is the single largest lever on both verdicts — approval alone lifts Mathematics
from 45 to 280 verified items and Science from 165 to 256.

---

## 3. Gate results

### Mathematics — 7 failing checks

| Gate | Result | Failing checks |
|---|---|---|
| SOURCE_GATE | FAIL | `required_types_present`: missing `cbse_curriculum`, `ncert_textbook`, `rationalised_content_notice`, `sample_paper`, `marking_scheme` |
| CURRICULUM_GATE | **PASS** | — |
| OUTCOME_GATE | **PASS** | — |
| QUESTION_GATE | FAIL | `verified_depth` on all 7 units |
| LEARNING_LOOP_GATE | FAIL | `reassessment_reserve_available` |
| REVIEW_GATE | FAIL | `named_reviewer`, `review_timestamp`, `review_decision` |
| COMMERCIAL_GATE | FAIL | `entitlements_scoped` |

### Science — 9 failing checks

| Gate | Result | Failing checks |
|---|---|---|
| SOURCE_GATE | FAIL | same five missing source types |
| CURRICULUM_GATE | FAIL | `source_books_approved`: *NCERT Class 10 Science (CBSE)* is `processed`, not `approved` |
| OUTCOME_GATE | **PASS** | — |
| QUESTION_GATE | FAIL | `verified_depth` on 4 units; `type_coverage` on Chemical Substances and World of Living (single question type) |
| LEARNING_LOOP_GATE | FAIL | `reassessment_reserve_available` |
| REVIEW_GATE | FAIL | `named_reviewer`, `review_timestamp`, `review_decision` |
| COMMERCIAL_GATE | FAIL | `entitlements_scoped` |

---

## 4. Audit findings and classification

### Launch Blockers

| # | Finding | Subject | Evidence |
|---|---|---|---|
| LB-1 | **No named subject-expert review recorded.** The standard defines reviewer absence as blocking. | Both | `REVIEW_GATE` |
| LB-2 | **326 rebuilt items sit unapproved**, so verified depth stays at 45 (Maths) and 165 (Science) against a 40-per-unit reassessment-safe requirement. | Both | `question_bank` counts, `QUESTION_GATE` |
| LB-3 | **Coordinate Geometry is unsellable.** 3 verified items is below `DIAGNOSTIC_QUESTION_MINIMUM = 5`, so `fetchDiagnosticCatalog()` drops the unit. A parent cannot buy a Coordinate Geometry diagnostic; Mathematics ships 6 of 7 units. | Mathematics | live runtime probe |
| LB-4 | **9 of 11 sellable units serve a short diagnostic** — as few as 6 items against a 20-item target. A ₹199 purchase can currently deliver a 6-question paper. | Both | live runtime probe |
| LB-5 | **No fresh reassessment reserve on any unit.** A learner who reassesses will be re-served diagnostic items. | Both | `LEARNING_LOOP_GATE` |
| LB-6 | **Science source book is not approved** (`processed`). The standard requires every mapped source book to be `approved`. | Science | `CURRICULUM_GATE` |
| LB-7 | **Three official source types never retrieved**: rationalised-content notice, sample paper, marking scheme (plus the umbrella curriculum document and the pinned NCERT textbook editions). | Both | source registry |

LB-1, LB-2, LB-6 are single human decisions. LB-3, LB-4, LB-5 are consequences
of LB-2 and clear automatically once the rebuilt bank is approved. LB-7 requires
document retrieval.

### Non-Blocking

| # | Finding | Disposition |
|---|---|---|
| NB-1 | Baseline unit label *"How Things Work"* vs official *"Effects of Current"* (4 Science rows). | Alias; correct the baseline file at next revision. |
| NB-2 | `entitlements_scoped = false`. New purchases write the legacy `parent_entitlements` table (learner + subject scoped) rather than the Wave 0 `entitlements` table (board + year + class + subject scoped; all 5 backfilled rows fully stamped). | No cross-year leakage is possible while 2026-27 is the only sellable session. **Hard condition: must be fixed before the 2027-28 rollover.** |
| NB-3 | Single question type on two Science units. | Diversify during review of the rebuilt bank. |
| NB-4 | Topic-level granularity is absent for 67 of 84 baseline rows; EduOS maps at unit/chapter/outcome level. | Modelling choice, not a coverage gap; the official spine is fully mapped. |
| NB-5 | `duplicateQuestions` is not measurable from the snapshot and is recorded as 0. | Documented limitation of the snapshot contract. |

### Not found (explicitly checked)

Uncovered official requirements: **none**. Duplicate mappings: **none**.
Out-of-syllabus active units: **none**. Orphan outcomes or atoms: **none**.
Invalid mappings: **none**. Source registry errors: **0**.

---

## 5. Path to COMPLIANT

1. Name a subject expert; record reviewer, timestamp and decision (clears LB-1).
2. Review and approve the 326 rebuilt items; set the Science book to `approved`
   (clears LB-2, LB-3, LB-4, LB-5, LB-6, NB-3).
3. Retrieve, checksum and register the remaining official documents (clears LB-7).
4. Re-run `export-snapshot.ts` → `validate.ts` → `report.ts` → `bundle.ts`.

Steps 1 and 2 alone move both subjects to `REVIEW_PENDING`→`COMPLIANT_WITH_ACCEPTED_LIMITATIONS`
territory; step 3 is required for unqualified `COMPLIANT`.

---

## 6. Reproduction

```
bun run scripts/compliance/export-snapshot.ts   # needs read-only SUPABASE_DB_URL
bun run scripts/compliance/validate.ts          # exits non-zero while non-compliant
bun run scripts/compliance/report.ts
bun run scripts/compliance/bundle.ts
bun run scripts/compliance/gemini-bundle.ts
bunx vitest run
```
