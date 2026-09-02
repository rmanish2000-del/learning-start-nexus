# EDUOS Class 10 (CBSE, 2026-27) Certification Review Package — CORRECTED

Status: **REVIEW_PREPARED_NOT_CERTIFIED**
Mathematics: **NOT_CERTIFIED** · Science: **NOT_CERTIFIED**
Mode: canonical evidence reconciliation, local repository + live database, read-only.
Deployment: **none**. Production unchanged.

| Field | Value |
| --- | --- |
| Repository | learning-start-nexus |
| Canonical HEAD at reconciliation | `8b58bd61449c04236caed1f9a230eec72fbbbcaf` |
| Production SHA (live) | `b559058753b9d0acc6a25438fdc0cf79122ce4af` |
| Production | https://www.eduos.global — health `200`, `{"status":"ok","environment":"production"}` |
| Reconciliation timestamp | 2026-09-02T17:40Z |
| External-user mode | INTERNAL_ONLY |
| Reviewed input | `20260902_141808Z_COWORK_CLASS10CERTIFICATIONREVIEWPACKAGE.md` (677 lines, sections 0–17) |
| Superseded evidence commit | `916614a399b8a2786cf26a93827d077120dd3bad` — **not used** |

This document contains **no reviewer identity, no reviewer decision and no signature**. None exists.

---

## 0. Head discrepancy (disclosed, not concealed)

The assignment named starting HEAD `96615046ef14ebb06ba29909ea4256151518974e`. The actual canonical
HEAD in this workspace is `8b58bd61449c04236caed1f9a230eec72fbbbcaf` ("Added continuity rules"),
worktree clean, no untracked files. `96615046…` is an ancestor state of the same documentation-only
governance work. All evidence below is recomputed at `8b58bd61…`; nothing is inherited from
`916614a3…`.

## 1. Source evidence — corrected

The assignment instructed "confirmed CBSE 2025-26 sources only". **No 2025-26 source set exists in
this repository.** What exists, and what was re-verified live during this reconciliation, is the
CBSE **2026-27** subject syllabus set. Substituting a 2025-26 label would have been an invented
claim, so the corrected package uses the sources that actually exist and marks every other source
type as absent.

`bun run scripts/compliance/verify-sources.ts` re-executed today returned `SOURCES_VERIFIED` and
reproduced both digests byte-for-byte:

| Source | URL | HTTP | Bytes | SHA-256 | Status |
| --- | --- | --- | --- | --- | --- |
| CBSE Class X Mathematics (041) syllabus 2026-27 | cbseacademic.nic.in/…/Maths_SecP1X_2026-27.pdf | 200 | 270,782 | `d773e7c12b99e0bd498067e2b8268c76d0496bf9cad1c9e41c8652ab68b412a5` | final / applicable, all identity + unit probes pass |
| CBSE Class X Science (086) syllabus 2026-27 | cbseacademic.nic.in/…/Science_SecP1_2026-27.pdf | 200 | 279,280 | `1bec4a9e44452b22c9d422d8cb528b4de30598f56c243461845165771df7bc37` | final / applicable, all identity + unit probes pass |

**Still absent for both subjects** (BLOCKING): `cbse_curriculum`, `ncert_textbook`,
`rationalised_content_notice`, `sample_paper`, `marking_scheme`.

Note: the Gemini bundle manifest (`review-bundles/class10-2026-27-gemini/`) still states "No
official source document has been checksummed". That statement is **stale**; its own integrity file
verifies clean (`sha256sum -c` → all OK), but its provenance prose predates source confirmation.

## 2. Current inventory — recomputed from the live database

Live query at reconciliation time (books not archived, grade 10):

| Subject | Book status | Units | Items | Approved+Verified | Approved+Unverified | Draft | Retired |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mathematics | approved | 7 | 280 | 45 | 0 | 235 | 0 |
| Science | processed | 5 | 256 | 165 | 0 | 91 | 0 |
| **Total** | — | **12** | **536** | **210** | **0** | **326** | **0** |

Per-unit (database) — reproduces `EDUOS_CLASS10_COMPLIANCE_MATRIX.json` exactly:

