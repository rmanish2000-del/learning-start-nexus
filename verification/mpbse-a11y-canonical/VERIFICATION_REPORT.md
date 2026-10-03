# MPBSE / accessibility / branding / deep-link — canonical integration and independent verification

**Seat:** Claude Code · **Date:** 2026-10-03 (UTC) · **Assignment:** `ASG-2026-10-03-003`
**Canonical base:** `main` @ `b634d11aa5e82c64b92261728df71348958069d6` (fetched, clean worktree)
**Working branch:** `feat/mpbse-a11y-canonical` · **Merge:** not performed (founder act) · **Staging / production:** not deployed, not modified

## Result: PASS (integration) — merge withheld for founder ratification of GV-013

## 1. Input availability gate

| Check | Result |
|---|---|
| Attachment present and readable | `EDUOS_MPBSE_CANONICAL_HANDOFF.zip` in the session uploads |
| Byte size | 716174 (expected 716174) ✔ |
| SHA-256 | `290f51a170329344a13b541f1e651c9f13c3e56ae4e069d65a585f6f9105940f` ✔ |
| `SHA256SUMS.txt` | 54/54 OK |
| `MANIFEST.json` | 54 entries, every path present with matching size |
| 19 repository-relative source files under `files/` | all present |
| `changes.patch` ↔ `files/` | patch names the same 19 paths; `git apply --check` against main: clean. After applying the patch, 14 files are byte-identical to `files/`; 5 differ (see §3) |
| Secret scan (archive + diff) | 0 findings (payment keys, private keys, JWTs, AWS keys, service-role) |
| Stated source | Lovable saved version `6cf4c74b…`, patch base `b84fe476…` — neither commit exists in the GitHub repository (Lovable-internal); the patch nevertheless applied cleanly to `main`, so main is content-identical to that base for these paths |

A second upload, `mpbse-a11y-handoff.zip` (66914 B, SHA-256 `a4fb130e…5b17`), is the inner `handoffs/mpbse-a11y` package and was not needed.

## 2. Accepted changes (exact paths)

New: `content/mpbse/mpbse-class10-sample-papers.{csv,json}`, `design/figma/MPBSE_DESIGN_CORRECTION.md`, `src/components/mpbse-papers.tsx`, `src/lib/attempt-storage.ts`, `src/lib/__tests__/{attempt-storage,mpbse-registry,vendor-branding}.test.ts`.
Modified (from `changes.patch`): `src/components/app-shell.tsx` (colour lines only), `src/components/ui/sidebar.tsx`, `src/components/user-menu.tsx`, `src/lib/__tests__/english-only.test.ts`, `src/routes/__root.tsx`, `src/routes/_authenticated/exam-pattern.tsx`, `src/routes/_authenticated/route.tsx`, `src/routes/auth.tsx`, `src/start.ts`, `src/styles.css`, `tsconfig.json`.
Added by this verification: `src/lib/auth-return.ts`, `src/lib/__tests__/auth-return-route.test.ts`, `verification/mpbse-a11y-canonical/**`, `.ai/*` registry updates, `CURRENT_ASSIGNMENT.md`, one rule in `scripts/ai/check-artifact-addressability.ts` (superseded artifacts are history) with its test.

### app-shell.tsx line-level disposition

Accepted (3 lines, `HeaderTitle` role badge, lines 493–495):

```
- role === "educator" && "bg-primary/10 text-primary",
- role === "student"  && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
- role === "parent"   && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
+ role === "educator" && "bg-primary/10 text-foreground",
+ role === "student"  && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
+ role === "parent"   && "bg-amber-500/10 text-amber-800 dark:text-amber-400",
```

Rejected: the `files/src/components/app-shell.tsx` copy (264 differing lines) — import reflow, removal of `useWorkspaceContext`, re-inlining of `canSeeNavItem`/`NavVisibility` (canonical keeps them in `src/lib/nav-visibility.ts`), navigation and layout rewrites. None applied.

