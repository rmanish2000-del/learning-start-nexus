# Tool Handoff Protocol

**Scope:** every result returned by a seat. **Enforced by:** `scripts/ai/validate-handoff.ts`
against `.ai/HANDOFF_SCHEMA.json`. **Receiver:** M365 Copilot (continuity owner, G2),
always; the founder reads the Hindi summary only.

## 1. Shape

A handoff is JSON (or Markdown with one ```json block) with: `assignment_id`, producer and
consumer seats, `repo.head_sha` (full), `production` (touched? sha? grade? source?),
`result` (`PASS` / `PARTIAL` / `FAIL` / `BLOCKED`), graded `evidence[]`, published
`artifacts[]`, `contradictions[]`, `blockers[]`, `worktree_clean`, `rollback`,
`ownership_returned_to: m365_copilot`.

## 2. Fail-closed rules

| Rule                                                                                                                 | Code                                                |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Full head SHA required                                                                                               | `MISSING_REPO_SHA`                                  |
| Production touched ⇒ deployed SHA present and `verified` via `/api/public/version`, fingerprint or deployment record | `PRODUCTION_UNVERIFIED`                             |
| `verified` evidence names a command or coordinate                                                                    | `EVIDENCE_UNGROUNDED`                               |
| No "see Files / this project / attached / in chat" in summary or claims                                              | `VAGUE_LOCATION`                                    |
| Every artifact has a coordinate and `publication_confirmed: true`                                                    | `FILENAME_ONLY_ARTIFACT`, `PUBLICATION_UNCONFIRMED` |
| `PASS` ⇒ no blockers and clean worktree; `BLOCKED` ⇒ at least one blocker                                            | `RESULT_INCONSISTENT`                               |
| Founder-owned blocker names its G1 exception                                                                         | `FOUNDER_EXCEPTION_MISSING`                         |

Retrieval confirmation by the consumer is a warning at handoff time and becomes the
consumer's first obligation (see Artifact Transport Protocol §3).

## 3. Sequence

```text
seat finishes work
→ runs gates (vitest, tsc, lint, build, ai:check) and records results as verified evidence
→ publishes artifacts (git commit + push, or Drive) and registers coordinates
→ writes the handoff, validates it, places it in Drive AGENT-REPORTS
→ updates .ai/CURRENT_STATE.json / CURRENT_TASK.json in the same commit when the repo changed
→ returns ownership to M365 Copilot
→ M365 Copilot confirms retrieval, issues exactly one next assignment
```

## 4. What never goes in a handoff

Secrets, credentials, staging data, personal data of parents or learners, Lovable branding
on user-facing surfaces, or a claim that the founder should "test / verify / configure"
anything a tool can do (G1).

## 5. Merge and deployment are not handoff steps

A handoff may say a PR is open and green. It never says "merged" or "deployed" unless the
founder merged or explicit deployment permission was in the assignment and production was
re-verified.
