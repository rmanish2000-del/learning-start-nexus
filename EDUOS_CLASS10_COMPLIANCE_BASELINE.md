# EduOS — CBSE Class 10 (2026-27) Compliance Baseline

**Mode:** repository investigation and verification (read-only baseline audit)
**Audit date:** 2026-09-02 (UTC)
**Canonical repository:** learning-start-nexus
**Canonical HEAD at audit start:** `b559058753b9d0acc6a25438fdc0cf79122ce4af`
**Expected / actual production SHA:** `b559058753b9d0acc6a25438fdc0cf79122ce4af` — match
**Worktree at audit start:** clean (`git status --porcelain` empty)
**Production:** https://www.eduos.global — `/api/public/health` → `{"status":"ok","environment":"production"}`
**External-user mode:** INTERNAL_ONLY (no commercial activation, no public-scope change in this assignment)

Machine-readable companions: `EDUOS_CLASS10_COMPLIANCE_MATRIX.json`, `EDUOS_CLASS10_COMPLIANCE_MATRIX.csv`.

---

## 1. Verdicts

| Subject | Code | Verdict | Failing gate checks | Blocking category |
|---|---|---|---|---|
| Mathematics | 041 | **FAIL** | 7 | SOURCE_GATE (source pending) |
| Science | 086 | **FAIL** | 9 | SOURCE_GATE (source pending) |

Derived overall compliance status: **`SOURCE_PENDING`** (`bun run scripts/compliance/validate.ts`, exit 1).

No subject may be declared compliant. FAIL rather than PARTIAL is issued because in both
subjects at least one **blocking** gate fails (required official source types absent, and no
named subject-expert review decision recorded). Nothing in this audit changes curriculum data.

---

## 2. Active scope confirmation

| Check | Result |
|---|---|
| Active books outside Class 10 | 0 |
| Catalogue classes marked active | Class 10 only (Class 9, 11, 12 present but inactive) |
| Active catalogue subjects | Mathematics, Science (Class 10, 2026-27) |
| Active price plans | `CBSE-2026-27-C10-DIAGNOSTIC` ₹199 · `CBSE-2026-27-C10-ANNUAL` ₹2,999 |
| Live public surface | `Class 10` only; ₹199 / ₹2,999 / ₹2,800 upgrade credit |
| Class 9 / 11 / 12 work started | No |

Archived (reversible, not in any active selector): `CBSE Class 10 Mathematics — Meridian Pilot`,
`NCERT Science — Class 10, Chapter 1` partial upload, `Knowledge Bank for Children` (Grade 3).

---

## 3. Structural inventory (live database, 2026-09-02)

| Book | Subject | Book status | Units | Chapters | Topics | Curriculum outcomes | Atoms | Questions |
|---|---|---|---|---|---|---|---|---|
| NCERT Class 10 Mathematics (CBSE) | Mathematics | `approved` | 7 | 14 | 14 | 15 | 15 | 280 |
| NCERT Class 10 Science (CBSE) | Science | `processed` | 5 | 13 | 39 | 55 | 55 | 256 |

Totals for the active Class 10 scope: **12 units, 27 chapters, 53 topics, 70 outcomes, 70 atoms, 536 questions**.

Question-bank composition:

| Subject | `import` / `approved` / `verified` | `ai` / `draft` / `unverified` |
|---|---|---|
| Mathematics | 45 | 235 |
| Science | 165 | 91 |

The 326 rebuilt items (Maths 235 + Science 91) remain `draft` + `unverified` and are therefore
not selectable by any learner-facing diagnostic. This is correct and intentional pending
subject-expert review.

---

## 4. Coverage, diagnostic and reassessment sufficiency

Depth law (`EDUOS_SUBJECT_COMPLIANCE_GATE.md`, QUESTION_GATE): verified items per unit ≥
`max(2 × diagnostic target, 2 × outcomes × min per outcome, 2 × diagnostic minimum)`.
With `diagnostic_target = 20`, `diagnostic_minimum = 5`, `min_questions_per_outcome = 1`, the
requirement is **40 verified items per unit** — 20 for the diagnostic set and a **separate,
non-reused reserve of 20** for fresh reassessment.

