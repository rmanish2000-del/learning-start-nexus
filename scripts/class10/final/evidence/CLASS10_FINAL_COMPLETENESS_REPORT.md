# EduOS — Class 10 final completeness and production verification

**Result: CLASS10_FINAL_COMPLETENESS_PASS**
**Recommendation: CLASS10_MATHS_SCIENCE_COMPLETE**

Run id `b4d1f0e2-77a3-4c85-9e10-6c2f3a9d51bb` · production project owning eduos.global · 2026-09-20 (UTC)

---

## 1. Starting state confirmed

| Item | Value |
| --- | --- |
| Repository HEAD at start | `f5e00a8c8e906d6ed547f3e02b10c8c6f775e0d8` ("Completed C1 commercial release") |
| Worktree | clean |
| Functional canonical release in history | `687b5d4da1db83faa599814a8bbdaef9575f4aa5` |
| Previous publication | complete — `https://www.eduos.global/` and `/diagnostic` both HTTP 200 |
| Withheld items at start | 12 (3 retired C1, 8 unadjudicated, 1 weak explanation) |

## 2. Corpus reconciliation

| Count | Before | After |
| --- | --- | --- |
| Original 2026-27 corpus rows | 329 | 333 |
| Permanently retired C1 items | 3 | 3 (unchanged, never reactivated) |
| C1 replacement diagnostics (R01/R02/R03) | 3 | 3 |
| New capacity items (LO_5.1.1.1) | 0 | 4 |
| Active corpus | 326 | 330 |
| Commercially eligible | 317 | **330** |
| Withheld (active) | 12 → 9 active + 3 retired | **0 active** |

Commercial classification of the 330 released items: `FACT_OR_FORMULA_ONLY` 207, `ORIGINAL_EDUOS_CONTENT` 123. No item is classified on the basis of public availability, and `copyright_permission_claimed` is `false` on every row.

## 3. Resolution of all 12 previously withheld items

### 3a. Three retired C1 diagnostics — remain retired

`C10-2627-MATH-REQ001-DIAG-001` (`e912a665…`), `-DIAG-005` (`6cf4bd18…`), `-DIAG-009` (`59eab512…`) stay `status = retired` with four active permanent exclusions each (`diagnostic`, `paid`, `paid_diagnostic`, `production_export`). They are fully replaced by R01 `55ec1bdd-d0e4-49ca-a3bd-294a1682f351`, R02 `15d72c0c-a083-41e7-a558-0313ded04105`, R03 `48ffb6bb-7f39-4b39-a7d3-d517e1028223`, all three commercially eligible.

### 3b. Nine items resolved by explanation repair and full adjudication

Each explanation was rewritten so the worked reasoning substitutes the given values and states the final answer. Answers were independently recomputed from the underlying facts and formulas; every stored answer was confirmed correct, so no item required replacement. Prior content is preserved in `question_content_revisions` (append-only).

| external_ref | question id | before sha256 | after sha256 |
| --- | --- | --- | --- |
| C10-2627-MATH-REQ001-DIAG-012 | c56bbb9e-381c-4e0a-b401-074d1ca79b3f | e30a208b…eeb6 | (see `content_revisions.json`) |
| C10-2627-MATH-REQ001-REASS-013 | 01111ce0-6e9c-4fdc-89a7-fb39ce3ca67f | 282d9e0b…d9cf | cf682a82…5eb |
| C10-2627-MATH-REQ022-DIAG-012 | dca61afc-ec13-4f1e-8ca5-14cd18c1ab93 | 6718afa1…c4f8 | 1da14eda…5bff8 |
| C10-2627-MATH-REQ022-REASS-012 | 8948f1d0-15c1-4b1a-bcd1-4e27688d5031 | 09dc9a19…6a42 | 60feb4e0…08b2d |
| C10-2627-MATH-REQ029-REASS-003 | 147bd61d-8cf0-48f2-baca-cb651b7eeff9 | e74a346f…61e3 | c6a58a95…0de9 |
| C10-2627-MATH-REQ037-REASS-003 | a857b52a-9cab-407d-b9df-69b9a081b433 | 649172e3…0d8b | 05c44d0e…1183 |
| C10-2627-SCI-REQ041-DIAG-001 | 886fd995-8b66-480e-82a6-3768a535533a | 22b0a1b2…4ace | 20923a34…0a45 |
| C10-2627-SCI-REQ041-REASS-002 | 93e06cb4-014f-4fdd-bc99-71fd3b2d8f32 | 3f2dce28…3403 | 04600475…a34f |
| C10-2627-SCI-REQ042-DIAG-001 | 8a1650cd-f2f3-41e3-a1c0-3597e6378969 | fdda7a83…6249 | bf7d1ee0…9e58 |

Full before/after content and hashes: `content_revisions.json`.

Two marking specifications were authored for the two irrationality proof items; the other seven are closed-form and require none.

### 3c. Adversarial finding corrected during the run

