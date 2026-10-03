# `.ai/` — machine-readable context for every AI seat

This directory is the first thing any AI seat (Claude Code, Lovable, M365 Copilot,
Claude Cowork, Figma) reads after `AGENTS.md`. It exists so that no seat has to
re-derive state from 100+ Markdown reports, and so that nothing is handed between
tools by filename, "Files", "this project" or chat memory.

| File                          | Holds                                                               | Validated by                    |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| `CONTEXT_INDEX.json`          | Ordered list of context sources and their authority rank            | `validate-context`              |
| `CURRENT_STATE.json`          | Verified repository head, gate results, graded production claims    | `validate-context`              |
| `CURRENT_TASK.json`           | The single active mission plus a history of completed ones          | `validate-context`              |
| `TOOL_CAPABILITIES.json`      | What each seat can, cannot and must not do                          | `validate-assignment`           |
| `REPOSITORY_AUTHORITIES.json` | Which repository or store owns which change                         | `check-artifact-addressability` |
| `ARTIFACT_REGISTRY.json`      | Addressable coordinate + access status of every cross-tool artifact | `check-artifact-addressability` |
| `DECISION_REGISTRY.json`      | Durable decisions and resolutions of known context conflicts        | `check-context-conflicts`       |
| `BLOCKER_REGISTRY.json`       | Open blockers with owner and founder-exception classification       | `check-artifact-addressability` |
| `ASSIGNMENT_SCHEMA.json`      | JSON Schema for assignments                                         | `validate-assignment`           |
| `HANDOFF_SCHEMA.json`         | JSON Schema for handoffs                                            | `validate-handoff`              |

## Run the gate

```sh
bun run ai:check                        # all five validators, fail-closed
bun scripts/ai/validate-assignment.ts path/to/assignment.json
bun scripts/ai/validate-handoff.ts path/to/handoff.json
```

Standards that explain the rules: `docs/ai/`. Tests that prove the validators fail
closed: `src/lib/__tests__/ai-governance.test.ts`.

## Update rules

- Update `CURRENT_STATE.json` and `CURRENT_TASK.json` in the same commit as the work
  they describe. `verified_head_sha` is the commit the state was _observed at_; a
  file cannot carry the hash of the commit that adds it.
- Never delete an artifact, decision or blocker; set `status` instead.
- Never write a secret, credential, staging data or personal data here.
- Timestamps are ISO-8601 with timezone.
