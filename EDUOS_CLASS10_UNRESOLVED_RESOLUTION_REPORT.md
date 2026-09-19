# EduOS Class 10 (2026–27) — Unresolved-content resolution report

**Environment:** EduOS staging only (`APP_ENV=staging`, https://eduos-staging.lovable.app).
Production was not written to and not deployed.

**Classification:** every outcome in this work is
`FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL`. Nothing here is a named-SME
decision, human certification, copyright clearance, official CBSE/NCERT
certification, or production approval.

---

## 1. Scope resolved

| Input | Count |
| --- | --- |
| Automated-unresolved advisory rows | 47 (46 distinct questions) |
| — qualitative / proof / definition items lacking a marking specification | 42 |
| — frozen-overlap-flagged rows | 5 (4 distinct questions; REQ024-DIAG-004 twice) |
| Content-fix row carried forward | 1 (REQ043-REASS-002) |

`C10-2627-MATH-REQ024-DIAG-004` keeps **two independent routing rows** and
**one** question-level outcome — no count inflation.

## 2. Active advisory state after resolution

| Measure | Value |
| --- | --- |
| Active advisory rows | 196 |
| Distinct questions | 195 |
| `AUTOMATED_PROVISIONAL_PASS` | 196 |
| `AUTOMATED_UNRESOLVED` | 0 |
| Superseded historical rows retained (append-only) | ≥ 244 |

State hash after resolution and after rollback + reapply is identical:
`e8dd5f47441ae01b04fea6c6af0e2d634ddb01a2ba56e386a5e60d72fffd947d`.

## 3. What was authored

- **42 machine-readable marking specifications** (`question_marking_specs`):
  expected conclusion, required reasoning steps, acceptable equivalent answers,
  required terminology, units, tolerance, common mistakes, minimum passing
  evidence. Authored by `AUTOMATED_FOUNDER_AUTHORIZED`; no human signature.
- **Four original EduOS rewrites** of the overlap-flagged Mathematics items
  (REQ022-DIAG-009, REQ024-DIAG-004, REQ032-DIAG-001, REQ034-REASS-005).
  Concept and curriculum objective retained; wording, context and values are
  original.
- **One explanation fix** (REQ043-REASS-002): the explanation now derives
  B = n·μ₀I/(2r), so five turns give five times the field. The answer itself
  was already correct.

Only these five questions changed. Every other question's text, answer and
explanation is byte-identical to the pre-resolution snapshot.

## 4. Originality evidence (`question_originality_checks`)

| Item | Exact match | Normalized match | Max shingle overlap | Semantic similarity | Verdict |
| --- | --- | --- | --- | --- | --- |
| REQ022-DIAG-009 | no | no | 0.00 | 0.509 | ORIGINAL_EDUOS_REWRITE_VERIFIED |
| REQ024-DIAG-004 | no | no | 0.00 | 0.557 | ORIGINAL_EDUOS_REWRITE_VERIFIED |
| REQ032-DIAG-001 | no | no | 0.00 | 0.482 | ORIGINAL_EDUOS_REWRITE_VERIFIED |
| REQ034-REASS-005 | no | no | 0.00 | 0.391 | ORIGINAL_EDUOS_REWRITE_VERIFIED |

Thresholds: shingle ≤ 0.15, semantic ≤ 0.60, checked against the recorded
matched shingle and the full superseded text. `copyright_clearance_claimed` is
false on every row. The frozen overlap list in `src/lib/sme-review-shared.ts`
was not modified.

## 5. Official-source traceability (`curriculum_source_register`)

47 item references registered against the official CBSE Class 10 2026–27
curriculum and subject syllabus PDFs, each with source URL, SHA-256 checksum
and access date. `licence_status = NOT_ASSESSED`, `verbatim_copying = false`.
No syllabus wording was copied.

## 6. Re-adjudication and Engine

- Three-pass adjudication (independent PASS A, adversarial PASS B, PASS C
  adjudication) re-run over the 48 rows: **48 PASS**, deterministic run hash
  `d121e7cec8a168ee36cbda63894aafa26bb7c06d6faa5e421e0f043a42a5a1c5`.
- Engine v1.0.0 rerun across **all 329 items**: 123 auto-approved, 206
  quarantined — unchanged from the pre-resolution run, recorded append-only
  under a fresh run id.

## 7. Verification (`scripts/class10/resolve/validate.py`) — 35/35 PASS

Advisory counts and question-level de-duplication · C2 contamination routing and
normalized-whitespace evidence · C1 exclusions and open work item · resolution
rows automated-only with no reviewer identity · excluded checks declared · no
certification language · marking-spec completeness · originality verdicts ·
before/after revisions · source register · only five items changed · no
status/verification-state change · paid-pool isolation (195 pool rows all
excluded from paid selection and production export) · Engine stability · PII
scan · append-only delete protection · rollback restores both advisory state and
content · deterministic reapply · no duplicate evidence on reapply.

## 8. Project gates

| Gate | Result |
| --- | --- |
| Test suite | 459/459 across 40 files |
| Typecheck | clean |
| Build | clean |
| Security scan | no critical or error findings; two pre-existing warnings (SECURITY DEFINER execute, catalogue_subject_sources null-book org scope) |
| Smoke | `/` 200, `/help` 200, `/contact` 200, `/privacy` 200, `/auth` 307 (expected redirect) |

## 9. Artefacts

- `scripts/class10/resolve/marking_specs.py`, `rewrites.py`, `originality.py`,
  `apply.py`, `readjudicate.py`, `engine_rerun.ts`, `validate.py`, `lib_rest.py`
- `scripts/class10/resolve/evidence/`: `pre_resolution_snapshot.json`,
  `apply_result.json`, `readjudication.json`,
  `engine_rerun_post_resolution.json`, `validation.json`

## 10. Production gate recommendation

**AUTHORIZE_STAGING_ONLY — PRODUCTION STILL BLOCKED.** The corpus now carries
complete provisional adjudication, marking specifications and source
traceability, but every outcome remains automated and provisional. Named
Mathematics and Science subject-expert review, and a licence/copyright
assessment of the registered sources, are still required before any item
becomes paid-pool or production eligible.
