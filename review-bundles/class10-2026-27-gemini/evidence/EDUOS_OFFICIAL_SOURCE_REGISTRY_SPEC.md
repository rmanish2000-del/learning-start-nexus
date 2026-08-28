# EduOS Official Source Registry — Specification

**Machine contract:** `sourceRecordSchema` / `sourceManifestSchema` / `validateSourceRegistry` in `src/lib/compliance-shared.ts`
**Data:** `content/compliance/cbse-2026-27.sources.json`

Only CBSE and NCERT documents may be recorded as authority. Anything else — coaching notes, aggregator sites, model output, past EduOS content — is evidence at best and never a source.

## 1. Record fields

| Field | Meaning |
|---|---|
| `id` | Stable registry key, e.g. `CBSE-2026-27-C10-MAT-SYLLABUS` |
| `board`, `classLevel`, `subject`, `academicSession` | Scope the document governs (`subject: "All"` for whole-curriculum documents) |
| `authority` | `CBSE` or `NCERT` only |
| `sourceType` | curriculum, subject syllabus, NCERT syllabus/textbook, rationalised-content notice, sample paper, marking scheme, circular, erratum, corrigendum, assessment guidance, practical requirement |
| `documentTitle`, `documentVersion`, `edition` | Human identification and edition pinning |
| `publishedOn`, `effectiveFrom`, `effectiveTo` | Validity window |
| `officialUrl`, `retrievedAt` | Retrieval provenance |
| `checksum`, `checksumAlgorithm` | `sha256` of the retrieved file; the anti-drift control |
| `status` | `final` · `draft` · `corrected` · `recalled` · `superseded` |
| `supersedesId`, `supersededById` | Version chain |
| `applicability` | `applicable` · `not_applicable` · `pending_confirmation` |
| `reviewerNote`, `evidenceRef` | Human judgement and stored evidence pointer |

## 2. Authority order

1. CBSE curriculum document for the session
2. CBSE subject syllabus for the session
3. NCERT syllabus and pinned textbook edition
4. CBSE rationalised-content notice / circular
5. CBSE sample paper and marking scheme (assessment shape only)
6. CBSE erratum or corrigendum — overrides all of the above for the corrected item

Conflicts are resolved top-down, and the resolution is written into `reviewerNote`.

## 3. Validation rules (enforced)

- unique ids; no self-supersession; no dangling supersession references
- `final` + `applicable` requires a 64-hex `sha256` checksum and a retrieval timestamp
- `draft` may never be `applicable` (draft/final confusion is a hard error)
- `recalled` must be `not_applicable`
- `superseded` requires a `supersededById`
- `pending_confirmation` is a warning that blocks the SOURCE gate for that subject

## 4. Handling mid-year changes

A mid-year CBSE circular or erratum is recorded as a **new** source record superseding the earlier one; the earlier record stays with `status: superseded`. The affected curriculum nodes are re-diffed, impact is recomputed, and the subject's compliance status returns to `MAPPING_INCOMPLETE` or `CONTENT_GAPS` until the gate passes again. Learner evidence already produced is untouched.

## 5. Current registry state

All five CBSE/NCERT records for Class 10 2026-27 are `draft` / `pending_confirmation` with no checksum: no official document could be retrieved and hashed in the build environment. Consequently the SOURCE gate fails for both subjects and no COMPLIANT verdict is possible. Closing this requires downloading each document from the official site, hashing it, storing the evidence reference and re-running `bun run scripts/compliance/validate.ts`.
