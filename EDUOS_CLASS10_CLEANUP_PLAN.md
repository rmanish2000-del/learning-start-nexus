# EduOS Curriculum Cleanup Plan — Class 10 Launch Baseline

Audit date: 2026-08-26 · Scope: read-only inventory. **Nothing has been deleted, archived or migrated.**
Goal: a clean state where **Class 10 Maths** and **Class 10 Science** are the only active commercial product.

---

## 1. What is actually in the database today

### 1.1 Books / curriculum packs (2)

| Book | Board / Grade / Subject | Status | Units | Chapters | Topics | Curr. outcomes | Assess. outcomes | Questions | Assessments | Graph (nodes/edges) | Maps (outcome/intervention) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Knowledge Bank for Children | ICSE · Grade 3 · General Knowledge | processed | 6 | 64 | 64 | 55 | 18 | 37 | 8 | 39 / 38 | 55 / 24 |
| NCERT Science — Class 10, Ch. 1: Chemical Reactions and Equations | CBSE · Grade 10 · Science | approved | 1 | 1 | 8 | 0 | 8 | 47 | 1 | 0 / 0 | 0 / 0 |

**There is no Class 10 Maths pack at all**, and Class 10 Science covers **one chapter only**. That is the single biggest launch gap — cleanup alone does not produce a sellable catalogue.

### 1.2 Grades present across the platform
- Grade 3 (GK pack — pilot/demo)
- Grade 6 (Fractions pilot: 56 legacy `assessment_items`, 7 assessments, all sessions/gaps/tutor/outcome data)
- Grades 4, 5, 7, 8 (learner records only — no curriculum behind them)
- Grade 10 (Science, 1 chapter)

### 1.3 Subjects present
General Knowledge (G3), Mathematics (G4–G8 demo learners + Fractions pilot), Science (G10).

### 1.4 Legacy / duplicate item systems
- `assessment_items` — **56 rows, 100% Grade 6 Mathematics / Fractions**, wired via `assessment_item_map` (56 rows). This is the pre-curriculum item bank (Sprint 2).
- `question_bank` — 84 rows, curriculum-linked (Sprint 6D+), wired via `assessment_question_map` (41 rows). This is the forward path.

### 1.5 Integrity findings (good news first)
- Orphaned questions (no parent assessment outcome): **0**
- Orphaned assessment outcomes (no curriculum unit): **0**
- Dependency graph exists **only** for the Grade 3 pack (39 nodes / 38 edges); Class 10 Science has **no concept graph** — a launch blocker for gap traceability.

### 1.6 Duplicates and junk
| Finding | Rows | Notes |
|---|---|---|
| `zz diagnostic engine probe temp` assessments (Grade 3 book) | 3 | Audit-probe residue, never intended as content |
| Learning gap with subtopic `Audit probe` | 1 | Probe residue |
| Duplicate assessments `Fractions Foundations Diagnostic` | 2 | Same title, no book link |
| Duplicate assessments `Fractions Mastery Reassessment` | 2 | Same title, no book link |
| Duplicate question prompts, Class 10 Science | 3 groups (2+3+2 rows) | Assertion-Reason / passage items generated twice by batch runs |
| Duplicate question prompt, Grade 3 pack | 1 group (3 rows) | Assertion-Reason repeat |

### 1.7 Question bank hygiene
| Source | Status / verification | Rows |
|---|---|---|
| ai | approved / unverified | 18 |
| ai | draft / unverified | 38 |
| manual | approved / unverified | 21 |
| manual | approved / verified | **3** |
| manual | draft / unverified | 4 |

Only **3 of 84 questions carry a reviewer verification**. Class 10 Science coverage is also badly skewed: two outcomes hold 18 and 11 questions while six outcomes hold 3 each.

### 1.8 Fractions-only pilot artifacts (the largest legacy cluster)
7 assessments · 8 sessions · 11 learning gaps · 10 interventions · 11 recommendations · 4 tutor sessions · 2 learner outcomes · 34 `learner_assessments` · 50 `learning_items` · 13 demo learners (Grades 4–8).

---

## 2. Classification

Legend: **KEEP** = part of the commercial baseline · **ARCHIVE** = retain, hide from product surfaces · **DELETE** = remove after sign-off · **MIGRATE** = move onto the Class 10 / curriculum-native model.

### KEEP
| Item | Reason |
|---|---|
| Book: NCERT Science — Class 10 Ch. 1 | Seed of the commercial Science product |
| Its 8 assessment outcomes | Blueprint spine for Class 10 Science |
| Its de-duplicated, verified questions (~44 of 47) | Commercial item bank after dedupe |
| `mastery_levels` (4 bands) | Org-level config, grade-agnostic |
| `organizations`, `profiles`, `user_roles`, staff/reviewer accounts | Platform, not content |
| `pilot_leads`, `guardian_consents` | Commercial + compliance records |
| `question_verifications` trail | Audit evidence, never destructive |

