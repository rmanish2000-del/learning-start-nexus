# EduOS Class 10 Import Readiness Report

**Date:** 2026-08-26
**Reviewer:** EduOS platform agent
**Inputs reviewed:**
1. `CLASS_10_MATH_SCHEMA_AND_CONTENT_PACK_JSON.json` (Mathematics pack — schema + content in one file)
2. `CLASS_12_SCIENCE_JSON.json` + `CLASS_12_SCIENCE_SCHEMA_JSON.json` (Science pack — declared `Class 10 / Science`)
3. `EDUOS_CLASS10_CLEANUP_EXECUTION_REPORT.md` (post-cleanup baseline)

**Status:** no data was imported and no data was modified during this review. Read-only inspection only.

---

## Decision

**NEEDS_CHANGES** — do not import yet.

The curriculum spine of both packs maps cleanly onto the platform, but four blocking gaps remain: two incompatible pack envelopes, a subtopic level with no home in the schema, two different dependency-graph formats, and diagnostic/mastery atoms that cannot satisfy the question bank's required fields. All are fixable in the transform layer without any schema migration except the subtopic decision.

---

## 1. Pack inventory (as parsed)

| Metric | Mathematics | Science |
|---|---|---|
| Envelope | JSON-Schema wrapper with content under `content` | content only (`metadata`, `units`, `dependency_graph`) |
| Board / framework | CBSE, NCERT Rationalised 2026-27 | CBSE, NCERT Class X Science |
| Units | 7 | 2 |
| Chapters | 14 | 7 |
| Topics | 27 | 27 |
| Subtopics | 30 | 43 |
| Learning outcomes | 30 | 43 |
| Diagnostic atoms | 30 | 43 |
| Intervention atoms | 30 | 43 |
| Mastery atoms | 30 | 43 |
| Competency tags (occurrences / distinct) | 59 / 35 | 86 / 76 |
| Dependency edges | 14 (chapter ids, `depends_on`) | 5 (chapter numbers, typed) |
| Prerequisite strings | 44 (outcome-level, free text) | 14 (chapter-level, free text) |

Current active baseline (from the cleanup report and verified live): 1 active book (Class 10 Science), 26 assessment outcomes, 44 questions, 0 orphans, Grade 3 content archived with rollback available.

---

## 2. Model-by-model review

### 2.1 Curriculum model — compatible with one caveat
Platform spine: `books → curriculum_units → curriculum_chapters → curriculum_topics → curriculum_outcomes`, persisted by `persistCurriculumTree`.
Pack spine: `units → chapters → topics → subtopics → learning_outcomes`.

The packs carry **one extra level (subtopic)** that has no table. Both packs are effectively 1 outcome per subtopic (30/30 and 43/43), so the subtopic is currently acting as an outcome label. Options: (a) fold subtopic title into the outcome text/code, (b) promote subtopics to `curriculum_topics` and demote current topics to chapters-groups, (c) add a subtopic table. Option (a) is lowest risk and preserves the existing audit centres.

Note: `curriculum_chapters` and `curriculum_topics` have no natural-key column, so pack ids (`CH_01`, `TOPIC_1.1`) cannot round-trip. Re-running an import would duplicate the tree rather than upsert.

### 2.2 Outcome model — partial
`curriculum_outcomes` accepts only `text`, `position`, `status`. It has **no column** for `outcome_id`, `prerequisites`, or `cbse_competency_tags`, so all three are dropped on import unless encoded into `text` or carried into `assessment_outcomes`.

`assessment_outcomes` is the richer target (`code`, `title`, `category`, `bloom_level`, `difficulty`, `diagnostic_weight`, `question_types`, `intervention_strategy`). The packs supply `code` (outcome_id) and `title` (description/statement) but **do not supply** `bloom_level`, `difficulty`, `diagnostic_weight`, or `question_types`. These are NOT NULL, so the importer must derive them (deterministic mapping from competency tags is feasible — the existing `blueprint.server.ts` generator already does this style of derivation).

