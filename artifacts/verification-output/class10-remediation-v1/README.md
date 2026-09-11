# Class 10 Remediation Package V1_CORRECTED — Stage 1 output (verification artifact)

## Purpose
Canonical, retrievable storage of the exact Stage 1 remediation package and its independent
validation report, so that Stage 2 independent verification can fetch byte-identical artifacts.
This directory is an evidence store. It is not an import source and carries no approval.

## Source artifact identity
| Field | Value |
|---|---|
| File | `EDUOS_REMEDIATION_PACKAGE_V1_CORRECTED.zip` |
| Exact byte size | 276657 |
| SHA-256 | `cf6040fa83b9cbfdf437afe1b6031b5693d02fadf385d57df9fc72792e946e8c` |
| Generated from | `artifacts/verification-input/EDUOS_GEMINI_INPUT_PACKAGE.zip`, SHA-256 `4029077de1acbdd59dc07f04a8d4d71b72b7881cb3a9d9e76e0a669a20636fe5` (unchanged by this commit) |
| Engine run | `0ae8b0d0-4674-4f9e-8823-1d5aa2f2387f`, Engine v1.0.0 |
| Build | Deterministic; two consecutive builds produced an identical archive hash |

Verify before use:

```
sha256sum artifacts/verification-output/class10-remediation-v1/EDUOS_REMEDIATION_PACKAGE_V1_CORRECTED.zip
# expect cf6040fa83b9cbfdf437afe1b6031b5693d02fadf385d57df9fc72792e946e8c
```

## Package inventory (15 files inside the ZIP)
| File | SHA-256 |
|---|---|
| EDUOS_ALL_329_ITEM_EXPORT_VALIDATED.json | `71a4e404c5a0be4d92a5866a501f863e6ab459ccb30bb58a467fb75905e28b2b` |
| EDUOS_206_HELD_ITEMS_REMEDIATED.json | `395157909afb3d80e2abf5b4e092b97a21570e2866a7bd5a6117425f75b4b382` |
| EDUOS_210_LEGACY_VERIFICATION_REVIEW.json | `75c5c30f13a4846672963bdd210501bc5c9986a5fd96f95ae47709db0881e35b` |
| EDUOS_MATHS_SME_REVIEW_QUEUE.csv | `87fcb324af47952156bd13c6ef292a6ae783d8aa2971d82636d3e42aa9a007c3` |
| EDUOS_SCIENCE_SME_REVIEW_QUEUE.csv | `63b91c8ed9024661b9d6a33f769e77fae83e9c6c3c2b59560138714b26eb62db` |
| EDUOS_REPLACEMENT_ITEMS.json | `277c062174c6e207a1cb3aa9fb1488f6b44bf11f0a99c046b2c6822c37947512` |
| EDUOS_EXTERNAL_REF_CORRECTIONS.json | `44acabb61d3504669338df1070fc252c28381151e45c0e50340bd7359813be21` |
| EDUOS_APPROVED_FLAG_CORRECTIONS.json | `559d8a63ba366629d659e46e0f4bd4d678fa56c9c41bbfd85285579923ada1b4` |
| EDUOS_DUPLICATE_REPORT.json | `a5f314f63d0d26c91aed126979ac35a42e3cf53ab7d4a45e1f4b22a592bdeb94` |
| EDUOS_CONTAMINATION_REPORT.json | `4ae86c6815419719cec8b7e7a07d893fd80aff03e89bf16539b2ee6ad876d071` |
| EDUOS_POOL_SEPARATION_REPORT.json | `be176149188e19e1af6ca33fc06bae3c3008344fea007015ea853cddce7510ca` |
| EDUOS_COUNT_RECONCILIATION.json | `ed1ad10716a8ecc52c6e6e9cc96d35f54a23fc8901c6a30a394800cfbd866e4e` |
| EDUOS_IMPORT_MANIFEST.json | `e822369e3615e42b099ea7d03e001728a4ffbfdb3a924da322bd9e4c0875cc3c` |
| README.md | `64a4bd3b39d601ced596f427b9ebb73753e7d12cec907e3cc68b4807c2a35719` |
| SHA256SUMS.txt | `ad5728ef1ab18d6160d4f3ec3f5b961d47d43c6b852efe1659d3954c7759f375` |

## Stage 1 verification status — PASS
`verification_report.json` is the report produced by an independent verifier that shares no
classification logic with the generator: 66 checks run, 0 failed. It confirmed the archive CRC,
byte-identical extraction, all internal checksums, 329 unique records with content and flags
preserved verbatim, complete 150-row approved-flag and 3-row external_ref proposals, duplicates
re-derived by a different algorithm, contamination re-derived from the engine source, and a clean
secrets and PII scan. No check with `executed: false` carries a PASS anywhere in the package.

Recomputed dispositions: 123 confirmed auto-approved, 194 SME review required, 5 replacement
candidates, 4 content fixes, 3 metadata corrections. Gemini's prior 83/210/29/7 split was not adopted.

## Stage 2 status — BLOCKED pending independent verification
No Stage 2 verification has been performed. Nothing in this directory may advance until an
independent verification-only pass completes.

## Prohibitions
- **Direct import is prohibited.** Every proposal must re-enter production through the normal
  reviewed verification workflow: a named-SME decision or a fresh Engine v1.0.0 run.
- Nothing here is approved or certified. The package contains proposals and evidence only.
- No database was read or written, no content was changed, no verification flag was set,
  no SME decision was recorded, and nothing was deployed.

## Required next action
Lovable verification-only pass against these artifacts. Do not begin Stage 3 remediation, SME
review, import, or deployment on the basis of this directory.
