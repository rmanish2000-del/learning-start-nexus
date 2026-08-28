# EduOS — Class 10 Mathematics and Science 2026-27 Baseline File Package Report

**Repository:** `learning-start-nexus` · **Branch:** `main` · **Date:** 2026-08-28 · **Package directory:** `audit-data/class10/2026-27/`

Technical packaging and validation only. Nothing in this package is imported into EduOS, and no curriculum, question, learner-evidence, pricing or entitlement record was read for write or modified. Class 10 compliance status remains **SOURCE_PENDING**.

## 1. Founder inputs

| Subject | Input filename | Bytes | SHA-256 |
|---|---|---|---|
| Mathematics | `cbse-class10-mathematics-2026-27-baseline.json` | 24,463 | `809ebb34bd3b250832eb170d9e26800623783c1e1bd1f49db5fbdae658a3f170` |
| Science | `cbse-class10-science-2026-27-baseline.json` | 49,102 | `17ead43466534637ea836a5af9c1fbe9a089814c8dc1f2938d5ed463f623b666` |

Both inputs were received complete, decoded as strict UTF-8, parsed as strict JSON and passed duplicate-key detection at input. Founder attachments were read only; they were not modified or deleted.

**Duplicate copies:** no duplicate-extension copies (`*.json.json`) and no Science baseline stored under a `.schema.json` filename were present in the upload mount. Other unrelated uploads exist in the mount (Class 12 packs, earlier Gemini exports); none were used as input.

## 2. Final package files

| # | Path | Bytes | SHA-256 |
|---|---|---|---|
| 1 | `audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.json` | 28,632 | `9806af26ae48631729b23ade6921e4bc03df2e6bd5b03c611705ca9bc826fdce` |
| 2 | `audit-data/class10/2026-27/cbse-class10-mathematics-2026-27-baseline.schema.json` | 8,575 | `1d8e327cbc01e441c8c02be1bc996bb3e3fdefb0d686de9042789fb69c2a1ed0` |
| 3 | `audit-data/class10/2026-27/mathematics-baseline-file-validation.json` | 3,673 | `f75c025b417f5353363512258fff7295d32c17ede0c798e25b1a3892489819be` |
| 4 | `audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.json` | 50,671 | `dfcb8b9fc2e0ae016b57baa10728cc1f2ba0e8ab3d2d47461c701d2bacc74ef2` |
| 5 | `audit-data/class10/2026-27/cbse-class10-science-2026-27-baseline.schema.json` | 12,207 | `b86993c69c7ef50fdb88532460f5d1395d8928eeb09f1b603be75cd4eb8c9fc1` |
| 6 | `audit-data/class10/2026-27/science-baseline-file-validation.json` | 7,449 | `373d5d7ece57e643aef188c54989e3401a91a3786e63a3305ef6352b00eac52b` |

Hashes were computed from the saved bytes after the final write and reverified by the package test suite, which recomputes each hash and compares it to the value recorded in the validation files.

Generator (non-runtime tooling): `scripts/audit/build-baseline-package.mjs`. Tests: `src/lib/__tests__/class10-baseline-package.test.ts`.

## 3. Parser, duplicate-key and schema results

| Check | Mathematics | Science |
|---|---|---|
| Strict JSON parse (baseline / schema / validation) | PASS | PASS |
| UTF-8 strict decode | PASS | PASS |
| Duplicate-key detection run | yes — source-order JSON tokenizer `findDuplicateKeys` in `scripts/audit/build-baseline-package.mjs` (asserted against a known-duplicate fixture in tests) | same |
| Duplicate keys found | none | none |
| Draft-07 schema validation (ajv) | PASS | PASS |
| Deterministic serialisation (2-space, trailing newline) | PASS | PASS |
| Baseline/schema separation | PASS — schemas contain contracts only | PASS |

## 4. Contamination scan (against saved bytes)

Tokens scanned across all six files: `<a`, `</a>`, `href=`, `target=`, `rel=`, `class=`, `&quot;`, ```` ```json ````, ```` ```text ````, `\[`, `\]`, `\_`, `Fai-ChatInputEntity`, `ChatInputEntity`, `noopener`, `noreferrer`.

HTML contamination: **0**. Markdown contamination: **0**. Every `official_url` is a plain JSON string on an official domain.

## 5. Record counts

| Metric | Mathematics | Science |
|---|---|---|
| Units | 7 | 5 |
| Unique chapters | 14 | 13 |
| Requirements | 38 | 46 |
| ID range | `REQ_MATH_2026_001`–`REQ_MATH_2026_038` | `REQ_SCI_2026_001`–`REQ_SCI_2026_046` |
| Duplicate IDs | 0 | 0 |
| Missing IDs | 0 | 0 |
| Duplicate sequences | 0 | 0 |
| Unresolved source references | 0 | 0 |
| Exclusions | 0 | 6 |
| Ambiguities | 0 (none in candidate) | 2 (both left unresolved) |