| Subject | Unit | Items | Verified (diagnostic-eligible) | Diagnostic set | Reassessment reserve | Depth verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Mathematics | Number Systems | 40 | 6 | 6 | 0 | SHORTFALL |
| Mathematics | Algebra | 40 | 12 | 12 | 0 | SHORTFALL |
| Mathematics | Coordinate Geometry | 40 | 3 | 3 | 0 | SHORTFALL |
| Mathematics | Geometry | 40 | 6 | 6 | 0 | SHORTFALL |
| Mathematics | Trigonometry | 40 | 6 | 6 | 0 | SHORTFALL |
| Mathematics | Mensuration | 40 | 6 | 6 | 0 | SHORTFALL |
| Mathematics | Statistics & Probability | 40 | 6 | 6 | 0 | SHORTFALL |
| Science | Chemical Substances — Nature and Behaviour | 96 | 96 | 20 | 76 | PASS |
| Science | World of Living | 40 | 39 | 20 | 19 | SHORTFALL |
| Science | Natural Phenomena | 40 | 12 | 12 | 0 | SHORTFALL |
| Science | Effects of Current | 40 | 12 | 12 | 0 | SHORTFALL |
| Science | Natural Resources | 40 | 6 | 6 | 0 | SHORTFALL |

Reconciliation: Mathematics 7 × 40 = **280** ✓ · Science 96 + 40 + 40 + 40 + 40 = **256** ✓ ·
total **536** ✓ · verified 45 + 165 = **210** ✓ · reserve sum **95** ✓.
JSON ↔ CSV: 12 rows, **zero** field mismatches on any column.

## 3. Mapping coverage — recomputed

`content/compliance/class-10-2026-27.crosswalk.json` at current HEAD: **84 official requirements
mapped, 0 unmapped**, `unmappedOfficialTopics: []`, `outOfSyllabusUnits: []` for both subjects.
Every chapter carries `mapped: true`, including:

- Mathematics MAT-U5 Trigonometry → *Introduction to Trigonometry* **and** *Some Applications of
  Trigonometry* (Heights and Distances), both mapped, inside the Unit V pool of 40.
- Science SCI-U1 → *Metals and Non-metals*, mapped.

Integrity counters: duplicate prompts 0, orphan atoms 0, atoms without questions 0, questions
without outcome 0, verified-but-not-approved 0. Near-duplicate detection is **not computed**
(disclosed limitation).

One internal inconsistency remains: the crosswalk records `required: 64` for Science Unit I
(marks-weighted) while the matrix depth law uses a flat 40 per unit. Unit I passes under both, so no
verdict changes; the reviewer should still rule which depth law is authoritative.

## 4. Diagnostic and reassessment behaviour report

Code path: assessments are constructed in `src/lib/builder.server.ts` from `question_bank` via
`assessment_question_map`; `src/lib/outcomes.server.ts` assigns reassessment by selecting a
**published** assessment of `kind = 'reassessment'` and linking a session to the outcome. There is
no runtime item-level exclusion of previously-seen diagnostic items — disjointness is a property of
how the two assessments are **built**, not enforced by the assigner.

Live behaviour:

| Fact | Value |
| --- | --- |
| Assessments by kind | diagnostic 15 (11 published, 4 draft); reassessment 2 (1 published, 1 draft) |
| Class 10 reassessment assessments | **0** |
| Class 10 diagnostic mappings | 52 mappings over 26 distinct items (two duplicate published parent diagnostics per book) |
| Repository-wide mappings | 96 over 66 distinct items |
| Cross-kind item reuse observed | **0** |
| Legacy Grade-3 diagnostic ↔ reassessment pair | 9 items vs 9 items, **overlap 0** — disjoint |
| Reassessment exercised for Class 10 | **false** |

Conclusion: pools are disjoint **wherever both kinds exist**, but for Class 10 the reassessment leg
is **unexercised** because no Class 10 reassessment assessment has been built. The reserve of 95
verified items is a paper reserve. This is a real, current blocker and is not a certification.

## 5. Complete current gap register (16 rows — fully enumerated)

