<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## White-label branding (permanent, added 2026-09-08)

Never add, restore, recommend, or ask permission to include build-platform
(Lovable) branding in EduOS. Every user-facing surface — copy, headers,
footers, auth and consent screens, titles, favicons, manifest, Open Graph and
share previews, structured data, emails, error/offline/404 pages, cookie and
help surfaces, checkout, PWA install — carries EduOS branding only.

Technical runtime dependencies (`@lovable.dev/*` packages, Cloud auth/email
endpoints, preview-host detection, CSP frame-ancestors, the managed OAuth
consent endpoint) are permitted only where invisible to end users, and are
allow-listed explicitly in `src/lib/__tests__/no-platform-branding.test.ts`.

Every public page must declare its own EduOS `og:image`; without one the host
substitutes a generated screenshot served from a platform preview domain.

## AI governance and context engineering (permanent, added 2026-10-03)

Every AI seat (Claude Code, Lovable, M365 Copilot, Claude Cowork, Figma) reads
`.ai/CONTEXT_INDEX.json` first and follows the standards in `docs/ai/`. The
rules below are enforced by `bun run ai:check` and
`src/lib/__tests__/ai-governance.test.ts`; they fail closed.

1. **Capability check before assigning.** Consult `.ai/TOOL_CAPABILITIES.json`.
   A step a tool can perform is never assigned to the founder. The founder acts
   only for merges, deployment approval, credentials, payments, legal approval
   and irreversible decisions (G1 / GV-005).
2. **Verify inputs before referencing them.** Every input carries an
   addressable coordinate — git `repo + full SHA + path`, Drive `file_id`, or an
   https URL — and `access_verified: true`. A filename, a hash, "Files", "this
   project", "attached" or a chat reference is not a location (GV-001).
3. **Repository authorities.** `learning-start-nexus` is the application
   authority and the only deployment source; `eduos-ai` is product authority;
   `eduos` is fleet authority (`.ai/REPOSITORY_AUTHORITIES.json`). Producer and
   consumer of an artifact must agree on the repository.
4. **Stop on inaccessible input.** If an input cannot be retrieved from its
   coordinate, return `BLOCKED`, register the blocker in
   `.ai/BLOCKER_REGISTRY.json`, and do not substitute or guess (GV-012).
5. **Producer publishes, consumer confirms.** A producer records
   `publication_confirmed`; the consumer records `retrieval_confirmed` in
   `.ai/ARTIFACT_REGISTRY.json` before acting.
6. **Grade every claim** as `verified`, `reported`, `assumed` or `blocked`.
   Production is `verified` only against `GET /api/public/version` and
   `EDUOS_RELEASE_FINGERPRINT_EVIDENCE.md` (GV-006).
7. **Permissions are explicit.** Deployment requires `deployment.permission:
   "explicit"` granted by the founder in the assignment; "when appropriate" is
   not permission (GV-004). Merges are founder acts. Published git history is
   never rewritten.
8. **Return ownership to M365 Copilot.** Every result is a handoff conforming
   to `.ai/HANDOFF_SCHEMA.json`; assignments conform to
   `.ai/ASSIGNMENT_SCHEMA.json` and go to the Drive INBOX, one active per seat.
9. **Keep state in the repository.** Update `.ai/CURRENT_STATE.json` and
   `.ai/CURRENT_TASK.json` in the same commit as the work they describe. Mark
   superseded text with `[SUPERSEDED YYYY-MM-DD: …]`; never delete evidence.