The adversarial pass initially failed three multiple-choice items because the shared text normaliser strips digits and operators, collapsing `62`/`66` and `root(a^2 - b^2)`/`root(a^2 + b^2)` onto the same string. The items were correct; the checker was not. Option and answer matching now preserves digits and mathematical operators, and all three then passed.

## 4. Diagnostic and reassessment capacity

A capacity gap was found outside the original 12: outcome `LO_5.1.1.1` (`b076ee43-…`) carried one reassessment item and **no** diagnostic item, so it could not be diagnosed at all. Four independently authored Science items were added:

`C10-2627-SCI-REQ022-DIAG-001`, `-DIAG-002`, `-REASS-002`, `-REASS-003` — all four adjudicated, engine-evaluated and commercially released.

Every 2026-27 outcome now has **at least 2 diagnostic and at least 2 reassessment items**, and the minimum commercially eligible capacity per outcome is **5**. Diagnostic and reassessment pools remain separate.

## 5. Engine v1.0.0

| Metric | Value |
| --- | --- |
| Items evaluated (active corpus) | 330 |
| Auto-approved | 128 |
| Quarantined | 202 |
| Mathematics / Science | 235 / 95 |

Engine outcomes are advisory evidence. Commercial release is decided by the three-pass adjudication plus the originality, curriculum, marking-specification and commercial-use gates — not by the engine verdict alone. 25 auto-approved items are open-response, where the engine records correctness as `not_machine_checkable`; for those items correctness was established by independent derivation in pass A.

## 6. C1 and C2

- **C1** — three items permanently retired, 12 active permanent exclusions, three replacement diagnostics live and eligible, capacity restored. `REASSESSMENT-146ec7c8-POOL-BREACH` remains `closed`.
- **C2** — the frozen overlap list (4 shingles) is unchanged; contamination history and the two-routing-row / one-question-level record are preserved. 196 advisory routing records over 195 distinct questions, all provisional-pass, zero human SME decisions. No copyright-clearance claim anywhere.

## 7. Eligibility and truthfulness

- `paid_selection_eligible = true` and `production_export_eligible = true` on all 330 released items; on no other item.
- `human_sme_certified = false`, `official_cbse_ncert_certified = false`, `copyright_permission_claimed = false` on **every** row (0 exceptions).
- 218 exclusion rows total, 15 active: 12 permanent C1 exclusions plus 3 legacy non-Class-10 pilot items.
- Live public copy verified on `https://www.eduos.global/`: "Not affiliated with or endorsed by CBSE or NCERT" present; no "expert-certified", no human/official certification claim, no platform branding.
- No official CBSE/NCERT binaries, extracts, diagrams, answer keys or substantial wording are stored or redistributed — only links, metadata, hashes and independently authored mappings.

## 8. Tests

| Check | Result |
| --- | --- |
| Full regression suite | 448/448 passed (41 files) |
| Type check | clean |
| Production build | clean |
| Corpus reconciliation / eligibility / capacity validator | pass (0 withheld, 0 false-certification rows, min capacity 5) |
| Idempotency — repeat apply + release | 0 inserts, 0 changes |
| Rollback (9 items: explanations restored, releases revoked) | pass — state hash `bda55b1d…` |
| Deterministic reapply | pass — state hash returned to `1b807e2b7dbba3b454e9c246f8b673f1bec1aad3f6a56ad3cf3422429926339d` |
| Security scan | 3 warnings, all pre-existing and by design; 0 critical |
| Secrets scan | clean — service role read from the environment only, never stored |
| Production smoke (`/`, `/free-learning-check`, `/cbse-paper-practice`, `/diagnostic`, `/parent-guide-learning-gaps`) | all HTTP 200 |

## 9. Changed files and migrations

Migrations: **none required**.

Added (repository):
- `scripts/class10/final/items.py` — the nine independent derivations and repaired explanations
- `scripts/class10/final/capacity_items.py` — the four LO_5.1.1.1 capacity items
- `scripts/class10/final/finish.py` — snapshot / capacity / apply / release / validate / rollback / hash stages
- `scripts/class10/final/engine.ts` — Engine v1.0.0 rerun over the active corpus
- `scripts/class10/final/lib_rest.py`, `scripts/class10/final/evidence/*`

No application source file changed; no schema change.

## 10. Limitations and unresolved risks

1. Release rests on automated multi-stage verification. It is **not** a named-human SME certification, an official CBSE/NCERT certification, or a copyright clearance, and is not presented as any of these.
2. `licence_status` on every source-register row remains `NOT_ASSESSED`. Originality measurement is a signal, not a legal opinion.
3. Open-response correctness is established by independent derivation, not by the engine; the engine records it as not machine checkable.
4. The three legacy non-Class-10 pilot questions remain excluded from paid pools; they are outside this assignment's scope.
5. Class 9 and Classes 11-12 content remains out of scope and unbuilt.

**Nothing actionable remains pending for Class 10 Mathematics and Science.**