Competency-tag vocabulary is uncontrolled: 35 distinct tags in Maths, 76 in Science, mostly singletons (`3D Visualization`, `Consumer Literacy`, `Salt Classification`). Any tag-driven Bloom/category mapping needs a controlled crosswalk plus a fallback bucket.

### 2.3 Dependency model — needs normalisation
Platform: `concept_nodes` (label, depth) + `concept_edges` (parent, child, relation), book-scoped.

The two packs disagree:
- Maths: `{ node: "CH_01", depends_on: [...] }` — adjacency list, no relation type, includes a root with empty `depends_on`.
- Science: `{ source_chapter_number, target_chapter_number, relationship_type }` — typed edges (`PREREQUISITE_FOR`, `EXTENDS`).

Both are **chapter-level**, while the platform graph is concept-label-level, and `depth` has no source in either pack (must be computed by topological rank). Science ships only 5 edges for 7 chapters, so the graph is sparse and disconnected. Outcome-level `prerequisites` are free-text strings referencing out-of-scope grades ("Class 6: Prime vs Composite Numbers") and cannot resolve to any node in scope — they are documentation, not graph edges.

### 2.4 Diagnostic model — blocking
`question_bank` requires `kind` (one of mcq, true_false, fill_blank, short_answer, case_study, assertion_reason, data_interpretation, applied_mcq), `difficulty` 1–5, `prompt`, `correct_answer`, `explanation`, and an `outcome_id` FK to `assessment_outcomes`.

- Maths diagnostic atoms provide `concept_checked` + `misconception_addressed` only — **no prompt, no answer, no explanation, no kind**. They are specifications, not questions.
- Science diagnostic atoms provide `content_prompt` + `target_concept` — prompt only, **still no answer, explanation, or kind**.

As-is, neither pack can populate `question_bank`. They can populate `assessment_outcomes` (diagnostic specs) and then feed the existing batch AI question generator, which produces prompts/answers/explanations and lands rows as `source='ai'`, `status='draft'`, `verification_state='unverified'` for reviewer sign-off. That is the recommended path, and it keeps the verification chain intact.

Also: gaps are keyed on `subject / topic / subtopic` text in `learning_gaps`. If subtopics are folded away (2.1 option a), the importer must still write a stable subtopic string, or gap traceability regresses relative to the current baseline.

### 2.5 Intervention model — partial
`intervention_map` needs `failure_pattern` + `recommended_intervention` + `priority` per assessment outcome; `assessment_outcomes.intervention_strategy` is NOT NULL.

- Maths supplies `remediation_strategy` → maps to `recommended_intervention` / `intervention_strategy`. `misconception_addressed` on the diagnostic atom maps well to `failure_pattern`. Maths is therefore fully mappable (30/30).
- Science supplies an intervention `content_prompt` → `recommended_intervention`, but **no misconception field at all** (0/43), so `failure_pattern` has no source and `priority` has no source in either pack. Both must be derived or defaulted.

### 2.6 Mastery model — compatible, thresholds must be supplied
Platform mastery is numeric: `mastery_levels` bands (Beginning 0–49, Developing 50–69, Proficient 70–84, Advanced 85–100), `learner_outcomes` (baseline_score, post_score, mastery_lift), gap threshold at <70%.

Pack mastery atoms are qualitative: `mastery_criteria` (Maths) or a harder `content_prompt` (Science). There is **no score, threshold, or weight** anywhere in either pack. Mastery atoms therefore import as reassessment-item specifications, not as mastery configuration; the existing bands stay authoritative. That is compatible, but it means "mastery" in the packs and "mastery" in EduOS are different objects and the import must not overwrite band config.

---

## 3. Validation matrix

