# EduOS — Class 9 Duplicate and Integrity Report (Wave 1 Continuation)

Timestamp: 2026-08-29 00:10 IST (2026-08-28 18:40 UTC)
Scope: all 400 prepared Class 9 questions (Mathematics 240, Science 160).
Source of truth: `content/class-9/*.questions.json`, regenerated deterministically.

## 1. Identifier and reference integrity

| Check | Mathematics | Science |
| --- | --- | --- |
| Questions | 240 | 160 |
| Distinct question ids | 240 | 160 |
| Distinct external references | 240 | 160 |
| Orphan questions (unknown outcome) | 0 | 0 |
| Orphan atoms (unknown atom) | 0 | 0 |
| Premature approval (status ≠ draft or verification ≠ unverified) | 0 | 0 |

Identifiers are derived from position (`C9-<SUBJ>-U<n>-CH<n>-T<n>-O<n>-Q<n>`), so they are stable
across rebuilds; the idempotency digests in the validation report prove this.

## 2. Exact duplicates

Zero exact duplicate ids, external references or prompts.

## 3. Near duplicates

Detector: prompt normalised to lowercase alphanumeric tokens, sorted; a collision is an error.

| Stage | Findings | Resolution |
| --- | --- | --- |
| First full build of the 400-question set | 4 collisions, all in `C9-SCI-U2` (`…CH1-T1-O1-Q6`, `…CH1-T2-O1-Q7`, `…CH1-T3-O1-Q4`, `…CH2-T2-O1-Q8`) — identical generic assertion-reason stems | Each stem rewritten to name its own concept (cell theory, organelles, membrane transport, animal tissues). Stimulus assertions and reasons were already distinct. |
| Final build | 0 | — |

All near-duplicate findings are explicitly resolved; none are outstanding.

## 4. Option and answer integrity

- Every `mcq`, `applied_mcq`, `true_false` and optioned `assertion_reason` item carries 2-6 options.
- Options are distinct case-insensitively (0 `DUPLICATE_OPTION` findings).
- `correctAnswer` matches an option verbatim for every optioned item (0 `ANSWER_NOT_IN_OPTIONS`).
- `short_answer` items carry no options and a single defensible answer string.
- 0 `WEAK_EXPLANATION` warnings; every explanation is ≥20 characters and states the reasoning,
  formula or theorem rather than pointing at an option letter.

## 5. Coverage integrity (anti-padding evidence)

No unit reaches 40 questions by repeatedly testing one outcome.

| Unit | Outcomes | Atoms | Questions | Questions per outcome (min-max) | Outcome coverage | Atom coverage |
| --- | --- | --- | --- | --- | --- | --- |
| C9-MAT-U1 Number Systems | 6 | 12 | 40 | 6-7 | 100% | 100% |
| C9-MAT-U2 Algebra | 6 | 12 | 40 | 6-8 | 100% | 100% |
| C9-MAT-U3 Coordinate Geometry | 6 | 12 | 40 | 6-8 | 100% | 100% |
| C9-MAT-U4 Geometry | 8 | 16 | 40 | 5-5 | 100% | 100% |
| C9-MAT-U5 Mensuration | 6 | 12 | 40 | 6-7 | 100% | 100% |
| C9-MAT-U6 Statistics | 6 | 12 | 40 | 6-7 | 100% | 100% |
| C9-SCI-U1 Matter | 8 | 16 | 40 | 5-5 | 100% | 100% |
| C9-SCI-U2 Organization in the Living World | 6 | 12 | 40 | 4-8 | 100% | 100% |
| C9-SCI-U3 Motion, Force and Work | 10 | 20 | 40 | 4-4 | 100% | 100% |
| C9-SCI-U4 Food; Food Production | 6 | 12 | 40 | 6-7 | 100% | 100% |

## 6. Difficulty and question-type distribution

Mathematics (240): difficulty 1:23 · 2:85 · 3:84 · 4:40 · 5:8 —
types mcq 84 · short_answer 64 · applied_mcq 41 · true_false 40 · assertion_reason 11.

Science (160): difficulty 1:18 · 2:55 · 3:66 · 4:21 —
types mcq 48 · short_answer 47 · applied_mcq 37 · true_false 19 · assertion_reason 9.

Known imbalance: Science currently has no difficulty-5 items and both subjects are weighted
towards levels 2-3. This is recorded as a reviewer decision point, not silently accepted.

## 7. Originality and licensing

- All 400 items are original EduOS text written against the mapped outcome and atom.
- No textbook exercise text, figure or passage is copied or stored in this repository.
- Curriculum structure and chapter titles are cited as factual metadata with an official reference.

## 8. Outstanding integrity blockers

None at the machine level. The only blocker to progression is the absence of named human
subject-expert review (0 human-reviewed, 0 verified, 0 approved).
