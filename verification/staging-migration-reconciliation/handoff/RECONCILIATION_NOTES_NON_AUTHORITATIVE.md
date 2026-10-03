# Proposed forward-only reconciliation, NON-AUTHORITATIVE

These are suggestions for Claude Code to evaluate. They are not tested and not approved.

1. Never edit, rename or delete any migration already applied on staging. Do not reset the database.
2. Ask the Lovable/Cloud owner for the live staging migration log (supabase_migrations.schema_migrations) before acting. Inference from objects is not provenance.
3. Add ONE new forward migration in main, timestamped after 20261002052550, that:
   - creates question_commercial_release only IF NOT EXISTS (from main 20260919195620), with its grants/RLS
   - creates founder_access_denials only IF NOT EXISTS (from main 20261002045629)
   - re-applies `ALTER VIEW public.production_release_pool SET (security_invoker = on)` if the view exists
   - re-asserts private.is_platform_owner() with the confirmed-email check (identical in both histories)
   - re-runs the 20260919175907 exclusions insert with ON CONFLICT DO NOTHING / NOT EXISTS guard
4. Bring staging's 8 staging-only filenames into main as recorded no-ops or idempotent copies so both histories contain the same filenames. The platform must then mark main-only names already satisfied (3 identical pairs, 20260919175712, 20260915161655) as applied without executing them. This step needs platform support; confirm it is possible before relying on it.
5. Take a staging backup (Cloud → Advanced settings → Export data) and dry-run against a restored copy first.
