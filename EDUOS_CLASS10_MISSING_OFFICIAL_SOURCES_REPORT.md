# EduOS — Class 10 (CBSE, 2026-27) Missing Official Sources Report

**Mode:** compliance evidence completion. Local repository only. No production change, no deployment, no content promotion.
**Scope:** CBSE Class 10 Mathematics and Science, session 2026-27.
**Reproduce:**

```
bun run scripts/compliance/verify-sources.ts          # subject syllabi (unchanged)
bun run scripts/compliance/retrieve-missing-sources.ts # the five missing categories
bun run scripts/compliance/update-source-register.ts   # rewrite registry + manifest
bun run scripts/compliance/validate.ts                 # gate status
```

**Evidence files**

| File | Content |
|---|---|
| `content/compliance/class-10-2026-27.source-verification.json` | Subject syllabi retrieval + 22 content probes |
| `content/compliance/class-10-2026-27.missing-sources.json` | 37 retrieval attempts across the five missing categories |
| `content/compliance/class-10-2026-27.sha256-manifest.json` | Flat SHA-256 manifest, 38 entries |
| `content/compliance/cbse-2026-27.sources.json` | Regenerated official source registry, 14 records |

**Official-domain allowlist (enforced in code):** `cbseacademic.nic.in`, `ncert.nic.in`, `cbse.gov.in`. A URL on any other host is rejected as `REJECTED_UNOFFICIAL_DOMAIN` before a request is made. No unofficial material was retrieved or recorded.

**No official document is committed.** Identity is preserved by official URL, byte length and SHA-256.

## 1. Re-verification of the already-recorded subject syllabi

Both syllabus checksums reproduced byte-identically against the previously recorded values.

| Source | HTTP | Bytes | SHA-256 | Probes |
|---|---|---|---|---|
| CBSE Class X Mathematics (041) syllabus 2026-27 | 200 | 270,782 | `d773e7c12b99e0bd498067e2b8268c76d0496bf9cad1c9e41c8652ab68b412a5` | 10/10 PASS |
| CBSE Class X Science (086) syllabus 2026-27 | 200 | 279,280 | `1bec4a9e44452b22c9d422d8cb528b4de30598f56c243461845165771df7bc37` | 12/12 PASS |

## 2. The five previously missing categories

| # | Category | Status | Evidence |
|---|---|---|---|
| 1 | `cbse_curriculum` | **RETRIEVED (2026-27)** | 1/1 |
| 2 | `ncert_textbook` | **RETRIEVED (current edition)** | 27/27 chapter PDFs |
| 3 | `rationalised_content_notice` | **RETRIEVED** | 1/1 |
| 4 | `sample_paper` | **MISSING for 2026-27** — prior session retrieved | 2026-27 index HTTP 404; 3 × 2025-26 retrieved |
| 5 | `marking_scheme` | **MISSING for 2026-27** — prior session retrieved | 2026-27 index HTTP 404; 3 × 2025-26 retrieved |

### 2.1 CBSE curriculum document — RETRIEVED

| Field | Value |
|---|---|
| Title | CBSE Secondary School Curriculum (Classes IX-X), Part 1, session 2026-27 |
| Authority | CBSE |
| URL | `https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Curriculum_SecP1_2026-27.pdf` |
| HTTP / MIME / Bytes | 200 · `application/pdf` · 22,529,690 |
| SHA-256 | `02ae5047722b6e22…` (full value in the manifest) |

Registry record `CBSE-2026-27-C10-CURRICULUM` moved from `draft`/`pending_confirmation` to **`final`/`applicable`**.

### 2.2 NCERT textbooks — RETRIEVED, edition pinned

All 27 official chapter PDFs retrieved from `ncert.nic.in` and individually checksummed:

- Mathematics `jemh1` — chapters 01–14, all HTTP 200, all `application/pdf`
- Science `jesc1` — chapters 01–13, all HTTP 200, all `application/pdf`

