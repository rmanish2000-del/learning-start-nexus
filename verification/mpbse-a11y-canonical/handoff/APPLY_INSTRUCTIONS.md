# Apply to rmanish2000-del/learning-start-nexus
1. New branch from canonical main. 2. `git apply --3way changes.patch` (base b84fe476) or copy files/ onto repo root.
3. src/components/app-shell.tsx: keep only colour changes. 4. `bun install && bunx vitest run && bun run build`.
Rollback: `git revert` the commit, or re-publish the prior staging version. No migrations.