| ID | Subject | Gate | Check | Severity | Evidence | Remediation |
| --- | --- | --- | --- | --- | --- | --- |
| GAP-MAT-001 | Mathematics | SOURCE | required_types_present | BLOCKING | five required source types absent | retrieve, checksum, record each official document |
| GAP-MAT-002 | Mathematics | QUESTION | verified_depth | MAJOR | all 7 units below 40 verified | expert-review and promote the 235 draft items |
| GAP-MAT-003 | Mathematics | LEARNING_LOOP | reassessment_reserve_available | MAJOR | reserve 0 in all 7 units | build reserve after depth remediation |
| GAP-MAT-004 | Mathematics | REVIEW | named_reviewer | BLOCKING | none recorded | named SME review |
| GAP-MAT-005 | Mathematics | REVIEW | review_timestamp | BLOCKING | none recorded | named SME review |
| GAP-MAT-006 | Mathematics | REVIEW | review_decision | BLOCKING | none recorded | named SME review |
| GAP-MAT-007 | Mathematics | ENTITLEMENT | entitlements_scoped | MAJOR | false | scope entitlements before activation |
| GAP-SCI-008 | Science | SOURCE | required_types_present | BLOCKING | five required source types absent | retrieve, checksum, record each official document |
| GAP-SCI-009 | Science | SOURCE | source_books_approved | BLOCKING | Science book status is `processed` | approve book under named review |
| GAP-SCI-010 | Science | QUESTION | verified_depth | MAJOR | 4 of 5 units below 40 verified | expert-review and promote the 91 draft items |
| GAP-SCI-011 | Science | QUESTION | type_coverage | MAJOR | single verified question type in 2 units | diversify item types in Units I–II |
| GAP-SCI-012 | Science | LEARNING_LOOP | reassessment_reserve_available | MAJOR | reserve 0 in 3 of 5 units | build reserve after depth remediation |
| GAP-SCI-013 | Science | REVIEW | named_reviewer | BLOCKING | none recorded | named SME review |
| GAP-SCI-014 | Science | REVIEW | review_timestamp | BLOCKING | none recorded | named SME review |
| GAP-SCI-015 | Science | REVIEW | review_decision | BLOCKING | none recorded | named SME review |
| GAP-SCI-016 | Science | ENTITLEMENT | entitlements_scoped | MAJOR | false | scope entitlements before activation |

Additional risk **RISK-C10-A** (MAJOR): `catalogue_subjects` records `review_state = approved`,
`curriculum_approved`, `outcomes_reviewed` and `diagnostic_eligible = true` for both subjects while
no reviewer, timestamp or decision exists in compliance evidence. Remediation requires founder
sign-off on either recording real review evidence or resetting `review_state` to pending; not
executed in this read-only reconciliation.

## 6. Authoring volume — single authoritative figure

Deficit = Σ max(0, 40 − verified) per unit.

| Subject | Deficit | Draft items already authored |
| --- | --- | --- |
| Mathematics | 34+28+37+34+34+34+34 = **235** | 235 |
| Science | 0+1+28+28+34 = **91** | 91 |
| **Total** | **326** | **326** |

The deficit equals the existing draft corpus exactly. **No new authoring is required.** The
remaining work is expert review and promotion of the 326 existing draft items. The three competing
figures in the Cowork package (164/132, 84/92, 77/200) are all superseded.

## 7. Reviewer checklist — Mathematics (current)

| ID | Check | Current state |
| --- | --- | --- |
| MC-01 | Subject syllabus source confirmed and checksummed | **PASS** — SHA-256 `d773e7c1…`, re-verified live |
| MC-02 | Remaining 5 source types recorded | **FAIL** — GAP-MAT-001 |
| MC-03 | All official requirements mapped | **PASS** — 0 unmapped |
| MC-04 | Trigonometry includes Heights and Distances | **PASS** — MAT-U5 both chapters mapped |
| MC-05 | Unit item totals reconcile to book total | **PASS** — 7 × 40 = 280 |
| MC-06 | JSON ↔ CSV agree | **PASS** — 0 mismatches |
| MC-07 | 40 verified items per unit | **FAIL** — 0 of 7 units |
| MC-08 | Reassessment reserve ≥ 1 per unit | **FAIL** — 0 in all units |
| MC-09 | Class 10 reassessment assessment exists | **FAIL** — none built |
| MC-10 | Named reviewer / timestamp / decision | **FAIL** — GAP-MAT-004/005/006 |
| MC-11 | Entitlements scoped | **FAIL** — GAP-MAT-007 |
| MC-12 | Book approved | **PASS** — status `approved` |
| MC-13 | Duplicate prompts zero | **PASS** |
| MC-14 | Meridian pilot units excluded from scope | **PASS** — archived, absent from active inventory |
| MC-15 | Depth law (flat 40 vs marks-weighted) ruled | **OPEN** — reviewer decision |

## 8. Reviewer checklist — Science (current)

