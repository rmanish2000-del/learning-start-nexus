# EduOS — Copyright and Redistribution Compliance Note

**Scope:** Class 10 CBSE/NCERT official source ingestion. **Generated:** 2026-09-02T13:46:32.646Z

## Position

EduOS records *references to* official documents. It does not host, mirror, bundle or redistribute
them.

## What is stored in this repository

- Official URLs on CBSE and NCERT government domains
- HTTP status, MIME type, byte size and retrieval timestamp
- SHA-256 digests (a one-way fingerprint; the document cannot be reconstructed from it)
- Page counts and imprint/edition strings
- Human-authored mappings and compliance findings

## What is never stored in this repository

- CBSE PDF binaries
- NCERT textbook binaries, in whole or in part
- NCERT rationalised-content booklet binaries
- Extracted textbook prose, figures, exercises or answer keys

## How the binaries are handled

`scripts/compliance/ingest-official-sources.ts` writes every downloaded file to the ephemeral
scratch directory `/tmp/eduos-official-sources`, outside the repository and outside any build
output. The files exist only long enough to be hashed and parsed, and are never added to version
control. `.gitignore` is not relied upon for this: the path is outside the working tree entirely.

## Content originality

The 326 Class 10 draft items are original, authored from outcome statements, with answers computed
in code. The generator's originality declaration
(`scripts/class10/gen/types.ts`, `ORIGINALITY_DECLARATION`) states that no item is copied from NCERT
textbook exercises, CBSE sample papers, board papers, exemplars or any commercial bank. Official
documents are used as the *authority for scope and assessment shape*, never as a content source.

## Attribution

CBSE curriculum, syllabus, sample paper and marking scheme documents are © Central Board of
Secondary Education. Textbook and rationalised-content materials are © National Council of
Educational Research and Training. EduOS asserts no rights over either and links users to the
official source.
