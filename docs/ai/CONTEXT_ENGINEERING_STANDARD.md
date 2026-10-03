# Context Engineering Standard

**Scope:** how any AI seat loads, ranks and refreshes EduOS context. **Enforced by:**
`scripts/ai/validate-context.ts` and `scripts/ai/check-context-conflicts.ts`.

## 1. Load order

1. `AGENTS.md` (repository instructions, loaded automatically by most seats).
2. `.ai/CONTEXT_INDEX.json` — the ordered list of sources and their authority rank.
3. `.ai/CURRENT_STATE.json`, `.ai/CURRENT_TASK.json`, `.ai/BLOCKER_REGISTRY.json`.
4. `.ai/DECISION_REGISTRY.json` for any decision the task touches.
5. `EDUOS_PROJECT_OPERATING_SYSTEM.md` §0–§13 (rules only).
6. Only then the continuity Markdown (`PROJECT_STATUS.md`, `PRODUCT_DECISIONS.md`,
   `TECHNICAL_STATE.md`, `ROADMAP.md`) — and only the sections the task needs.
7. Historical reports (`EDUOS_*.md`, `verification/`) when a specific claim must be traced.

Chat history is the lowest authority. A fact that lives only in chat is `reported`.

## 2. Authority order on conflict

```text
production evidence > repository head > .ai registries > operating rules
> continuity documents > historical reports > chat
```

Within the continuity documents, a dated section never outranks a later dated section,
and a section marked `[SUPERSEDED …]` is evidence of its own date only.

## 3. Evidence grades

| Grade      | Meaning                                | Required companion                        |
| ---------- | -------------------------------------- | ----------------------------------------- |
| `verified` | Observed by the seat writing the claim | command run, HTTP response, or coordinate |
| `reported` | Stated by another seat or a document   | the source name                           |
| `assumed`  | Inferred without observation           | the inference                             |
| `blocked`  | Could not be observed from this seat   | the blocker id                            |

Production claims are `verified` only against `GET /api/public/version` compared with
`EDUOS_RELEASE_FINGERPRINT_EVIDENCE.md`, or a deployment record. A document saying
"deployed SHA X" is `reported` (GV-006).

## 4. Staleness

- `CURRENT_TASK.json` is stale when older than `stale_after_days` or when its
  `repo.base_sha` differs from `CURRENT_STATE.repo.verified_head_sha`. A seat that finds it
  stale re-verifies the head, re-stamps the task, and records what changed — it does not
  act on the stale task.
- `CURRENT_STATE.json` is refreshed in the same commit as any change to gates, head or
  production knowledge. `verified_head_sha` is the commit the state was observed at.

## 5. Context budget

- Never paste whole continuity documents into an assignment. Point at the coordinate and
  the section.
- Prefer the registries over prose; prefer a test file over a report when both exist.
- Retrieve historical reports lazily: only when a claim must be traced to its origin.

## 6. Refresh rule for gate figures

Gate results (`vitest`, `tsc`, `lint`, `build`, `ai:check`) are recorded with the SHA they
were observed at. A seat quoting a figure from a document without re-running the command
grades it `reported`. Test totals in the Markdown documents are historical and are expected
to disagree with each other (CX-TEST-COUNT-DRIFT); only `CURRENT_STATE.json` is current.

## 7. Conflict handling

When two sources disagree and the registry has no resolution:

1. Do not pick one. Stop the dependent step.
2. Record the conflict with the sources in the handoff `contradictions[]`.
3. Propose the resolution; the founder ratifies if it changes product truth, otherwise the
   seat records it in `DECISION_REGISTRY.json` with the evidence.

`check-context-conflicts.ts` fails closed on any detected conflict without a resolution.
See `docs/ai/CONTEXT_CONFLICT_RESOLUTION.md` for the classes it detects.
