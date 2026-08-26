# EduOS Class 10 — Final Import Decision

**Date:** 2026-08-26
**Reviewer:** EduOS platform agent
**Predecessors:** `EDUOS_CLASS10_CLEANUP_PLAN.md`, `EDUOS_CLASS10_CLEANUP_EXECUTION_REPORT.md`, `EDUOS_CLASS10_IMPORT_READINESS_REPORT.md`

**Inputs reviewed (read-only):**
1. `EDUOS_UNIFIED_CONTENT_PACK_SCHEMA` (unified schema, JSON-Schema draft-07)
2. Class 10 Science Pack **Part A** (conformant sample: chapters 1 and 9)
3. Class 10 Science Pack **Part B** (chapters 8–13)
4. Prior packs still on file: legacy Science chapters 1–7, Class 10 Mathematics pack

**Status:** nothing imported, nothing modified. Inspection only.

---

## Decision

**NEEDS_CHANGES**

The unified schema is correct and closes every *structural* blocker from the readiness report. The **content** has not caught up to it: only 2 of 13 Science chapters are actually schema-conformant, Part B and the legacy 1–7 chapters still ship atoms with `type` instead of `kind` and no answer/explanation/question_type/difficulty, and the Mathematics pack is still on the old envelope entirely.

---

## 1. Unified schema review

| Prior blocker | Resolved? | Notes |
|---|---|---|
| B1a — envelope mismatch | **YES** | Single root `{ metadata, units, dependency_graph }`, all three required. No `content` wrapper, no schema-inside-pack. |
| B1b — atom structure mismatch | **YES** | One `NormalizedAtom` definition reused for `atoms.diagnostic` / `atoms.intervention` / `atoms.mastery`, all three arrays required per outcome. |
| B3 — question-bank requirements | **MOSTLY** | `NormalizedAtom.required` now includes `kind`, `content_prompt`, `target_concept`, `question_type`, `difficulty`, `correct_answer`, `explanation`. Enough to write `question_bank` rows directly. Gaps below. |
| Diagnostic requirements | **YES** | Diagnostic atoms are now full questions, not specifications. |
| Mastery requirements | **YES** as reassessment items | Still no numeric thresholds; EduOS `mastery_levels` bands stay authoritative (unchanged from prior review, and correct). |
| B2 — subtopic level | **NO** | Schema hard-requires `subtopic_id`/`subtopic_title`; EduOS still has no subtopic table. Decision needed (section 3). |
| B4 — Science completeness | **PARTIAL** | Spine now reaches chapter 13 across A+B, but conformant content does not (section 2). |

### Residual schema gaps (non-blocking, need a transform decision)

- `question_type` enum is `MCQ, SHORT_ANSWER, NUMERICAL, TRUE_FALSE, CONCEPTUAL_EXPLANATION`. EduOS `question_bank.kind` allows `mcq, true_false, fill_blank, short_answer, case_study, assertion_reason, data_interpretation, applied_mcq`. `CONCEPTUAL_EXPLANATION` and `NUMERICAL` have no direct target (map both to `short_answer`), and the CBSE-specific kinds EduOS already supports (`case_study`, `assertion_reason`, `data_interpretation`) **cannot be expressed by the pack at all** — a real loss of the Pilot Evidence work.
- `difficulty` is 3-valued text; EduOS is integer 1–5. Needs a fixed crosswalk (EASY→2, MEDIUM→3, HARD→4).
- Still no source for `assessment_outcomes.bloom_level`, `diagnostic_weight`, and no `failure_pattern` for `intervention_map` — all NOT NULL / required, so all must be derived from `cbse_competency_tags` + `target_concept`.
- `metadata.grade` is the string `"Class 10"`; DB `grade` is integer. Coerce in the loader.

## 2. Science Part A + Part B review

| Check | Finding | Verdict |
|---|---|---|
| Chapter coverage | Part A (new, conformant) = chapters **1, 9** only, 2 topics, 2 subtopics, 2 outcomes, 6 atoms. Part B = chapters **8–13**, 12 topics/subtopics/outcomes, 36 atoms. Legacy pack = chapters **1–7**, 43 outcomes, 129 atoms. Union covers 1–13, but conformant content covers **2/13**. | **NEEDS_CHANGES** |
| Chapter continuity | Numbering 1–13 is continuous only when legacy 1–7 is merged with Part B 8–13. Part A duplicates chapters 1 and 9, so a naive merge double-creates them. Unit ids also disagree: `UNIT_2` (legacy) vs `UNIT_2_CONT` (Part B) is the same unit under two keys. | **NEEDS_CHANGES** |
| Dependency integrity | 9 edges total (5 legacy + 4 Part B), typed, no cycles, no self-edges. Part B edge `7 → 8` and `5 → 13` cross pack boundaries, so the graph is only valid **after** merge — never import Part B's graph alone. Part A's sample edge `1 → 9 (APPLIES)` is sample noise and should be dropped. Coverage is sparse: 13 chapters, 9 edges, several isolated nodes. `depth` still has no source and must be computed topologically. | **NEEDS_CHANGES** (merge + drop sample edge) |
| Outcome integrity | Every subtopic has exactly 1 outcome (2/2, 12/12, 43/43). `outcome_id` unique, hierarchical and stable; `statement` present everywhere; `cbse_competency_tags` present everywhere but still an uncontrolled vocabulary. | **OK** |
| Intervention integrity | Every outcome has ≥1 intervention atom (100% across all three packs). But interventions are phrased as prompts/statements, and there is still **no `failure_pattern` and no `priority`** field anywhere. | **PARTIAL** |
| Mastery integrity | Every outcome has ≥1 mastery atom (100%). Conformant only in Part A's 2 chapters; the other 55 mastery atoms lack answers. | **PARTIAL** |