| Subject | Unit | Atoms | Total items | Verified | Diagnostic set | Reassessment reserve | Verdict |
|---|---|---|---|---|---|---|---|
| Mathematics | Number Systems | 2 | 40 | 6 | 6 | 0 | SHORTFALL |
| Mathematics | Algebra | 4 | 40 | 12 | 12 | 0 | SHORTFALL |
| Mathematics | Coordinate Geometry | 1 | 40 | 3 | 3 | 0 | SHORTFALL |
| Mathematics | Geometry | 2 | 40 | 6 | 6 | 0 | SHORTFALL |
| Mathematics | Trigonometry | 2 | 40 | 6 | 6 | 0 | SHORTFALL |
| Mathematics | Mensuration | 2 | 40 | 6 | 6 | 0 | SHORTFALL |
| Mathematics | Statistics & Probability | 2 | 40 | 6 | 6 | 0 | SHORTFALL |
| Science | Chemical Substances – Nature and Behaviour | 32 | 96 | 96 | 20 | 76 | PASS (depth) |
| Science | World of Living | 13 | 40 | 39 | 20 | 19 | SHORTFALL |
| Science | Natural Phenomena | 4 | 40 | 12 | 12 | 0 | SHORTFALL |
| Science | Effects of Current | 4 | 40 | 12 | 12 | 0 | SHORTFALL |
| Science | Natural Resources | 2 | 40 | 6 | 6 | 0 | SHORTFALL |

Verified totals: Mathematics **45 / 280 required**, Science **165 / 256 required**.

**Pool separation (non-reuse):** diagnostic and reassessment pools are held separately by
construction — the reserve is only what remains after the diagnostic set is drawn. Live check of
`assessment_question_map` × `assessments`: **0 questions reused across assessment kinds**
(96 mappings, 66 distinct items, all under `kind = 'diagnostic'`). No reassessment assessment
instances exist yet, so reassessment behaviour is **structurally correct but not yet exercised**;
`catalogue_subjects.reassessment_ready = false` for both subjects, consistent with that.

Eleven of twelve units cannot supply a fresh reassessment set today. Coordinate Geometry
(3 verified items) is below even the diagnostic minimum of 5 and is unsellable.

---

## 5. Integrity and contamination checks

| Check | Query result |
|---|---|
| Duplicate prompts (normalised hash) within active Class 10 | 0 |
| Orphan atoms (no parent curriculum outcome) | 0 |
| Atoms with no question | 0 |
| Questions with no outcome | 0 |
| Verified-but-not-approved questions | 0 |
| Grade-3 / non-Class-10 content in active scope | 0 |
| Officially assessable units/chapters unmapped | 0 (84 / 84 requirements mapped) |
| Cross-kind question reuse | 0 |

Structure matches the official shape: Mathematics 7 units / 14 chapters, Science 5 units /
13 chapters. No omissions, no extras, no obsolete active content detected.

Limitation carried forward from the evidence bundle: near-duplicate (semantic) detection is not
computed from the snapshot and is recorded as 0; exact-duplicate detection above is live and real.

---

## 6. Source register

