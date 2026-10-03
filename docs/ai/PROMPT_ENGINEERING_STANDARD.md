# Prompt Engineering Standard

**Scope:** every assignment issued to an AI seat for EduOS (Claude Code, Lovable, M365
Copilot, Claude Cowork, Figma). **Enforced by:** `scripts/ai/validate-assignment.ts`
against `.ai/ASSIGNMENT_SCHEMA.json`. **Owner:** M365 Copilot issues; the receiving seat
validates before acting.

## 1. An assignment is a contract, not a message

An assignment is valid only when it can be executed by a seat that has read nothing but
the repository at the pinned SHA, the `.ai/` registries and the assignment itself. If the
seat would have to ask "where is that file?", "which commit?", "am I allowed to deploy?" or
"can I do this instead of the founder?", the assignment is invalid.

## 2. Mandatory fields (summary of the schema)

| Field                         | Rule                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `id`                          | `ASG-YYYY-MM-DD-NNN`                                                                                        |
| `seat.tool` + `seat.mode`     | Exact tool and mode ("Lovable, implementation mode") — G4                                                   |
| `priority` + `business_value` | D17: every assignment states value and priority                                                             |
| `repo.base_sha`               | Full 40-character SHA the seat starts from. Never a branch name alone.                                      |
| `inputs[]`                    | Each has a **coordinate** (git / Drive / https) and `access_verified: true` with the verifying seat         |
| `steps[]`                     | Each names `executor` and a `capability` key from `.ai/TOOL_CAPABILITIES.json`                              |
| `gates[]`                     | Commands the seat must run before claiming done                                                             |
| `deployment`                  | `in_scope` + `permission`; when in scope: `explicit`, `granted_by: founder`, verbatim `statement`, `target` |
| `merge`                       | `by: founder` always                                                                                        |
| `outputs[]`                   | Where results land (git repo+path or Drive folder id) and who consumes them                                 |
| `rollback`                    | How to undo                                                                                                 |
| `return_to`                   | `m365_copilot` — G2                                                                                         |

## 3. Capability check before assigning

Before a step is written, the issuer checks `.ai/TOOL_CAPABILITIES.json`:

1. If the target seat holds the capability as `available`, assign it to that seat.
2. If no tool holds it and it is in `founder_only`, assign it to the founder with a
   `founder_exception` (`credential`, `payment`, `legal`, `irreversible_decision`,
   `manual_no_tool`).
3. If a tool holds it but the step is written for the founder, the validator rejects the
   assignment (`FOUNDER_EXECUTION`). This is G1 made mechanical.
4. If a seat's capability is `unknown`, the first assignment to that seat includes a step to
   prove or disprove it and record the result in the registry.

## 4. Verify inputs before referencing them

The issuer retrieves every input itself (or confirms a seat did) and records
`access_verified: true` + `verified_by`. The validator rejects:

- an input with no coordinate (`FILENAME_ONLY_INPUT`);
- an input or text that says "in Files", "this project", "attached", "shared earlier",
  "in chat", "as discussed" (`VAGUE_LOCATION`);
- a bare filename such as `EDUOS_MPBSE_A11Y_EXPORT.zip` anywhere in the prose
  (`FILENAME_ONLY_REFERENCE`);
- `access_verified` not `true` (`INPUT_NOT_VERIFIED`).

A hash is not a location. A ZIP named by SHA-256 that no seat can download is a blocker
(`BLK-…`), not an input.

## 5. Deployment and merge permissions are explicit

- `deployment.in_scope: true` requires `permission: "explicit"`, `granted_by: "founder"`,
  a verbatim `statement`, and a `target`.
- Conditional wording ("when appropriate", "if needed", "at your discretion") in the
  statement is rejected (`DEPLOYMENT_PERMISSION`). Standing rules that say "publish when
  appropriate" grant nothing (GV-004).
- A `deploy.*` step without `deployment.in_scope: true` is rejected.
- `repo.merge` steps belong to the founder (`MERGE_NOT_FOUNDER`).

## 6. Language and delivery

- Assignments are written in English (G5). Chat replies to the founder are short Devanagari
  Hindi with technical terms in English.
- Assignments go to the Drive INBOX folder (`.ai/REPOSITORY_AUTHORITIES.json` → stores),
  one active per seat, never pasted in chat.
- A Markdown assignment embeds exactly one ```json block holding the contract; the prose
  around it may explain but may not add requirements the JSON lacks.

## 7. Business-Value-First (D17) checklist for the issuer

1. Is a higher-value blocker open in `.ai/BLOCKER_REGISTRY.json`? Then this assignment must
   address it or justify why not in `business_value`.
2. Does this repeat completed verification without new evidence? Then do not issue it.
3. Can several small assignments be one bundled, independently verifiable assignment?

## 8. Template

See `docs/ai/examples/assignment.example.json`. Validate with:

```sh
bun scripts/ai/validate-assignment.ts path/to/assignment.json
```