**Field-level conformance count**

| Pack | Atoms | Atoms missing `kind`/`question_type`/`difficulty`/`correct_answer`/`explanation` |
|---|---|---|
| Part A (new sample) | 6 | **0** |
| Part B (ch 8–13) | 36 | **36** (uses `type`, prompt + target_concept only) |
| Legacy Science ch 1–7 | 129 | **129** |
| Mathematics | 90 | all — flat `diagnostic_atoms`/`intervention_atoms`/`mastery_atoms`, no `atoms` object, spec-only content |

## 3. Subtopic model — recommendation

**Recommendation: B — flatten subtopics.** Do not add a table.

Rationale: the relationship is 1 subtopic : 1 outcome in **every** pack (2/2, 12/12, 43/43, 30/30), so a subtopic table would carry no information the outcome row cannot carry, while forcing changes to `curriculum_outcomes`, the coverage engine, the diagnostic allocator, the gap analyzer and six audit centres that are currently green.

Flatten as follows so nothing is lost:
- `curriculum_topics` ← pack `topic_title` (unchanged).
- `curriculum_outcomes.text` ← `subtopic_title` + " — " + `statement`, `position` from subtopic/outcome order.
- `assessment_outcomes.code` ← `outcome_id` (natural key, gives idempotent re-import — the thing the previous review said was missing).
- `assessment_outcomes.title` ← `statement`.
- `learning_gaps.subtopic` ← `subtopic_title` verbatim, preserving today's gap traceability strings.

Revisit option A only if a future pack ships >1 outcome per subtopic.

## 4. Question bank readiness

- Required five fields are now **mandatory in the schema** and **present in 6/6 Part A atoms**, and absent in **165/171** atoms of the remaining content.
- With a conformant pack, atoms satisfy: **diagnostics — yes** (prompt + answer + explanation + difficulty), **mastery checks — yes** as reassessment items, **question bank population — yes, directly**, no AI generation required for these rows. Recommended landing state for imported atoms: `source='import'`, `status='draft'`, `verification_state='unverified'`, then Verification Center sign-off — the human chain stays intact.
- Not satisfied: CBSE stimulus kinds (`case_study`, `assertion_reason`, `data_interpretation`) and `stimulus` text have no pack source, so imported banks will be plainer than what the builder already supports.

## 5. Curriculum readiness by engine

| Engine | Class 10 Science (A+B+legacy merged) | Class 10 Mathematics |
|---|---|---|
| Outcome engine | Spine complete 1–13; `code` natural key available; `bloom_level`/`diagnostic_weight` derived | Spine 7 units / 14 chapters; 30 outcomes ≈2/chapter — thin; old envelope |
| Diagnostic engine | Ready **only** for chapters 1 and 9; 165 atoms not question-grade | Not ready — atoms are specs, no prompts/answers |
| Intervention engine | 100% strategy coverage; `failure_pattern` + `priority` must be derived | 100% strategies **and** 30/30 misconceptions → best `failure_pattern` source of any pack |
| Mastery engine | Compatible; bands remain platform-owned; must not be overwritten | Compatible, same caveat |

## 6. Exact fixes required

1. **F1 — Regenerate Science chapters 1–7 and 8–13 against the unified schema.** Every one of the 165 non-conformant atoms needs `kind`, `question_type`, `difficulty`, `correct_answer`, `explanation`; rename `type` → `kind`.
2. **F2 — Ship one merged Science pack** covering chapters 1–13 in a single file, with a single dependency graph. Remove the Part A 2-chapter sample and its `1 → 9 (APPLIES)` edge from the import set.
3. **F3 — Reconcile unit ids.** `UNIT_2` and `UNIT_2_CONT` must be one unit id; assign stable `UNIT_1..UNIT_5` and keep one `unit_title` per id.
4. **F4 — Regenerate the Mathematics pack against the unified schema** (nested `atoms` object, per-atom answers/explanations, root-level envelope).
5. **F5 — Agree the derivation table** for `bloom_level`, `diagnostic_weight`, `intervention_map.failure_pattern`, `intervention_map.priority`, plus the `question_type → question_bank.kind` and `EASY/MEDIUM/HARD → 1–5` crosswalks, with a fallback bucket for unmapped competency tags.
6. **F6 — Optional but recommended:** extend the pack schema with `stimulus` and the CBSE stimulus kinds so imports do not regress the existing case-study / assertion-reason capability.
7. **F7 — Rename the legacy file** `CLASS_12_SCIENCE_JSON.json`; it contradicts its own `Class 10` metadata.

## 7. Import sequence (to run once F1–F5 clear)

1. Freeze the merged Science pack + regenerated Maths pack; validate both against the unified schema in CI — reject on any missing required field.
2. Implement the loader: grade coercion, `outcome_id` as natural key, subtopic flattening per section 3, derivation table from F5.
3. Dry run: report planned row counts per table, write nothing. Expect 13 chapters / 57 outcomes / 171 atoms for Science.
4. Import chapter 1 only: curriculum spine → `assessment_outcomes` → `intervention_map` → `question_bank` (draft/unverified). Verify on `/curriculum`, `/assessment-blueprint`, `/question-bank`.
5. Run the curriculum, blueprint, builder, diagnostic and gap audit centres — all green before proceeding.
6. Import remaining chapters; build `concept_nodes`/`concept_edges` last from the merged typed graph with topologically computed `depth`.
7. Verification Center sign-off on imported questions; re-run all audit centres; snapshot a rollback point before the Maths pack.

---

**Final decision: NEEDS_CHANGES. No import performed. No data modified.**