| # | Check | Maths | Science | Verdict |
|---|---|---|---|---|
| 1 | Import compatibility | Content nested under `content`; grade is the string `"Class 10"` while DB `grade` is integer | Root-level content; filename says CLASS_12 while metadata says Class 10 | **NEEDS_CHANGES** — one normalising loader + grade coercion + filename/label reconciliation |
| 2 | Schema compatibility | Spine OK; subtopic level unmapped; no natural keys for idempotency | Same | **NEEDS_CHANGES** |
| 3 | Entity mapping | units/chapters/topics/outcomes map; ids, prerequisites, competency tags have no column | Same | **NEEDS_CHANGES** (lossy but non-destructive) |
| 4 | Dependency graph mapping | adjacency list, untyped | typed edges by chapter number, 5 edges only | **NEEDS_CHANGES** — two formats, depth uncomputed, sparse |
| 5 | Outcome coverage | 30 outcomes over 14 chapters — thin (≈2/chapter), 1 per subtopic | 43 outcomes but only 7 of 13 NCERT chapters and 2 units — **incomplete pack** | **NEEDS_CHANGES** |
| 6 | Diagnostic coverage | 30/30 outcomes have ≥1 diagnostic atom, but atoms are specs (no prompt/answer) | 43/43 have prompts, no answers/explanations/kinds | **NEEDS_CHANGES** — cannot populate question_bank directly |
| 7 | Intervention coverage | 30/30 strategies + 30/30 misconceptions | 43/43 strategies, 0/43 misconceptions; no priority in either | **NEEDS_CHANGES** |
| 8 | Mastery compatibility | 30/30 criteria, no numeric thresholds | 43/43 prompts, no thresholds | **COMPATIBLE** as reassessment specs; bands remain platform-owned |

---

## 4. Blocking items (must clear before import)

- **B1 — Envelope normalisation.** Two different top-level shapes and two different atom shapes (`diagnostic_atoms`/`intervention_atoms`/`mastery_atoms` vs `atoms.{diagnostic,intervention,mastery}`). Agree one canonical pack format, or write one adapter per pack, before any write path runs.
- **B2 — Subtopic decision.** Choose fold-into-outcome vs new level. This decides gap traceability strings and must be settled before rows exist, because it is not cheaply reversible.
- **B3 — Question bank fields.** Diagnostic and mastery atoms lack `correct_answer`, `explanation`, and `kind`. Either extend the packs, or route atoms through the existing AI generator + reviewer verification (recommended).
- **B4 — Science pack completeness.** Only 2 units / 7 chapters present against a 13-chapter NCERT Class 10 Science book. Importing now creates a partial curriculum that the coverage engine will read as full.

## 5. Non-blocking items (accept with a note)

- Competency tags are an uncontrolled vocabulary; needs a crosswalk with a fallback bucket.
- Outcome-level `prerequisites` reference out-of-scope grades; keep as text metadata, exclude from the concept graph.
- `intervention_map.priority` and `assessment_outcomes.diagnostic_weight` will be derived, not sourced.
- No natural keys means the first import is one-way; a re-import needs the archive/rollback path documented in the cleanup report.
- Filename `CLASS_12_SCIENCE_JSON.json` contradicts its own `Class 10` metadata; rename before it becomes the source of truth.

## 6. Recommended sequence once cleared

1. Freeze one canonical pack schema; regenerate both packs against it.
2. Complete the Science pack to all 13 chapters.
3. Implement a dry-run importer that reports planned row counts per table and writes nothing.
4. Import curriculum spine + `assessment_outcomes` + `intervention_map` for one chapter, verify on `/curriculum`, `/assessment-blueprint`, and the curriculum/blueprint audit centres.
5. Generate questions from diagnostic and mastery specs via the batch generator; route through the Verification Center.
6. Build the concept graph last, from normalised typed edges with computed depth.
7. Re-run the curriculum, blueprint, builder, diagnostic, and gap audit centres; expect all green before proceeding to the next chapter.

---

**Final decision: NEEDS_CHANGES. No import performed. No data modified.**
