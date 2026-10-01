# VERIFICATION_REPORT — MPBSE Class 10 Mathematics & Science evidence package (independent rebuild)

Execution start: 2026-10-01T17:17:45Z (22:47 IST, 2026-10-01) · Completed: 2026-10-01T17:43:57Z
Executor: Claude Cowork seat · Method: direct HTTPS retrieval from the three authoritative hosts (curl, UA = desktop Chrome string) through the session proxy; link discovery by parsing the live portal HTML (saved in this run); SHA-256 computed from downloaded bytes; claims read from text layer (CBSE/NCERT/MPBSE model papers) or from rendered page images (MPBSE scanned syllabus/marks scheme).
Prior Gemini packages: NOT consulted. No URL, date or hash reused.

## Verdict: **PARTIAL**
- VERIFIED: MPBSE 2026-27 Class 10 Maths and Science syllabus chapter lists, marks scheme (75 marks, 3 h, chapter weights, 23-question pattern), 2025-26 model papers; CBSE 2026-27 Class X Maths/Science curriculum, QP design, SQPs + marking schemes; NCERT copyright status.
- FAILED (per stated fail conditions): outcome-by-outcome CBSE↔MPBSE equivalence cannot be proven (MPBSE publishes no outcomes); copyright permission is unclear/unverified for MPBSE & CBSE and explicitly restricted for NCERT; MPBSE actual board exam papers not located; MPBSE documents carry session year but no issue date.

## Source count
- 20 files downloaded, all HTTP 200, application/pdf, hashed (sha256sums.txt).
- 15 page-verified (status VERIFIED in source_manifest.csv); 5 downloaded but not page-verified (no claims drawn).
- Portals navigated: mpbse.nic.in (home → academics.html → ModelPaper.HTML), cbseacademic.nic.in (home → curriculum_2027.html, SQP_CLASSX_2026-27.html), ncert.nic.in (textbook.php → textbook/pdf/).

## Key verified facts (page-cited; see claim_evidence_matrix.csv)
- MPBSE Maths 2026-27: 14 chapters; Basic/Standard share syllabus and marks scheme, differ in paper difficulty (Syllabus PDF p30; Marks Scheme PDF p31).
- MPBSE Science 2026-27: 13 chapters, titles only (Syllabus p31; Marks Scheme p32).
- MPBSE pattern (both subjects): 75 marks, 3:00 h, Q1–5 = 30 objective items ×1; Q6–17 = 12×2; Q18–20 = 3×3; Q21–23 = 3×4.
- CBSE Maths 2026-27: 80 theory + 20 internal; unit weights 6/20/6/15/12/10/11; typology 43/19/18.
- CBSE Science 2026-27: 80 + 20; units 25/25/12/13/5; three chapters formative-only.
- NCERT Class 10 Maths/Science: Reprint 2026-27, © NCERT, all rights reserved.

## Unavailable / not verified
- MPBSE 2026-27 model papers (only 2025-26 published).
- MPBSE previous board exam papers and official marking schemes for actual papers.
- MPBSE learning-outcome statements (do not exist).
- Any licence for MPBSE/CBSE material.
- Circular Bse_53_54 content (OCR unreadable).

## Integrity
- SHA-256 generated with `sha256sum` over source_documents/ bytes (originally one 20-line sha256sums.txt; split on repository commit, hashes unchanged — see Repository storage section).
- url_verification_log.csv records every request (URL, final URL, HTTP status, MIME, bytes, UTC time), including one failed first attempt (connection reset) that was retried.
- No repository, production, staging, application or database change. Nothing designed, implemented, committed or deployed.

## Repository storage (added on repository commit, 2026-10-01)
No source PDF binaries are stored in this repository. Redistribution permission for MPBSE, CBSE and NCERT material is unverified (see COPYRIGHT_STATUS.md), so the repository holds only metadata, official URLs, SHA-256 hashes, evidence matrices and Drive references. `source_documents/` is intentionally absent.

All 20 PDFs are Drive-only: AGENT-REPORTS/evidence-parts (Google Drive folder id 1y97K7N4IY1atm-AbxoYRg7K9nJBrsv8S).
- `sha256sums-drive-part1.txt` — 15 PDFs in MPBSE_CBSE_Evidence_Package_PART1_manifests_and_docs.zip
- `sha256sums-external-drive.txt` — 5 large scans:
  - CBSE_Curriculum_2026_27_SecPart1_Intro.pdf — MPBSE_CBSE_Evidence_PART6.zip + PART6.z01 (split zip)
  - MPBSE_MarksScheme_2026_27.pdf — MPBSE_CBSE_Evidence_PART3.zip
  - MPBSE_Syllabus_2025_26.pdf — MPBSE_CBSE_Evidence_PART4.zip
  - MPBSE_MarkingScheme_2025_26.pdf — MPBSE_CBSE_Evidence_PART5.zip
  - MPBSE_Syllabus_2026_27.pdf — MPBSE_CBSE_Evidence_PART2.zip
To verify: download the parts, extract into `source_documents/`, then `cd source_documents && sha256sum -c ../sha256sums-drive-part1.txt ../sha256sums-external-drive.txt`.
Per-file location: `storage_location` / `storage_reference` in source_manifest.csv/json. Re-fetching from the official `document_url` is the independent check, but publishers can replace a file at the same URL, so a later hash mismatch is not proof of tampering by itself.

Dates: 2026-10-01 is the real execution date. It was checked against the container clock and the HTTP `Date` headers from the GitHub API and the npm registry, and it matches the retrieval timestamps in url_verification_log.csv. No timestamps were changed.

Verification limitations:
- The repository alone cannot reproduce any source document. Integrity depends on the Drive copies, which sit outside git and its access control, or on re-fetching from the official URLs.
- All 20 hashes matched (20/20 OK) on the extracted package on 2026-10-01 before commit.
- The "Nothing ... committed" line under Integrity describes the Cowork build run. This package was later committed by Claude Code; evidence content was not edited.
