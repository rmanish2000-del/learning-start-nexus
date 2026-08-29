# EduOS — Class 10 (2026-27) Evidence Verification and Priority Remediation

**Scope:** establish current truth for CBSE Class 10 Mathematics and Science 2026-27, then implement only the safe structural fixes. No bulk question generation was performed and none is authorised by this pass.

**Verdict:** `CLASS_10_EVIDENCE_VERIFICATION: PASS` · `CLASS_10_COMPLIANCE_STATUS: SOURCE_VERIFIED_CONTENT_SHORTFALL`

---

## Phase 1 — Official source verification: RESOLVED

Both governing documents were retrieved from the official CBSE domain, checksummed and probed. This closes the long-standing `SOURCE_PENDING` blocker on document identity.

| Source | URL | HTTP | Bytes | SHA-256 | Probes |
|---|---|---|---|---|---|
| `SRC_CBSE_MATH_2627` | `cbseacademic.nic.in/.../Maths_SecP1X_2026-27.pdf` | 200 | 270,782 | `d773e7c12b99e0bd498067e2b8268c76d0496bf9cad1c9e41c8652ab68b412a5` | 10/10 PASS |
| `SRC_CBSE_SCI_2026_27` | `cbseacademic.nic.in/.../Science_SecP1_2026-27.pdf` | 200 | 279,280 | `1bec4a9e44452b22c9d422d8cb528b4de30598f56c243461845165771df7bc37` | 12/12 PASS |

Identity confirmed from the documents themselves: *Mathematics, Subject Code 041 & 241, Class X (2026-27)* and *SCIENCE, Subject Code 086, Class X (2026-27)*. Official unit names and marks match both the committed baselines and the EduOS unit structure exactly (Mathematics 6/20/6/15/12/10/11 = 80; Science 25/25/12/13/5 = 80).

The PDFs are **not** committed. Identity is preserved through URL, byte length and checksum in `content/compliance/class-10-2026-27.source-verification.json`. Re-run `bun run scripts/compliance/verify-sources.ts` to re-attest.

Still outstanding for a full SOURCE_GATE pass: NCERT textbook editions, the rationalised-content notice, the sample paper and the marking scheme remain unretrieved.

## Phase 2 — Requirement-level verification: 84/84 resolved

Every one of the 84 committed requirements (38 Mathematics, 46 Science) now carries real EduOS unit, chapter, topic and outcome identifiers plus its own question counts, in `EDUOS_CLASS_10_VERIFIED_CROSSWALK.json`.

| Subject | Requirements | Mapped with evidence | Mapped chapter-level only | Unmapped |
|---|---|---|---|---|
| Mathematics | 38 | 8 | 30 | 0 |
| Science | 46 | 23 | 23 | 0 |

"Chapter-level only" means the requirement resolves to a chapter and its outcome set, but the baseline's paraphrased topic label does not resolve to a single EduOS topic. That is a labelling gap, not missing content, and each such row records its match tier and score.

Prior claim rows were compared field by field. All 84 differ; the deltas and their cause are recorded in `EDUOS_CLASS_10_GEMINI_CONFLICTS.json`. The prior export carried unit-level aggregates, null chapter and topic identifiers, and did not separate approved from verified questions.

## Phase 3 — Previously "unmapped" requirements: no genuine content gaps

The earlier register recorded one unmapped Science topic. It was an orthographic mismatch: the chapter existed as *The Human Eye and the Colorful World* (US spelling). No Mathematics or Science requirement is genuinely unmapped.

## Phase 4 — Meridian-pilot units: prior claim was factually wrong

The unmapped pilot units are **not** "Trigonometric Identities" and "Mensuration (frustum)". They are:

| Unit | Id | Book | Status | Questions |
|---|---|---|---|---|
| Unit 1 — Number Systems | `c023481c-8577-4eff-bc0d-69976fb4a3ce` | CBSE Class 10 Mathematics — Meridian Pilot (processed) | suggested | 9, none verified |
| Unit 2 — Algebra | `ebe99e72-8eb8-478a-8837-6159672331e1` | same | suggested | 6, none verified |

Both duplicate approved NCERT units. One pilot topic, *Euclid's division lemma*, does not appear anywhere in the retrieved 2026-27 syllabus. **Recommended disposition: retire, do not map.** Retirement is a content decision and was deliberately not executed here.

## Phase 5 — Science book status: PROCESSED_NOT_APPROVED confirmed

`NCERT Class 10 Science (CBSE)` has status `processed`. Its Mathematics counterpart is `approved`. All 209 Science questions therefore hang off a non-approved book. Approval is a human editorial act; the compliance gate must keep failing `source_books_approved` for Science until a named reviewer approves it.

## Phase 6 — Overreach and ambiguity: three baseline claims corrected

The most consequential correction in this pass:

