# EduOS — Class 10 (2026-27) Gemini Crosswalk Review Bundle

**Bundle format version:** 2.0.0  
**Bundle generation timestamp:** 2026-08-29T05:30:06.925Z  
**source_evidence_commit:** 88d9ef1d1f452f1a6953e1e4b9016b9327ef2100  
**bundle_generation_base_commit:** 93b70c33e698c44bae21be6764cc407f744b0d2f  
**package_commit:** REPORTED_AFTER_COMMIT (see final response / repository history)  
**Validator:** compliance-validator/1.0.0  
**CLASS_10_COMPLIANCE_STATUS:** SOURCE_PENDING

Evidence packaging only. Nothing in this bundle remediates content, changes database records, generates questions, approves books, alters mappings, retires content or deploys anything.

## Contents

| Directory | Content |
|---|---|
| `baseline/` | The committed Class 10 2026-27 Mathematics and Science candidate baselines, their JSON Schemas, their file-validation records, and the packaging report. Verbatim copies. |
| `evidence/` | Exact current EduOS coverage audit, subject crosswalks, outcome/atom matrix, question-depth and reassessment matrix, gap register, machine-readable EduOS crosswalk, frozen snapshot, validator output, official-source registry and curriculum spine. Verbatim copies. |
| `exports/` | Deterministic read-only exports derived from the files above: the baseline→EduOS machine-readable crosswalk, multi-level question-depth and reassessment evidence, the compliance-gate result, source-registry status and the limitations/reconciliation record. |

## Reproduction

```
bun run scripts/compliance/gemini-bundle.ts
```

The exporter is pure and deterministic apart from the recorded extraction timestamp and repository SHA. It reads only committed files and writes only into this directory.

## Provenance recorded in every export

Each `exports/*.json` carries a `provenance` block with extraction timestamp, repository full SHA, data source, generating script, evidence basis (repository-only; the snapshot is a previously frozen read-only database export) and limitations.

## Reconciliation

| Measure | Mathematics | Science |
|---|---|---|
| Official requirements in baseline | 38 | 46 |
| Crosswalk rows emitted | 38 | 46 |
| Requirements without a complete unit+chapter mapping | 2 | 11 |
| Declared exclusions in baseline | 0 | 6 |
| Declared ambiguities in baseline | 0 | 2 |

Every official requirement produces exactly one crosswalk row. Missing mappings are emitted with `null` values and an explicit verdict; they are never omitted.

## Question depth

`exports/question-depth-and-reassessment-evidence.json` reports depth at subject, unit, official-requirement, outcome and atom level. All Mathematics units (including Coordinate Geometry), all Science units (including Chemical Substances — Nature and Behaviour) and the two Meridian-pilot Mathematics units (`Unit 1 — Number Systems`, `Unit 2 — Algebra`, flagged `meridian_pilot_unit: true`) are present.

## Privacy

Academic and structural evidence only. The bundle contains no learner names or identifiers, no parent information, no email addresses or phone numbers, no payment records, no secrets, credentials or tokens, no private URLs and no organization-sensitive operational data. Identifiers present are curriculum object UUIDs (books, units) and outcome codes.

## Source status

Preserved unchanged: **CLASS_10_COMPLIANCE_STATUS: SOURCE_PENDING**. No source record is upgraded because the baseline files parse and validate technically.

## Limitations

- CLASS_10_COMPLIANCE_STATUS remains SOURCE_PENDING; no source record is upgraded by this packaging step.
- No official source document has been checksummed; every source record remains PENDING_CONFIRMATION.
- Atom identifiers are not present in the frozen snapshot; atom counts are reported and atom_ids is null.
- EduOS chapter and topic identifiers are not present in the frozen snapshot; titles are reported and ids are null.
- Approved-question counts are not separately recorded in the snapshot; total and verified question counts are reported. Missing evidence is reported as null, never as zero.
- Duplicate-question detection is not computable from the snapshot and is not asserted here.
- Official-requirement level depth is inherited from the mapped EduOS chapter's outcomes; CBSE does not publish per-requirement item counts.
- No human subject-expert review is recorded for session 2026-27.
- Five academic-overreach flags remain open in the gap register.
- Two Science ambiguities remain unresolved in the candidate baseline.

## Provenance and self-reference

`source_evidence_commit` is the commit containing the evidence read by the exporter. `bundle_generation_base_commit` is the commit checked out when the exporter ran. `package_commit` is deliberately **not** stored inside the bundle — a file inside a commit cannot contain that commit's own SHA — and is reported after commit (REPORTED_AFTER_COMMIT) in the final response and repository history. This bundle is therefore not self-authenticating.

## Integrity

`GEMINI_REVIEW_BUNDLE_MANIFEST.json` lists every file with byte size, SHA-256, content category, source provenance, privacy classification and bundle generation timestamp. `bundle_tree_hash` is a deterministic hash over all payload files. `GEMINI_REVIEW_BUNDLE_INTEGRITY.sha256` is a `sha256sum -c` compatible checklist covering the same files.
