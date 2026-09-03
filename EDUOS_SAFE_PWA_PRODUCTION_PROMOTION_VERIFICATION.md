# EduOS — Safe PWA Phase 1 Production Promotion Verification

**Date:** 2026-09-03 (UTC)
**Repository:** learning-start-nexus (canonical)
**Production:** https://www.eduos.global
**Source artifacts:** `EDUOS_SAFE_PWA_PRODUCTION.patch` (18 files), `EDUOS_SAFE_PWA_PROMOTION_REPORT.md`
**Rollback reference commit (staging):** `a7f2528031374c245f8b6f16550e0ba2a1f150ce`

---

## 1. Patch reconciliation

The supplied production patch was reconciled line-by-line against the current canonical
worktree. Result: **the implementation is already present in production code** — it was
promoted in the earlier Safe PWA production promotion and verified live at production SHA
`b559058753b9d0acc6a25438fdc0cf79122ce4af`.

| Patch file | State in canonical repository |
|---|---|
| `public/manifest.webmanifest`, `public/offline.html`, `public/sw-update.js` | identical |
| `src/components/{offline-banner,pwa-update-prompt,install-banner,ios-install-guide,assessment-offline-guard,public-layout}.tsx` | identical |
| `src/lib/pwa/{register-sw,assessment-activity}.ts` | identical |
| `src/lib/__tests__/{pwa-safety,assessment-offline-gating}.test.ts` | identical |
| `src/routes/__root.tsx`, `src/routes/_authenticated/session.$sessionId.tsx`, `src/styles.css`, `vite.config.ts` | identical |
| `package.json` | `vite-plugin-pwa` present, pinned `1.3.0` (patch requested `^1.3.0`); installed and locked version is exactly `1.3.0` — behaviourally identical, and the pin is stricter |

1067 of 1068 added patch lines are byte-present in the worktree; the single difference is the
semver pin above. **No material divergence.** No unrelated change was introduced by this
promotion.

Note on SHAs: the promotion report itself certifies staging `a7f2528…`; the assignment header
names `60b586e22e70348f2e7fa56d18ce277d5d09b063` as the verified staging commit and `a7f2528…`
as rollback. Neither staging SHA exists in this repository (separate project history), so
equivalence was established by content reconciliation against the patch, which is the artifact
both SHAs are represented by.

## 2. Gate results

| Gate | Result |
|---|---|
| Worktree | clean before and after (documentation-only changes in this promotion) |
| Tests | **308 passing / 308, 27 files** (this repository's full inventory; the 317 figure is the staging project's suite, which carries staging-only tests) |
| PWA safety tests | 5/5 pass |
| Assessment offline gating tests | 3/3 pass |
| Typecheck | clean |
| Production build | success — `PWA v1.3.0`, `generateSW`, **241 precache entries (2889.29 KiB)** |
| Security scan | **0 critical, 0 error, 3 advisory warnings** (pre-existing, unrelated to PWA) |
| Production health | `/api/public/health` → HTTP 200 |

## 3. Service Worker and Cache Storage audit (built artifact `dist/client/sw.js`)

| Check | Result |
|---|---|
| Precache entries | 241, **0 disallowed** — only `assets/*` fingerprinted bundles, `icons/*.png`, `favicon.png`, `offline.html` |
| Private HTML / API / learner / assessment / answer / report / auth / payment entries | **0** |
| Navigation strategy | `NetworkOnly` (1 occurrence) with `precacheFallback → /offline.html`; **no** `createHandlerBoundToURL`, **no** `navigateFallback` route |
| Static strategy | `CacheFirst`, same-origin non-private `style|script|font|image` only |
| Background sync / answer queue | **absent** — 0 occurrences of `BackgroundSync`/`sync` handlers |
| Silent activation | **absent** — `clientsClaim()` 0 occurrences; exactly **1** `skipWaiting()`, reachable only through the `SKIP_WAITING` message from "Refresh now" |
| Offline submission blocking | enforced on all three answering surfaces (`free-check.$checkId`, `diagnostic.session.$token`, `_authenticated/session.$sessionId`) — `useAssessmentOnline()`, `AssessmentOfflineNotice`, submit `disabled` while offline |
| Update deferral during assessments | `PwaUpdatePrompt` suppressed while `useAssessmentActive()` is true |
| `?sw=off` emergency recovery | `shouldRegisterServiceWorker()` returns false and `unregisterServiceWorker()` runs, removing any `/sw.js` registration |
| Preview/iframe/dev safety | registration refused on dev, iframes and all Lovable preview hosts |

## 4. Limitations and unresolved risks

- Staging commits `60b586e…` / `a7f2528…` are not resolvable in this repository; equivalence is
  established by patch-content reconciliation, not by SHA comparison.
- Live Cache Storage inspection after real journeys was performed in the previous Safe PWA
  production verification; this promotion re-verified the built artifact, which is what
  determines cache contents.
- Compliance status is unchanged and unrelated: Class 10 Mathematics and Science remain
  `NOT_CERTIFIED` / `SOURCE_PENDING`.

## 5. Rollback

1. Fast path (no deploy needed): append `?sw=off` — the worker unregisters itself for that client.
2. Fleet path: replace `public/sw.js` output with the kill-switch worker at the same path,
   publish, and let returning browsers evict the registration on next visit.
3. Repository path: `git revert <this commit>` reverts documentation only. To remove the PWA layer
   entirely, revert the commit range that introduced it (equivalent to staging rollback reference
   `a7f2528031374c245f8b6f16550e0ba2a1f150ce`) and republish.
