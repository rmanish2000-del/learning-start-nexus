# EDUOS_CANONICAL_SYNC_INPUT_BUNDLE

Portable export of the verified EduOS staging release for canonical synchronization.

- Source project: EduOS-staging (https://eduos-staging.lovable.app), internal HEAD `f08e75385bdc1595c2d47a716f72db9bf4afa81b`
- Required canonical base: `rmanish2000-del/learning-start-nexus` @ `d6bf6f6e037b3abcc77daca6cbd7c639d62196bc` (branch `main`)
- Production untouched: no production write, migration, publication or deployment. Zero database mutations.

## Layout

- `codebase/` — complete tracked source tree: application source, `supabase/migrations/`,
  generated database types (`src/integrations/supabase/types.ts`), tests, Stage 3 / resolve /
  release / advisory / compliance scripts and their committed evidence (marking specifications,
  source register, content revisions, originality evidence, rollback assets), documentation.
  `.env` is excluded; use `codebase/.env.example`.
- `evidence-packages/` — previously produced evidence archives, byte-identical copies.
- `MANIFEST.json` — full inventory, per-file SHA-256, package identities, canonical base.
- `SHA256SUMS.txt` — checksums for every file in the bundle (paths relative to bundle root).

## Reconstruction

1. `git clone` the canonical repository and `git checkout d6bf6f6e037b3abcc77daca6cbd7c639d62196bc`.
2. Copy `codebase/` over the working tree (excluding `.env.example` if a real `.env` exists).
3. `bun install`, then run `bunx vitest run`, the type check and the production build.
4. Re-run the Class 10 validators under `scripts/class10/` against a staging database only.
5. Commit and push to canonical `main`; do not enable paid eligibility.

## Verification

```
sha256sum -c SHA256SUMS.txt
```

## Standing constraints

All Class 10 automated outcomes are labelled FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL. There is no
named human subject-matter-expert certification, no copyright clearance and no official CBSE/NCERT
certification. Paid selection and production export remain disabled for every item. C1 (three
paid-diagnostic exclusions active, REASSESSMENT-146ec7c8-POOL-BREACH open) and C2 (historical
contamination evidence, frozen overlap list unmodified) must be preserved.