| ID | Check | Current state |
| --- | --- | --- |
| SC-01 | Subject syllabus source confirmed and checksummed | **PASS** — SHA-256 `1bec4a9e…`, re-verified live |
| SC-02 | Remaining 5 source types recorded | **FAIL** — GAP-SCI-008 |
| SC-03 | Book approved | **FAIL** — status `processed` (GAP-SCI-009) |
| SC-04 | All official requirements mapped, incl. Metals and Non-metals | **PASS** — 0 unmapped |
| SC-05 | Unit item totals reconcile to book total | **PASS** — 96+40+40+40+40 = 256 |
| SC-06 | JSON ↔ CSV agree | **PASS** — 0 mismatches |
| SC-07 | 40 verified items per unit | **FAIL** — 1 of 5 (Unit I only) |
| SC-08 | Question-type coverage per unit | **FAIL** — single type in Units I–II |
| SC-09 | Reassessment reserve ≥ 1 per unit | **FAIL** — 0 in 3 of 5 |
| SC-10 | Class 10 reassessment assessment exists | **FAIL** — none built |
| SC-11 | Named reviewer / timestamp / decision | **FAIL** — GAP-SCI-013/014/015 |
| SC-12 | Entitlements scoped | **FAIL** — GAP-SCI-016 |
| SC-13 | No "ready" label over a zero-coverage chapter | **PASS** — Unit I fully mapped; unit is SHORTFALL-free on depth but blocked on book approval |
| SC-14 | Duplicate prompts zero | **PASS** |
| SC-15 | Unit I depth requirement (40 vs 64) ruled | **OPEN** — reviewer decision |

## 9. Exact remaining SME review actions

1. Named SME review and promotion decision on **235 Mathematics draft items** (subject-wise Excel
   package already exported).
2. Named SME review and promotion decision on **91 Science draft items**.
3. Named SME approval of the **Science book** (`processed` → `approved`).
4. Record reviewer name, ISO timestamp and explicit decision for each subject.
5. Rule the depth law: flat 40 per unit or marks-weighted (affects Science Unit I only).
6. Retrieve and checksum the five missing official source types (curriculum, NCERT textbook,
   rationalisation notice, sample paper, marking scheme) for both subjects.
7. After promotion: build one Class 10 reassessment assessment per subject from reserve items and
   confirm zero overlap with the diagnostic set.
8. Founder decision on RISK-C10-A (`catalogue_subjects.review_state`).

## 10. Validation results

| Check | Result |
| --- | --- |
| Vitest | **293 / 293 passed**, exit 0 |
| Typecheck (`tsgo --noEmit`) | **PASS**, exit 0 |
| Production build | **PASS**, exit 0 |
| Worktree | clean, no untracked files |
| Counts reproduce from current evidence | **YES** |
| JSON ↔ CSV agreement | **EXACT** (12 rows, 0 mismatches) |
| Source hashes match manifest | **YES**, re-retrieved live |
| Gemini bundle integrity | `sha256sum -c` all OK |
| Diagnostic/reassessment pools disjoint | **YES** where both exist; Class 10 reassessment unexercised |
| Curriculum / pricing / entitlement / commercial change | **NONE** |
| Production modified or deployed | **NO** |

Security scan: **0 critical, 0 error, 3 warn** — `catalogue_streams_admin_only_select_gap`
(periodic-review advisory), `learner_assessments_no_org_scoping` (advisory: verify
`private.can_view_learner` / `can_manage_learner` scope by org), `widespread_reliance_on_private_helpers`
(advisory: dedicated review of SECURITY DEFINER helpers). All three are review recommendations, not
demonstrated exploits; none is remediated in this read-only reconciliation.

## 11. Limitations and unresolved risks

- Starting HEAD named in the assignment differs from the actual canonical HEAD (§0).
- No 2025-26 source set exists; the corrected package uses confirmed 2026-27 subject syllabi and
  labels every other source type absent rather than substituting an unsupported year.
- Near-duplicate item detection is not computed.
- Class 10 reassessment behaviour is unexercised end-to-end; disjointness is inferred from build
  discipline plus a zero-overlap legacy pair.
- The Gemini bundle's provenance prose is stale relative to confirmed source hashes.
- Three warn-level security advisories about SECURITY DEFINER helper scoping remain open.
- No reviewer identity, decision or signature exists; both subjects remain NOT_CERTIFIED.

## 12. Rollback

Rollback commit: `8b58bd61449c04236caed1f9a230eec72fbbbcaf`.
Procedure: `git revert <this commit>` — the change is documentation-only, adds no migration, alters
no runtime code, and was never deployed. Production remains at `b559058753b9d0acc6a25438fdc0cf79122ce4af`.