### ARCHIVE
| Item | Reason |
|---|---|
| Book: Knowledge Bank for Children (Grade 3 GK) + its full tree, graph, outcomes, maps, questions, assessments | **Do not delete.** Six audit centres pin this book by hardcoded ID (`curriculum-audit`, `question-bank-audit`, `gap-audit`, `diagnostic-audit`, `builder-audit`, `blueprint-audit`). Deleting it turns every probe red. Archive = flag `books.status = 'archived'` + hide from educator/parent/student surfaces, keep visible to audits. |
| Fractions pilot evidence chains (sessions → gaps → interventions → tutor → outcomes) | Sprint 3/4/5 audit centres and the outcome-proof dashboard read them as proof-of-loop; they are the only end-to-end verified closure evidence in existence |
| 13 demo learners (Grades 4–8) | Needed for the archived evidence to remain coherent; mark demo and exclude from commercial reporting |

### DELETE (after written sign-off — nothing removed yet)
| Item | Rows | Reason |
|---|---|---|
| `zz diagnostic engine probe temp` assessments | 3 | Probe residue, no learner data attached |
| Learning gap subtopic `Audit probe` | 1 | Probe residue |
| Duplicate Class 10 Science question prompts (keep 1 per group) | 4 | Batch-generation duplicates in the commercial pack |
| Duplicate Grade 3 Assertion-Reason prompt (keep 1) | 2 | Duplicate |
| Duplicate `Fractions Foundations Diagnostic` / `Mastery Reassessment` shells with **zero sessions** | 2 | Empty duplicates; the session-bearing copies stay under ARCHIVE |

### MIGRATE
| Item | Target | Reason |
|---|---|---|
| `assessment_items` (56) + `assessment_item_map` (56) | Retire the table from all read paths; keep data read-only until Class 10 packs are live, then archive | Two competing item systems is the top piece of technical debt; `question_bank` is the curriculum-native one |
| 7 Fractions assessments with `book_id = NULL` | Either stamp with an archived "Legacy Grade 6 Maths" book or exclude from builder/diagnostic listings | Bookless assessments bypass curriculum scoping and appear in Class 10 educator views |
| Class 10 Science questions with `status='draft'` / `verification_state='unverified'` | Reviewer verification queue | Commercial content must be reviewer-verified, not AI-approved |
| Class 10 Science pack | Add concept nodes/edges + `outcome_map` + `intervention_map` rows | Gap traceability and intervention mapping currently do not work for Class 10 |

---

## 3. Clean-state proposal — Class 10 Maths + Class 10 Science only

### 3.1 Target catalogue
| Product | Board | Units | Chapters | Outcomes | Verified questions | Diagnostics | Reassessments |
|---|---|---|---|---|---|---|---|
| Class 10 Mathematics | CBSE | 7 (Number systems → Statistics & Probability) | ~15 | ≥60 | ≥360 (6/outcome, difficulty 1–5 spread) | 1 per unit + 1 full-syllabus | 1 per unit, zero question overlap |
| Class 10 Science | CBSE | 3 (Chemistry, Physics, Biology) | ~13 | ≥55 | ≥330 | 1 per unit + 1 full-syllabus | 1 per unit, zero overlap |

### 3.2 Definition of a clean baseline (acceptance gates)
1. Exactly **two** books carry `status = 'approved'`; every other book is `archived`.
2. Every approved-book outcome has **≥4 verified** questions, with ≥3 distinct difficulty levels and ≥1 CBSE stimulus type (Case Study, Assertion-Reason, Data Interpretation, Applied MCQ).
3. Zero duplicate `(book_id, outcome_id, prompt)` triples.
4. Zero orphans: every question → outcome → unit → book, and every assessment carries a `book_id` and `unit_id`.
5. Every approved book has a concept graph and complete `outcome_map` + `intervention_map` coverage.
6. Educator/parent/student surfaces list **only** Grade 10 Maths and Science; archived content is reachable only from Verification.
7. All 15 audit probes stay green — verified **before** any archive flag flips.

### 3.3 Sequenced execution (once you approve)
1. **Freeze + snapshot** — full logical backup; record row counts per table as the rollback baseline.
2. **Add archive semantics** — `books.status = 'archived'` plus a `is_demo` flag on learners/assessments; filter product surfaces on it. No data loss, fully reversible.
3. **Delete the junk tier** (§DELETE, 12 rows) — probe residue and duplicates only.
4. **Decouple the audits** — replace hardcoded `PILOT_BOOK_ID` with a resolved "audit fixture book" so the Grade 3 pack can later be retired without breaking Verification.
5. **Build the Class 10 catalogue** — upload the Maths pack and the remaining Science chapters, run batch outcome + question generation, then reviewer verification.
6. **Retire `assessment_items`** from all read paths after Class 10 diagnostics are live.
7. **Re-run the clean-state gates** in §3.2 and publish the result to the Verification hub.

### 3.4 Risks
- Deleting the Grade 3 pack before step 4 breaks six audit centres — the main reason it is ARCHIVE, not DELETE.
- Removing Fractions evidence destroys the only proven closure loop; keep it archived until Class 10 produces its own verified chain.
- Class 10 Science content is currently 1 of ~13 chapters, and only 3 questions platform-wide are reviewer-verified: content production, not cleanup, is the critical path to launch.

---

**Nothing in this plan has been executed. Approve a tier (junk-delete, archive, migrate) and I will run it in that order with counts before and after.**
