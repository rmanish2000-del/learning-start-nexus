# EduOS — Class 10 (2026-27) Independent Review Bundle Manifest

**Purpose:** portable, self-contained set of committed artefacts for independent (Gemini) review of the EduOS annual CBSE/NCERT compliance framework and the Class 10 Mathematics/Science 2026-27 baseline audit.

**Repository:** `learning-start-nexus` · **Branch:** `main` · **Overall status:** `SOURCE_PENDING` (both subjects) · **Validator:** `compliance-validator/1.0.0`

No remediation is in scope. The bundle records state; it does not assert compliance.

## 1. Bundle contents (exact committed paths)

| # | Artefact | Path |
|---|---|---|
| 1 | Class 10 complete coverage audit | `EDUOS_CLASS_10_2026_27_COMPLETE_COVERAGE_AUDIT.md` |
| 2 | Mathematics crosswalk | `EDUOS_CLASS_10_MATHEMATICS_CROSSWALK.md` |
| 3 | Science crosswalk | `EDUOS_CLASS_10_SCIENCE_CROSSWALK.md` |
| 4 | Outcome and atom matrix | `EDUOS_CLASS_10_OUTCOME_ATOM_MATRIX.md` |
| 5 | Question-depth and reassessment matrix | `EDUOS_CLASS_10_QUESTION_DEPTH_AND_REASSESSMENT_MATRIX.md` |
| 6 | Gap register | `EDUOS_CLASS_10_GAP_REGISTER.md` |
| 7 | Machine-readable EduOS crosswalk | `content/compliance/class-10-2026-27.crosswalk.json` |
| 8 | Source registry (data) | `content/compliance/cbse-2026-27.sources.json` |
| 9 | Official curriculum reference spine | `content/compliance/cbse-2026-27.official-curriculum.json` |
| 10 | Compliance standard | `EDUOS_ANNUAL_CURRICULUM_COMPLIANCE_STANDARD.md` |
| 11 | Source-registry specification | `EDUOS_OFFICIAL_SOURCE_REGISTRY_SPEC.md` |
| 12 | Curriculum change-classification and impact specification | `EDUOS_CURRICULUM_CHANGE_CLASSIFICATION_AND_IMPACT.md` |
| 13 | Subject compliance gate definition | `EDUOS_SUBJECT_COMPLIANCE_GATE.md` |
| 14 | Annual rollover runbook | `EDUOS_ANNUAL_ROLLOVER_RUNBOOK.md` |
| 15 | Retention and archival policy | `EDUOS_CURRICULUM_ARCHIVE_AND_RETENTION_POLICY.md` |
| 16 | Snapshot export (read-only DB export) | `content/compliance/class-10-2026-27.snapshot.json` |
| 17 | Snapshot exporter (SQL + wrapper) | `scripts/compliance/export-snapshot.sql`, `scripts/compliance/export-snapshot.ts` |
| 18 | Compliance-validator output | `content/compliance/class-10-2026-27.validator-output.txt` |
| 19 | Validator / analysis / report / bundle generators | `scripts/compliance/validate.ts`, `scripts/compliance/analysis.ts`, `scripts/compliance/report.ts`, `scripts/compliance/bundle.ts` |
| 20 | Machine contracts, diff engine, gates | `src/lib/compliance-shared.ts` |
| 21 | Framework tests | `src/lib/__tests__/compliance-framework.test.ts` |
| 22 | Repository closeout record | `EDUOS_CLASS_10_COMPLIANCE_CLOSEOUT.md` |

## 2. Reproduction

```
bun run scripts/compliance/validate.ts   # gate evaluation, exits non-zero while non-compliant
bun run scripts/compliance/report.ts     # regenerates the coverage audit
bun run scripts/compliance/bundle.ts     # regenerates crosswalks, matrices, gap register, crosswalk.json
```

The snapshot export requires a read-only database URL and is not part of the reviewer's reproduction path; the committed snapshot is the frozen input.

## 3. Declared limitations carried into review

1. Official CBSE/NCERT documents could not be retrieved with checksums in this environment; all registry entries are `pending_confirmation` and every official unit/chapter/weightage entry is `PENDING_OFFICIAL_RETRIEVAL`. Both subjects are therefore `SOURCE_PENDING`.
2. Duplicate-question detection is not computed from the snapshot; it is recorded as 0 and must be re-run against the live question bank before a COMPLIANT verdict.
3. Learning-loop checks other than reassessment reserve are asserted from prior Phase 1 / Wave 0 verification evidence, not re-executed for this audit.
4. Two active Mathematics units (`Unit 1 — Number Systems`, `Unit 2 — Algebra`) carry no official mapping and must be retired or mapped.
5. Official chapter `SCI-U3-C2` (`The Human Eye and the Colourful World`) is unmapped; a platform spelling divergence (`Colorful`) is the suspected cause and is unresolved.
6. No named subject-expert reviewer, timestamp or decision is recorded for session 2026-27.
7. `entitlements_scoped` is recorded false; entitlement scoping to board/class/subject/session is unproven for this session.
8. Class 9 is on HOLD and Class 12 has not begun; neither is represented in this bundle.

## 4. Exclusions

The bundle contains no secrets, credentials, API keys, database URLs, personal learner data, learner evidence, parent identity data or payment data. All contents are aggregate curriculum and compliance metadata already committed to the repository.
