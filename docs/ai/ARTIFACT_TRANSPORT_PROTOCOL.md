# Artifact Transport Protocol

**Scope:** every file, package, report or dataset that moves between seats (Lovable ↔
Claude Code ↔ M365 Copilot ↔ Claude Cowork ↔ founder). **Enforced by:**
`scripts/ai/check-artifact-addressability.ts`, `validate-assignment.ts`,
`validate-handoff.ts`.

## 1. Coordinates

An artifact exists for another seat only when it has one of these coordinates:

| Store   | Required fields                    | Example                                                                                                           |
| ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `git`   | `repo`, `ref` (full SHA), `path`   | `rmanish2000-del/learning-start-nexus @ fa5fcde0… : verification/centre-admin-first-login/VERIFICATION_REPORT.md` |
| `drive` | `file_id` (+ `folder_id`, `title`) | `drive:file:1AbC…` in AGENT-REPORTS `11mSM9Q465EyaWkpgtL_ngDFHsRVaYOzg`                                           |
| `url`   | `url` (https)                      | `https://github.com/rmanish2000-del/learning-start-nexus/pull/4`                                                  |

Optional for all: `sha256`, `bytes`. A hash **without** a coordinate is not transport.

Not coordinates: a filename, "attached", "in Files", "this project", a chat message, a
Lovable preview link that needs a session, a Drive title without an id.

## 2. Producer obligations

1. Publish to a store the consumer can reach. Check `.ai/TOOL_CAPABILITIES.json`:
   Lovable cannot read Drive, so anything for Lovable goes into git; M365 Copilot cannot
   resolve git, so anything for it goes to Drive or is quoted in the handoff.
2. Record the artifact in `.ai/ARTIFACT_REGISTRY.json` with `producer`, `coordinate`,
   `access.status: verified` and the method used.
3. Confirm publication in the handoff: `publication_confirmed: true`. "I have committed
   it" without a SHA is not confirmation.
4. For packages above the Drive connector limit (10 MB), split or commit to a branch.
   Binary evidence with unverified copyright is never committed (see PR history of the
   MPBSE package).

## 3. Consumer obligations

1. Retrieve the artifact from the coordinate before acting. Record
   `consumer.retrieval_confirmed: true` + `confirmed_at` in the registry (or in the handoff
   back).
2. If retrieval fails: set `access.status: inaccessible`, create a `BLK-…` entry with the
   owner who can fix it, return `BLOCKED`. Do not substitute a similar file. Do not ask the
   founder to fetch it when another seat can (GV-012).
3. Verify `sha256`/`bytes` when given; a mismatch is a blocker, not a warning.

## 4. Producer / consumer repository agreement

For git artifacts, `producer.repo`, `coordinate.repo` and `consumer.repo` (when stated)
must match. A cross-repository hand-over records a `transport` object (how the content was
moved, by whom, resulting coordinate). The check fails on silent mismatches
(`PRODUCER_CONSUMER_REPO_MISMATCH`), because `eduos-ai`, `eduos` and
`learning-start-nexus` are distinct authorities (`.ai/REPOSITORY_AUTHORITIES.json`).

## 5. Lifecycle

`current` → `superseded` (newer artifact exists; keep the entry) or `blocked` / `missing`
(must reference an open blocker). Entries are never deleted.
