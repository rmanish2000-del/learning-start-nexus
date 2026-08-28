# EduOS — Class 9 Validation Report (Wave 1 Continuation)

Timestamp: 2026-08-29 00:10 IST (2026-08-28 18:40 UTC)
Branch: `main` · Repository: `learning-start-nexus`
Command: `bun run scripts/class9/build-packs.ts && bun run scripts/class9/validate.ts`

## Result

`VALIDATION: PASS` — 0 errors, 0 warnings across all 400 questions.

| Subject | Units | Chapters | Topics | Outcomes | Atoms | Questions |
| --- | --- | --- | --- | --- | --- | --- |
| Mathematics (CBSE-2026-27-C9-MAT) | 6 | 12 | 38 | 38 | 76 | 240 |
| Science (CBSE-2026-27-C9-SCI) | 4 | 12 | 30 | 30 | 60 | 160 |
| **Total** | **10** | **24** | **68** | **68** | **136** | **400** |

## Checks executed and outcome

| Check | Mechanism | Result |
| --- | --- | --- |
| Schema compliance | `curriculumPackSchema` / `questionPackSchema` (Zod) | PASS |
| Hierarchy integrity (Unit → Chapter → Topic → Outcome → Atom, no subtopic) | `checkPackIntegrity` prefix law + tests | PASS |
| Subject mapping | `subjectCode` ∈ {MAT, SCI}, `catalogueCode` literal per pack | PASS |
| Academic-year mapping | literal `2026-27` on both packs | PASS |
| Stable deterministic identifiers | regex-bound ids, 400/400 unique | PASS |
| External-reference uniqueness | 400/400 unique `externalRef` | PASS |
| Exact duplicates | id/ref duplicate scan | PASS (0) |
| Near duplicates | sorted-token prompt signature | PASS (0 after 4 assertion-reason prompts in C9-SCI-U2 were rewritten) |
| Answer integrity | answer present in options for every optioned item | PASS |
| Option integrity | 2-6 options, case-insensitive distinct | PASS |
| Explanation completeness | ≥20 chars, no "option A is correct" filler | PASS |
| Outcome coverage | 68/68 outcomes carry ≥4 questions | PASS (100% per unit) |
| Atom coverage | 136/136 atoms carry ≥1 question | PASS |
| Difficulty balance | 5 levels in Mathematics, 4 in Science; every unit spans ≥4 levels | PASS |
| Question-type balance | 5 supported kinds used in both subjects | PASS |
| Provenance completeness | sourceId + sourceRef + retrievedOn on every question and chapter | PASS |
| Deterministic output | rebuild produces byte-identical JSON | PASS |
| Idempotency | repeat build → identical SHA-256 digests | PASS |
| Isolation from Class 10 | no runtime import of Class 9 content; no DB rows written | PASS |

## Content digests (idempotency evidence)

```
7d544e33bf8ff3e044924c5c82b5bf4c5dc5ebc02e4cc4c40ebbde94fd12e66c  content/class-9/mathematics.curriculum.json
ce2d00b809492de60125aef135b9558558b0ee7db4e6e19c901b047789ee45a6  content/class-9/mathematics.questions.json
450e187fd8be2822a7dac8e314de8955f75837490469e0764fda5793ef4246d3  content/class-9/science.curriculum.json
b67ad92fe6398c26b1f7a03161133c7f88f42733c66393ad165c1a180493b8c5  content/class-9/science.questions.json
```

A second `build-packs` run reproduced these digests exactly.

## Thresholds

No validation threshold was weakened. `checkPackIntegrity`, the Zod contracts and the
requirement law (`max(2 × diagnostic_target, 2 × outcomes × min_per_outcome, 2 × diagnostic_minimum)`)
are unchanged from the Wave 1 baseline; the continuation only added tests on top of them.

## Application verification

- Tests: 164 passed / 164 across 14 files (Wave 1 baseline: 153).
- Typecheck: PASS.
- Production build: PASS.
- No runtime application code, schema, policy or price was changed.

## Unresolved blockers

1. Human subject-expert review has not occurred: 0 human-reviewed, 0 verified, 0 approved.
2. Class 9 `catalogue_subjects` rows do not exist (deliberately deferred — see the catalogue
   section of `EDUOS_WAVE_1_CLASS_9_CONTENT_PREPARATION_REPORT.md`).
3. No isolated staging database is available, so no import was executed (dry run only).
