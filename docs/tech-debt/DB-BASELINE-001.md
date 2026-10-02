# DB-BASELINE-001 — Structure-only database baseline

Status: OPEN (technical debt)
Recorded: 2026-10-02
Owner decision: Fresh-database replay formally waived for the Parts A–F release.

## Waiver scope
Applies only to legacy migration history. Applied migrations are not edited,
no seed data is fabricated, and fresh bootstrap is NOT claimed as supported.

## Known causes of fresh-replay failure
- 20260823180225 depends on three demo-centre rows created by app use, never seeded.
- 20260902065859 repeats a policy already created by 20260902063620.
- Later migrations reference tables never created in saved history
  (remediation_actions, sme_review_queue, automated_review_imports, others).
- 20261002050000 depends on a function absent from saved history and is not re-runnable.

## Release gate used instead
Production-equivalent upgrade path: all six 20261002* migrations recorded as applied
on the live database (versions 045357, 045439, 045629, 050000, 050123, 050331).

## Future work
1. Export structure-only schema of the live database (no data).
2. Commit it as a baseline migration and mark covered versions as applied.
3. Prove fresh replay = baseline + newer migrations on a throwaway database.