| Source id | Subject | Type | Document | URL | Retrieved | sha256 | Status |
|---|---|---|---|---|---|---|---|
| `CBSE-2026-27-C10-MAT-SYLLABUS` | Mathematics | subject syllabus | CBSE Class X Mathematics (041) syllabus, 2026-27 | https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf | 2026-08-29T04:31:47Z | `d773e7c1…b412a5` | **final / applicable** |
| `CBSE-2026-27-C10-SCI-SYLLABUS` | Science | subject syllabus | CBSE Class X Science (086) syllabus, 2026-27 | https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf | 2026-08-29T04:31:49Z | `1bec4a9e…f7bc37` | **final / applicable** |
| `CBSE-2026-27-C10-CURRICULUM` | All | CBSE curriculum | CBSE Secondary School Curriculum, Class X, 2026-27 | — | — | — | draft / pending confirmation |
| `NCERT-2026-27-C10-MAT-TEXTBOOK` | Mathematics | NCERT textbook | NCERT Mathematics, Class X, current edition | — | — | — | draft / pending confirmation |
| `NCERT-2026-27-C10-SCI-TEXTBOOK` | Science | NCERT textbook | NCERT Science, Class X, current edition | — | — | — | draft / pending confirmation |
| rationalised-content notice | both | rationalisation | not recorded | — | — | — | **absent** |
| sample paper | both | sample paper | not recorded | — | — | — | **absent** |
| marking scheme | both | marking scheme | not recorded | — | — | — | **absent** |

Registry validation: **0 errors, 3 warnings** (`SOURCE_PENDING_CONFIRMATION` for the three draft
entries). Both retrieved syllabi passed live identity and unit probes (Mathematics 10/10,
Science 12/12) with byte lengths and checksums recorded in
`content/compliance/class-10-2026-27.source-verification.json`.

Every mapped unit traces to a checksummed subject-syllabus source with academic-year attribution
(`2026-27`). Traceability to **textbook chapter/edition level is incomplete** because the NCERT
editions are not pinned — recorded below as a blocking gap.

---

## 7. Gap register

Severity: BLOCKING prevents any compliant verdict; MAJOR prevents commercial sale of the affected unit.

| Gap id | Subject | Gate | Check | Severity | Evidence | Recommended remediation |
|---|---|---|---|---|---|---|
| GAP-MAT-001 | Mathematics | SOURCE | `required_types_present` | BLOCKING | registry: cbse_curriculum, ncert_textbook, rationalised_content_notice, sample_paper, marking_scheme all absent | Retrieve each document from cbseacademic.nic.in / ncert.nic.in, checksum, record as `final`/`applicable` |
| GAP-MAT-002 | Mathematics | QUESTION | `verified_depth` | MAJOR | 6/40, 12/40, 6/40, 3/40, 6/40, 6/40, 6/40 across the 7 units | Complete subject-expert review of the 235 draft items; promote to `approved`+`verified` |
| GAP-MAT-003 | Mathematics | LEARNING_LOOP | `reassessment_reserve_available` | MAJOR | reserve = 0 in all 7 units | Follows automatically once GAP-MAT-002 clears |
| GAP-MAT-004 | Mathematics | REVIEW | `named_reviewer` | BLOCKING | none recorded | Appoint and record a named CBSE Mathematics subject expert |
| GAP-MAT-005 | Mathematics | REVIEW | `review_timestamp` | BLOCKING | none recorded | Record on completion of review |
| GAP-MAT-006 | Mathematics | REVIEW | `review_decision` | BLOCKING | none recorded | Record explicit approve/reject decision |
| GAP-MAT-007 | Mathematics | COMMERCIAL | `entitlements_scoped` | MAJOR | `false` | Scope entitlements to board/class/subject/session before any external sale |
| GAP-SCI-008 | Science | SOURCE | `required_types_present` | BLOCKING | same five types absent | As GAP-MAT-001 |
| GAP-SCI-009 | Science | CURRICULUM | `source_books_approved` | BLOCKING | `NCERT Class 10 Science (CBSE)` is `processed`, not `approved` | Promote the book to `approved` after expert sign-off |
| GAP-SCI-010 | Science | QUESTION | `verified_depth` | MAJOR | World of Living 39/40, Natural Phenomena 12/40, Effects of Current 12/40, Natural Resources 6/40 | Review and promote the 91 draft Science items |
| GAP-SCI-011 | Science | QUESTION | `type_coverage` | MAJOR | Chemical Substances and World of Living carry a single verified question type | Diversify verified item formats to ≥2 per unit |
| GAP-SCI-012 | Science | LEARNING_LOOP | `reassessment_reserve_available` | MAJOR | reserve = 0 in 3 of 5 units | Follows from GAP-SCI-010 |
| GAP-SCI-013 | Science | REVIEW | `named_reviewer` | BLOCKING | none recorded | Appoint and record a named CBSE Science subject expert |
| GAP-SCI-014 | Science | REVIEW | `review_timestamp` | BLOCKING | none recorded | Record on completion |
| GAP-SCI-015 | Science | REVIEW | `review_decision` | BLOCKING | none recorded | Record explicit decision |
| GAP-SCI-016 | Science | COMMERCIAL | `entitlements_scoped` | MAJOR | `false` | As GAP-MAT-007 |

