# EduOS Curriculum Change Classification, Impact and Question Validity

**Machine core:** `diffCurriculum`, `analyseImpact`, `classifyQuestionRollover` in `src/lib/compliance-shared.ts`

## 1. Snapshot model

Every curriculum node (unit, chapter, topic, outcome, atom) is stored per session with: id, kind, parent, sequence, official title, internal title, source reference, source version, `assessable`, `enrichment`, `active`, academic session, supersession pointer, change classification and review state. Validation rejects orphans, units with parents, nodes that are both assessable and enrichment, and any node whose session differs from its snapshot (`ACADEMIC_YEAR_LEAK`).

## 2. Change classifications

`UNCHANGED` · `ADDED` · `REMOVED` · `RENAMED` · `MOVED` · `MERGED` · `SPLIT` · `SCOPE_EXPANDED` · `SCOPE_REDUCED` · `ASSESSMENT_CHANGED` · `SOURCE_CORRECTED` · `AMBIGUOUS` · `HUMAN_REVIEW_REQUIRED`

Detection rules:

- Identity is the **official source reference**, never title similarity alone. A node without a source reference falls back to a normalised-title key and is treated as weak identity.
- One detected difference → that classification. Two or more simultaneous differences → `AMBIGUOUS`.
- Disappearance with exactly one explicit successor → `MERGED`; with several → `SPLIT`; with none → `REMOVED`.
- `SOURCE_CORRECTED` covers an unchanged element whose governing document version changed (erratum, corrected edition).
- Everything except `UNCHANGED` and `SOURCE_CORRECTED` sets `humanReviewRequired`.
- The diff is deterministic and order-stable.

## 3. Impact surfaces

Each classification maps to impact statuses (`NO_ACTION`, `METADATA_UPDATE`, `REMAP_REQUIRED`, `OUTCOME_UPDATE_REQUIRED`, `QUESTION_REVIEW_REQUIRED`, `NEW_CONTENT_REQUIRED`, `RETIRE_CONTENT`, `REASSESSMENT_RESERVE_GAP`, `SUBJECT_EXPERT_REVIEW_REQUIRED`, `ACTIVATION_BLOCKED`) across these surfaces: outcomes, atoms, questions, answers, explanations, interventions, AI tutor scope, diagnostic blueprints, reassessment reserves, reports, evidence history, catalogue availability, entitlements, public selectors, pricing, source provenance.

| Change | Headline impact |
|---|---|
| `ADDED` | new outcomes, atoms and a full question set; reassessment reserve gap; activation blocked until authored and reviewed |
| `REMOVED` | retire content, review dependent questions and interventions, remove from blueprints; history preserved |
| `RENAMED` | metadata + reviewer confirmation only |
| `MOVED` | remap outcomes/atoms and blueprints |
| `MERGED` / `SPLIT` | remap plus question review; split also needs new content |
| `SCOPE_EXPANDED` | new items and re-review of existing ones |
| `SCOPE_REDUCED` | items become out of scope for the new session |
| `ASSESSMENT_CHANGED` | questions, answers and explanations re-reviewed |
| `AMBIGUOUS` | activation blocked pending named subject-expert resolution |

**Learner evidence is never mutated.** Reports are read within the session they were generated for; cross-year comparisons must state that the syllabus version changed.

## 4. Question validity across years

Provenance required on every item: session, curriculum version, topic, outcome, atom, source reference, review state, verification state. Missing session/outcome is an error; missing atom or source reference is a warning that blocks verification.

Rollover classes: `VALID_UNCHANGED` · `VALID_AFTER_REMAP` · `REVIEW_REQUIRED` · `OUT_OF_SCOPE` · `RETIRED` · `REPLACEMENT_REQUIRED`.

Rules: an unverified item is always `REVIEW_REQUIRED`; an item on an unchanged node stays valid only if it was verified; renames/moves/source corrections give `VALID_AFTER_REMAP`; merges, splits, scope expansion and assessment changes force review; scope reduction gives `OUT_OF_SCOPE`; removal retires the item (kept, never deleted); newly added scope requires new items. No item ever rolls forward automatically.

## 5. Reassessment reserve

For each unit, the reserve is `verified − diagnostic target`. It must remain ≥ the diagnostic target so a reassessment can be assembled from items the learner has not seen. Any change that reduces the reserve below that threshold raises `REASSESSMENT_RESERVE_GAP` and fails the QUESTION gate.
