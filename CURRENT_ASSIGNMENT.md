# EduOS — Current Assignment

**Last verified:** 2026-10-03 (UTC) · **Canonical branch:** `main` · **Verified head:** `fa5fcde09323096a715e8307fc5114b210ae198f`
**Machine-readable mirror (authoritative on conflict):** `.ai/CURRENT_TASK.json`
**Evidence source:** founder assignment to the Claude Code seat, 2026-10-03.

This file holds **only** the active assignment. Completed assignments move to
`.ai/CURRENT_TASK.json` → `history` with a git coordinate to their full text; the previous
contents of this file are preserved at
`fa5fcde09323096a715e8307fc5114b210ae198f:CURRENT_ASSIGNMENT.md`.

---

## Governing rules (permanent, inherited by every chat)

`EDUOS_PROJECT_OPERATING_SYSTEM.md` §11 (Founder Non-Execution, M365 Copilot continuity
ownership, English assignments / Hindi chat), §12 (Business-Value-First) and §13 (AI
governance: capability check, addressable coordinates, explicit permissions, graded
evidence, return ownership to M365 Copilot). `AGENTS.md` carries the same rules for every
seat. `bun run ai:check` must pass before any handoff.

---

## Active assignment

**Id:** `ASG-2026-10-03-001`
**Title:** Prompt and context engineering standard — adopt the `.ai` governance layer
**Received:** 2026-10-03 · **Priority:** P0 · **Owner:** Claude Code · **Continuity owner:** M365 Copilot
**Status:** in progress — repository work delivered on branch
`claude/ai-governance-context-engineering` (PR against `main`); merge and adoption steps pending.

### Business value

Stops every seat from re-deriving state, losing artifacts between tools and asking the
founder to execute tool work. Two staging packages (`ART-0005`, `ART-0006`) were referenced
by name and hash only and were never retrievable; this layer makes that impossible to issue.

### Objective

Every assignment and handoff carries addressable artifact coordinates, a repository SHA,
graded evidence and explicit permissions, and is validated fail-closed before any seat acts.

### Scope

In: `.ai/` registries and schemas; `docs/ai/` standards; `scripts/ai/` validators and
tests; updates to `AGENTS.md`, `EDUOS_PROJECT_OPERATING_SYSTEM.md`, this file and
`EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md`.
Out: application code, database schema, deployment, merge, deleting historical evidence.

### Steps

| # | Action | Executor | Status |
|---|---|---|---|
| S1 | Audit the eight continuity documents and record contradictions | Claude Code | done |
| S2 | Create `.ai`, `docs/ai`, `scripts/ai` and the fail-closed tests | Claude Code | done |
| S3 | Run vitest, tsc, eslint, build and `ai:check` | Claude Code | done |
| S4 | Commit, push to a new branch, open a PR against `main` | Claude Code | done |
| S5 | Review and merge the PR | Founder (irreversible decision) | pending |
| S6 | Issue the next INBOX assignment as `ASSIGNMENT_SCHEMA.json`-conformant JSON | M365 Copilot | pending |
| S7 | Return results as `HANDOFF_SCHEMA.json`-conformant handoffs with git coordinates | Lovable | pending |

### Gates

`bunx vitest run` · `bunx tsc --noEmit -p tsconfig.json` · `bun run lint` ·
`LOVABLE_SANDBOX=1 bun run build` · `bun run ai:check`

### Permissions

Deployment: **not in scope, no permission.** Merge: founder only.

### Blockers

See `.ai/BLOCKER_REGISTRY.json` (production SHA unverifiable from this seat; two missing
staging packages; PDF branch on the remote; roadmap case collision; OAuth client; PR #4
decision).

### Rollback

Revert the governance commit(s) on the branch. No runtime, schema or deployment change.

### Next gate

Founder merge of the PR, then M365 Copilot issues `ASG-2026-10-03-002`
(`docs/ai/examples/assignment.example.json`: verify the deployed production SHA against the
release fingerprint and close `BLK-PRODUCTION-SHA`).