Mathematics subject codes are represented deterministically as `"subject_codes": ["041", "241"]`. The package explicitly does **not** claim identical assessment treatment for Mathematics Standard (041) and Mathematics Basic (241); a note field in the baseline records that caveat.

## 6. Source records still pending

All source records in both baselines are `applicability_status: PENDING_CONFIRMATION`, `finality_status: PENDING_CONFIRMATION`, `checksum_status: CHECKSUM_NOT_COMPUTED`, `sha256: null`, `publication_date: null`, `document_version: null`, `retrieval_timestamp: null`.

- Mathematics: `SRC_CBSE_MATH_2627`
- Science: `SRC_CBSE_SCI_2026_27`, `SRC_NCERT_SCI_TEXT_X`, `SRC_NCERT_RAT_GUIDE_X`, `SRC_NCERT_ADV_TRANS_2026`

Confirmation levels are distinguished as follows and only level 1 is satisfied:

1. official-domain URL identity — **satisfied** (URLs are on `cbseacademic.nic.in` / `ncert.nic.in`);
2. successful document retrieval — **not performed**;
3. byte-level checksum confirmation — **not performed**;
4. session applicability — **unconfirmed**;
5. academic interpretation — **unconfirmed**;
6. named subject-expert approval — **not obtained**.

## 7. Academic-overreach and human-review flags

Recorded in the validation files under `academic_overreach_flags`; no flagged statement was deleted or reworded.

| Subject | Record | Reason | Recommended action |
|---|---|---|---|
| Mathematics | `REQ_MATH_2026_004` | `auditor_derived` expansion beyond the cited syllabus line | Subject expert to confirm against retrieved syllabus |
| Science | `EXCL_SCI_2026_001` | Claims a chapter is fully removed | Confirm chapter-level removal against retrieved sources |
| Science | `EXCL_SCI_2026_003` | Edition-specific retitling claim | Confirm against retrieved NCERT edition |
| Science | `EXCL_SCI_2026_004` | Claims explicit deletion of named topics | Human review before retiring any EduOS question |
| Science | `AMB_SCI_2026_002` | Declares strict non-assessability and no review need | Treat as unresolved; both ambiguities remain open |

## 8. Mechanical transformation log

Mathematics (8 transformations): `$schema` corrected to the local schema filename; `subject_code "041/241"` replaced by `subject_codes ["041","241"]` with an explicit non-equivalence note; derived `total_units`/`total_chapters` added; deterministic 1-based `sequence` added per requirement in candidate order; `status: ACTIVE_BASELINE_REQUIREMENT` added for contract parity; the referenced-but-undefined `SRC_CBSE_MATH_2627` source record materialised with all unverified metadata null/pending; empty `exclusions`/`ambiguities` arrays added; deterministic serialisation.

Science (17 transformations): four source records downgraded from `CURRENT_OFFICIAL`/`FINAL` to `PENDING_CONFIRMATION` with `retrieval_timestamp` nulled; six exclusions had destructive action wording replaced by the safe code `NOT_ELIGIBLE_FOR_CURRENT_DIAGNOSTICS_PENDING_CONFIRMED_MAPPING` plus `recommended_actions`, with the original text preserved verbatim in `candidate_effect_statement`; deterministic serialisation.

## 9. Semantic transformation log

**Empty for both subjects.** No requirement was added, removed, merged or split; no assessability, exclusion classification or academic scope was changed; no ambiguity was resolved; nothing was marked expert-approved.

## 10. Known limitations

- Both baselines are independent Gemini-generated candidates and are audit aids only; they do not evidence EduOS compliance.
- No official CBSE or NCERT document was retrieved or checksummed in this environment.
- Chapter and unit naming in the candidates has not been reconciled with EduOS platform units; that is the next gate.
- The Science candidate's own embedded `validation` block is retained verbatim as candidate provenance and is not an EduOS validation result.
- Academic-overreach flags are unreviewed; the two Science ambiguities remain unresolved.

## 11. Non-impact confirmation

The package is stored as non-runtime audit data. It is **not** imported into EduOS. Zero database writes, zero migrations, no schema change, no question generation or status change, no book approval, no retirement, no pricing or entitlement change, no deployment. Existing Class 10 Mathematics and Science content, all questions, all learner evidence, Class 9 (HOLD) and Class 12 (not started) are unchanged.