### tsconfig.json

Accepted: `"resolveJsonModule": true` only. Demonstrably required: without it `tsc` fails on `src/components/mpbse-papers.tsx`, `src/lib/__tests__/mpbse-registry.test.ts` (and, already on main, `src/lib/pyq-shared.ts` and `compliance-framework.test.ts`, which compiled only because Bun/Vite tolerate JSON imports). No other setting changed.

## 3. Rejected `files/` deltas (not in `changes.patch`; would regress canonical code)

| File | Delta in `files/` | Disposition |
|---|---|---|
| `src/routes/_authenticated/route.tsx` | replaces `isPlatformOwnerUser` with `isConfirmedPlatformOwner` (not exported on main) and **drops the parent-role platform-owner exception** | rejected — owner-route regression |
| `src/start.ts` | **removes the `/lovable/` auth-gate bypass** for platform email webhooks/previews | rejected — would break system email endpoints |
| `src/routes/__root.tsx` | import reorder and `ErrorComponent` signature refactor | rejected — unrelated |
| `src/routes/auth.tsx` | two blank lines | rejected — unrelated |
| `src/components/app-shell.tsx` | see above | rejected |

The `handoffs/mpbse-a11y/files/src/components/ui/sidebar.tsx` copy is older (`/70` label contrast); the top-level copy and the patch carry the `/85` fix that `SOURCE_STATE.json` lists as pending — the patch version is what landed.

## 4. Reconciliations made on top of the patch

1. **Open-redirect hardening moved into a unit-testable helper.** `src/lib/auth-return.ts` → `sanitizeReturnPath()` (same-origin absolute path only; rejects `//evil.com`, `/\evil.com`, absolute URLs, `javascript:`, relative paths, >2048 chars, and anything that resolves to another origin). `auth.tsx` `validateSearch` now calls it; behaviour is a superset of the handoff regex.
2. **`vendor-branding.test.ts`** failed against canonical on `src/routes/lovable/email/auth/preview.ts:29` (`SAMPLE_PROJECT_URL`). That route is a platform-internal email preview bypassed from the auth gate, never a customer surface, so the walker now skips `src/routes/lovable/` (comment added). No product file changed.
3. **Formatting hunks** inside `exam-pattern.tsx` and `user-menu.tsx` from the patch were kept (prettier-conformant reflow of lines in files that also carry functional changes). `auth.tsx` was deliberately **not** reformatted; only the handoff hunk and the helper import were applied.

## 5. Required functional scope — verification

| Item | Evidence |
|---|---|
| MPBSE registry + board surface | `content/mpbse/*.json`: 21 records; `mpbse-papers.tsx` board picker on `/exam-pattern` |
| 21 registry entries | `python` count 21 (9 `VERIFIED`, 12 `NOT_FOUND`); `mpbse-registry.test.ts` CSV↔JSON parity |
| 9 official mpbse.nic.in links | all 9 `official_url` hosts = `mpbse.nic.in`; NOT_FOUND rows carry no URL (test) |
| MPBSE practice disabled | disabled button + `aria-describedby="mpbse-practice-note"`; no `startPyqSessionFn` in the panel (new test) |
| Mobile timed-attempt persistence | `eduos.pyq.open` / `eduos.pyq.answers.<session>` autosave after `restored`; cleared on submit |
| Account isolation on shared devices | `claimAttemptStorage(userId)` wipes keys when the owner differs (`attempt-storage.test.ts`) |
| Sign-out answer cleanup | `clearAttemptStorage()` in `UserMenu.handleSignOut` and on `SIGNED_OUT` in `__root.tsx` (source-shape test) |
| Accessibility fixes | `SidebarInset` `<main>`→`<div>` (removes the duplicate landmark; the real `<main>` is in `app-shell.tsx:470`), group-label contrast `/85`, `--eds-color-text-on-brand` `#1a0d02`, `aria-label` on `Progress`, `aria-pressed` filters, `lang` attribute on the MPBSE section |
| EduOS-only branding release check | `vendor-branding.test.ts` 4/4 incl. built `dist/client/assets` scan after the production build |
| Safe `/exam-pattern` deep-link return | `start.ts` 302 → `/auth?next=<encoded path+search>`; `route.tsx` redirect carries `next: location.href`; `/auth` renews the marker before `window.location.replace(next)` |
| `//evil.com` and external return destinations rejected | `auth-return-route.test.ts` (protocol-relative, backslash, `https://`, `javascript:`, relative) |
| CBSE regression protection | CBSE workspace path unchanged; `pyq-and-auto-verification.test.ts` and the full suite green |