The registry records `NCERT-2026-27-C10-MAT-TEXTBOOK` and `NCERT-2026-27-C10-SCI-TEXTBOOK` are now `final`/`applicable`. Their registry checksum is a **composite**: the SHA-256 of the sorted `sourceId:sha256` chapter list. Per-chapter hashes are in the manifest, so any single chapter revision changes the composite and re-opens the record.

### 2.3 NCERT rationalised-content notice — RETRIEVED

`https://ncert.nic.in/pdf/BookletClass10.pdf` — HTTP 200, `application/pdf`, 4,576,078 bytes, SHA-256 `d241ca9dfafde0d0…`. Registry record `NCERT-2026-27-C10-RATIONALISED` is `final`/`applicable`.

### 2.4 Sample papers and marking schemes — MISSING for 2026-27

CBSE has not published session 2026-27 Class X sample papers. Reproducible evidence:

```
https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html  ->  HTTP 404
https://cbseacademic.nic.in/SQP_CLASSX_2025-26.html  ->  HTTP 200 (previous session)
```

Registry records `CBSE-2026-27-C10-SAMPLE-PAPER` and `CBSE-2026-27-C10-MARKING-SCHEME` remain `draft`/`pending_confirmation` with that HTTP evidence in the reviewer note. **No substitute was used.**

Six prior-session official artefacts were retrieved and recorded so the assessment shape is traceable, each explicitly `final` but **`not_applicable`** to 2026-27:

| Registry id | Document | Bytes |
|---|---|---|
| `CBSE-2025-26-C10-MAT-SQP-STD` | Mathematics Standard SQP 2025-26 | 511,677 |
| `CBSE-2025-26-C10-MAT-MS-STD` | Mathematics Standard marking scheme 2025-26 | 867,110 |
| `CBSE-2025-26-C10-MAT-SQP-BAS` | Mathematics Basic SQP 2025-26 | 1,064,576 |
| `CBSE-2025-26-C10-MAT-MS-BAS` | Mathematics Basic marking scheme 2025-26 | 922,915 |
| `CBSE-2025-26-C10-SCI-SQP` | Science SQP 2025-26 | 960,352 |
| `CBSE-2025-26-C10-SCI-MS` | Science marking scheme 2025-26 | 823,797 |

They are never used as a coverage authority for 2026-27.

## 3. Registry state after the update

`content/compliance/cbse-2026-27.sources.json` — manifest version 2, **14 records**, validation: **0 errors, 2 warnings** (the two unpublished 2026-27 assessment artefacts).

| Applicability | Records |
|---|---|
| `applicable` (2026-27 authority) | 6 — curriculum, 2 subject syllabi, 2 NCERT textbooks, rationalisation notice |
| `pending_confirmation` | 2 — 2026-27 sample paper, 2026-27 marking scheme |
| `not_applicable` (prior session) | 6 — 2025-26 SQP/MS set |

## 4. Effect on the compliance gate

`bun run scripts/compliance/validate.ts` — **OVERALL: SOURCE_PENDING** (unchanged verdict, reduced cause).

The SOURCE gate previously failed on five missing types. It now fails on exactly two:

```
Mathematics — SOURCE_PENDING (7 failing checks)
  FAIL SOURCE_GATE  required_types_present: missing: sample_paper, marking_scheme
Science — SOURCE_PENDING (9 failing checks)
  FAIL SOURCE_GATE  required_types_present: missing: sample_paper, marking_scheme
```

Both remaining failures are **externally blocked**: they close only when CBSE publishes the 2026-27 Class X sample papers and marking schemes. No EduOS action can close them, and no certification claim is made.

## 5. Limitations

- Two of five categories cannot be completed at this time; the blocker is CBSE publication, evidenced by HTTP 404.
- NCERT does not version its chapter PDF URLs; the composite checksum, not a printed edition string, is the anti-drift control.
- The retrieved documents are not committed, so re-running the scripts is the only way to re-derive the byte content.