- **Periodic Classification of Elements is NOT excluded.** The 2026-27 Science syllabus retains it in Unit I under the heading *"included in the syllabus but will be assessed only formatively"*, and the Note for Teachers states it will not be assessed in the year-end examination. Baseline exclusion `EXCL_SCI_2026_001` ("RATIONALISED_CHAPTER_OMISSION") and ambiguity `AMB_SCI_2026_001` ("OFFICIALLY_EXCLUDED") are both contradicted by the source. Correct classification: **retained, formative-only**.
- **Evolution** is likewise formative-only, while **Heredity** stays assessable. The baseline treated them as one block.
- **Motor, Electromagnetic Induction and Electric Generator** are formative-only in Unit IV.
- **Frustum** and **Euclid's division lemma** are confirmed out of syllabus: neither string occurs in the retrieved Mathematics document.

## Phase 7 — Question depth, recalculated on the correct axes

`question_bank` carries two independent axes that earlier reports conflated. Live totals: 213 approved+verified, 52 approved+unverified, 39 draft. **Only approved AND verified is diagnostic-eligible.**

Governing-book units, against the depth law `max(2 × 20, 2 × outcomes, 2 × 5)`:

| Subject | Unit | Outcomes | Eligible | Required | Deficit | Kinds |
|---|---|---|---|---|---|---|
| Mathematics | Number Systems | 2 | 6 | 40 | 34 | 2 |
| Mathematics | Algebra | 4 | 12 | 40 | 28 | 1 |
| Mathematics | Geometry | 2 | 6 | 40 | 34 | 1 |
| Mathematics | Coordinate Geometry | 1 | 3 | 40 | 37 | 1 |
| Mathematics | Trigonometry | 2 | 6 | 40 | 34 | 1 |
| Mathematics | Mensuration | 2 | 6 | 40 | 34 | 1 |
| Mathematics | Statistics & Probability | 2 | 6 | 40 | 34 | 1 |
| Science | Chemical Substances — Nature and Behaviour | 32 | 96 | 64 | 0 | 1 |
| Science | World of Living | 13 | 39 | 40 | 1 | 1 |
| Science | Natural Phenomena | 4 | 12 | 40 | 28 | 1 |
| Science | Effects of Current | 4 | 12 | 40 | 28 | 1 |
| Science | Natural Resources | 2 | 6 | 40 | 34 | 1 |

**Total governing deficit: 326 diagnostic-eligible items.** Twelve of thirteen governing units carry a single question kind against a minimum of two. The machine-readable specification, including per-outcome deficits and the generation constraints, is `EDUOS_CLASS_10_QUESTION_GENERATION_SPEC.json`.

Generation constraints recorded for whoever is later authorised to author: governing-book units only; no items for formative-only topics; no frustum or Euclid items; at least two kinds per unit.

## Phase 8 — Safe structural fixes applied

1. **Chapter title corrected** — `The Human Eye and the Colorful World` → `The Human Eye and the Colourful World`. Metadata only; no learner data touched. Resolves the sole previously-unmapped Science topic.
2. **Academic-year label on the learner outcome report** — the diagnostic report header badge and footer now carry `2026-27`, sourced from a new `ACTIVE_ACADEMIC_YEAR` constant in `src/lib/catalogue-shared.ts`. This closes the `outcome_report_year_labelled` learning-loop check, which was previously hard-coded false.
3. **Evidence export added** — `scripts/compliance/export-evidence.sql` plus `content/compliance/class-10-2026-27.evidence.json` give the verifier a SELECT-only, reproducible view of the live curriculum tree with question counts split by status and verification state.

Deliberately **not** done: no question generation, no book approval, no pilot-unit retirement, no baseline file rewrite. Each is a human editorial decision.

## Deliverables

| File | Contents |
|---|---|
| `EDUOS_CLASS_10_EVIDENCE_VERIFICATION.md` | Generated verification record: sources, mapping, depth, findings |
| `EDUOS_CLASS_10_VERIFIED_CROSSWALK.json` | All 84 requirements with real identifiers and match tiers |
| `EDUOS_CLASS_10_GEMINI_CONFLICTS.json` | Narrative and row-level conflicts against the prior claim set |
| `EDUOS_CLASS_10_VERIFIED_GAP_REGISTER.json` | Verified gaps with severity and remediation |
| `EDUOS_CLASS_10_QUESTION_GENERATION_SPEC.json` | Per-unit deficits and generation constraints |
| `content/compliance/class-10-2026-27.source-verification.json` | Retrieval record with checksums and probes |
| `content/compliance/class-10-2026-27.evidence.json` | Live curriculum and question evidence export |

Regenerate with:

```
bun run scripts/compliance/verify-sources.ts    # network
psql -At -f scripts/compliance/export-evidence.sql > content/compliance/class-10-2026-27.evidence.json
bun run scripts/compliance/evidence-verify.ts   # pure, deterministic
```