Total: **16 open gaps, 9 blocking**. Identical in count and identity to
`EDUOS_CLASS_10_GAP_REGISTER.md`, which regenerated byte-identical from the live snapshot during
this audit — the register is current, not stale.

### Additional risk raised by this audit (not a gate check)

**RISK-C10-A — unsupported readiness flags.** `catalogue_subjects` records
`review_state = 'approved'`, `curriculum_approved`, `outcomes_reviewed` and
`diagnostic_eligible = true` for both subjects while the compliance gate records **no named
reviewer, no review timestamp and no review decision**. These flags therefore assert a review
that the evidence does not support. `reassessment_ready = false` is correctly set.
Recommended remediation (deliberately **not** executed here, since this is a read-only baseline
and both subjects are `commercial_status = 'purchasable'`): either record the real reviewer
evidence or reset `review_state` to pending, in a separate authorised change with founder sign-off.

---

## 8. Validation results

| Check | Command | Result |
|---|---|---|
| Full test suite | `bunx vitest run` | **293 passed / 293, 26 files**, exit 0 |
| RLS & authorization tests | included in the suite above | pass |
| Typecheck | `bunx tsgo --noEmit` | exit 0, no errors |
| Production build | `bun run build` | exit 0; SW precache 241 entries / 2889 KiB |
| Security scan | full project scan | **no issues found** |
| Compliance validator | `bun run scripts/compliance/validate.ts` | `SOURCE_PENDING`, exit 1 (expected) |
| Evidence bundle regeneration | `bun run scripts/compliance/bundle.ts` | byte-identical output — evidence current |
| Database integrity / contamination | §5 queries | all clean |
| Production smoke | `curl` on `/`, `/auth`, `/robots.txt`, `/sitemap.xml`, `/api/public/health` | 200 / 307 / 200 / 200 / 200 |
| Commercial activation or public-scope change | — | none made |

---

## 9. Limitations and unresolved risks

1. Three required source types per subject (CBSE curriculum document, NCERT textbook edition,
   rationalisation notice) plus sample paper and marking scheme are not retrievable as
   checksummed artefacts in this environment; they remain the primary blocker.
2. Traceability is source-to-outcome at **syllabus unit** granularity. Textbook-chapter-level
   traceability is blocked until the NCERT editions are pinned.
3. Near-duplicate/semantic duplicate detection is not computed; only exact duplicates are proven 0.
4. Reassessment has never been exercised end-to-end because no unit yet holds a sufficient
   reserve; pool separation is proven structurally and by zero cross-kind reuse, not by a live run.
5. RISK-C10-A above: readiness flags in `catalogue_subjects` outrun the recorded review evidence.
6. No live external purchase has been made; commercial gate remains unproven in production.

---

## 10. Continuity

Stale claims corrected in this pass: `EDUOS_SUBJECT_COMPLIANCE_GATE.md` (carried the superseded
2026-08-28 result of 11/13 failing checks) and `PROJECT_STATUS.md` (evidence SHA, test total and
the Class 10 content table). `EDUOS_CLASS_10_GAP_REGISTER.md`, the crosswalks, the outcome/atom
matrix and the question-depth matrix were verified current by byte-identical regeneration.

Continuity owner: M365 Copilot.