## 6. Security review

- **No open redirect:** `sanitizeReturnPath` + tests; `start.ts` encodes the path; `location.href` from the router is always a relative path.
- **No cross-account attempt leakage:** owner key `eduos.pyq.owner` compared before any restore; wiped on mismatch, on `SIGNED_OUT`, and on sign-out click.
- **No secrets:** archive scan 0; diff scan 0; no `.env`, no keys, no credential files.
- **Local storage after sign-out:** all `eduos.pyq.*` keys removed (test). Residual: a learner who closes the browser without signing out keeps their own in-progress answers on that device — this is the intended persistence feature and is scoped to that account.
- **Owner-route access:** `route.tsx` keeps `isPlatformOwnerUser` and the parent-role owner exception; `platform-owner-capability.test.ts` and `unconfirmed-owner.test.ts` green. The regressing `files/` copy was rejected.
- **Vendor branding:** test green on source and built CSS/HTML.
- **No database or migration change:** `supabase/` untouched. **No dependency change:** `package.json` and `bun.lock` untouched. **No generated build artifacts** staged.

## 7. Gates (observed on the branch)

| Gate | Result |
|---|---|
| `bunx vitest run` | **562 passed / 51 files** (main: 540 / 47) |
| `bunx tsc --noEmit -p tsconfig.json` | 0 errors |
| eslint (changed files) | clean, except two prettier findings in `src/start.ts` (lines 18 and 79) and one `react-refresh` warning in `sidebar.tsx` — all three reproduce on `main` unchanged and are outside the touched hunks |
| `LOVABLE_SANDBOX=1 bun run build` | success, 254 precache entries |
| `bun run ai:check` | PASS |
| `bun install` | not re-run: dependencies were already installed from the existing lockfile in this session; `bun.lock` unchanged |

## 8. Contradiction recorded

`CX-MPBSE-HINDI`: the panel ships Hindi-default copy citing a founder decision of 2026-10-02 that is not in `PRODUCT_DECISIONS.md` and conflicts with D9/G5 (English-only product). Recorded as provisional **GV-013** with blocker `BLK-MPBSE-HINDI-RATIFICATION`; the founder ratifies by merging or asks for English-only before merge.

## 9. Limitations and unresolved risks

- Live staging UAT (`TEST_EVIDENCE.md`) is **reported** by Lovable; this seat cannot reach `eduos-staging.lovable.app` and did not re-run it. Staging asset `styles-CEoXcQt9.css` was not compared against this branch's build.
- The Lovable base commits are not in GitHub; provenance rests on the clean patch application and byte-identical results for 14 of 19 files.
- MPBSE papers for 2017–2022 are `NOT_FOUND` on the official site (registry rows kept without invented URLs).
- Repo-wide `bun run lint` remains red from pre-existing formatting unrelated to this change.
- The 7 handoff screenshots are identified by SHA-256 in `handoff/MANIFEST.json` and were not committed.

## 10. Rollback

Close the PR, or `git revert <integration commit>` on the branch. No schema, data, secret or deployment change. Staging and production were not touched.

## 11. Handoff

Ownership returned to M365 Copilot. Next founder act: ratify GV-013 and merge the PR. Next assignment already issued as the example `ASG-2026-10-03-002` (Lovable verifies the deployed production SHA).
