# EduOS — Design-System Audit and Production Convergence

**Mode:** Lovable, design-system audit and production convergence
**Approved source:** Figma package (checksum-verified) in `design/figma/`
**Date:** 2026-09-03

## 1. Package provenance (verified)

| File | SHA-256 | Status |
| --- | --- | --- |
| `eduos-design-tokens.json` | `5624f28cbff0095913d45d478ac2092d97e96e3917bf00b28e8c9b3bfba6a8b7` | MATCH |
| `eduos-route-manifest.md` | `8ba22979a4fcd0226b1340ac94acde0bf293b6c13751ff3350b9bbd4281bf38f` | MATCH |
| `eduos-component-manifest.md` | `91ae79a4adb322da447d24bff1f32369638f3dc408bb2cf4315c2f4e9d01399f` | MATCH |

Validated counts: **104 token definitions** (27 global + 77 semantic, W3C `$value` format),
**20 routes**, **67 component headings**. The component manifest prose says "54 across 14
categories"; the heading count of 67 is the reproducible figure and is treated as canonical.
Copies and `SHA256SUMS.txt` are committed under `design/figma/`.

## 2. What was implemented

1. **Single code-level token source.** `src/styles.css` was rebuilt as three layers:
   literal `--eds-*` global primitives from the package → semantic colour / typography /
   spacing / radius / shadow / motion / breakpoint / z-index variables → shadcn runtime
   variables mapped onto the semantic layer. Every shadcn component therefore inherits the
   approved system without per-component rewrites.
2. **Approved brand applied.** Primary `#F97316`, deep navy `#0C1628` ink surface, page
   background `#F8F9FB`. Verified live: `--primary` resolves to `#f97316`, body background
   `rgb(248,249,251)`.
3. **Fonts.** Outfit (display), Inter (body), Playfair Display (marketing hero only),
   DM Mono (data/handles/timestamps), loaded via `<link>` in `src/routes/__root.tsx`.
   Verified live: body `Inter`, `h1` `Outfit`. Obsolete Geist font packages removed.
4. **Legacy PWA design system retired.** The parallel `--pwa-*` hex/Outfit/Inter/DM-Mono
   block is gone from the app. `assessment-offline-guard`, `install-banner`,
   `offline-banner`, `pwa-update-prompt` and `ios-install-guide` now use `--eds-*` tokens.
   `public/offline.html` stays deliberately self-contained (it must render without the app
   bundle) but its literal values were aligned to the approved palette.
5. **Auth brand panel corrected.** The full-bleed orange panel on `/auth` was re-expressed on
   the approved ink (deep navy) surface with orange reserved for CTA/accent, matching the
   package rule that orange is an action colour, not a page ground.
6. **No duplicate components created.** Existing shadcn/app components were upgraded through
   the token layer only.

## 3. Route reconciliation (20 package routes → production)

The package uses its own path vocabulary. Per requirement 8 (preserve routes, permissions and
product truth), **production paths are unchanged**; the mapping below is the canonical
equivalence used for the visual audit.

| # | Package route | Production route | Status |
| --- | --- | --- | --- |
| 1 | `/` | `/` | MATCH (tokens + fonts applied) |
| 2 | `/sign-in` | `/auth` | MATCH (path preserved) |
| 3 | `/sign-in` Google path | `/auth` Google state | MATCH |
| 4 | `/invite/:token` | `/upgrade/$token` | FUNCTIONAL_CONFLICT — production has no separate pilot-invite landing; existing entitlement flow preserved |
| 5 | `/invite/:token/create-account` | `/auth?tab=parent` | FUNCTIONAL_CONFLICT — same reason |
| 6 | `/onboarding` | `/quick-start` | MATCH (equivalent surface) |
| 7 | `/onboarding/add-learner` | `/parent` add-learner flow | MATCH |
| 8 | `/learner/sign-in` | `/auth` student tab | MATCH |
| 9 | `/learner/dashboard` | `/home` | MATCH |
| 10 | `/learner/study-plan` | `/gaps/$gapId`, `/interventions` | MATCH |
| 11 | `/learner/tutor` | `/tutor/$sessionId` | MATCH |
| 12 | `/learner/reassessment` | `/assessment/$assessmentId` | MATCH |
| 13 | `/dashboard` (parent) | `/parent` | MATCH |
| 14 | `/dashboard/diagnostic` | `/diagnostic`, `/diagnostic/session/$token` | MATCH |
| 15 | `/dashboard/diagnostic/report` | `/diagnostic/report/$token` | MATCH |
| 16 | `/admin/pilots` | `/admin` | MATCH |
| 17 | `/diagnostic/session` multi-part scoring | `/session/$sessionId` | MATCH (scoring logic untouched) |
| 18 | `/diagnostic/session` math input | `/session/$sessionId` | MATCH |
| 19 | `/auth/reset` | `/auth` reset state | MATCH |
| 20 | `/sme/review` | `/sme-review/$subject` | MATCH |

Reconciles across all 20 routes: 18 MATCH, 2 FUNCTIONAL_CONFLICT (pilot invitation, where no
production route exists and inventing one would change access control).

## 4. Preserved product truth

Routes, role routing, RLS, scoring, payments, entitlements, learner ownership, CBSE Class 10
2026–27 Mathematics/Science scope and the English-only UI are unchanged. No business logic,
migration or permission was touched in this convergence.

## 5. Verification

- Vitest: **339/339 passed** (29 files), including RLS and payment-webhook suites.
- Typecheck (`tsgo --noEmit`): clean.
- Live browser checks: `/`, `/auth` (light + dark), `/diagnostic`, `/about`, `/contact`
  at 1280px and 390px — no console errors introduced; token values resolve to the approved
  palette; dark theme renders on the approved navy ground.
- No `--pwa-*` reference remains in `src/`; only the intentionally standalone
  `public/offline.html` keeps local variables, with approved values.

## 6. Limitations and residual risk

- The package supplies no complete dark-theme token set; the dark theme is derived from the
  package's navy and state hues and is an interpretation, not an approved artifact.
- Authenticated learner/educator/admin screens were verified at token level rather than by a
  full signed-in browser walkthrough in this pass.
- Native Figma still exposes only one non-truth landing frame; the downloadable package
  remains the approved source.
- Pilot-invitation designs (package routes 4–5) have no production counterpart and were not
  invented.

## 7. Rollback

Revert the design-system commit (`src/styles.css`, `src/routes/__root.tsx`, the five PWA
components, `src/routes/auth.tsx`, `public/offline.html`, `package.json`) and redeploy. No
database migration is involved, so rollback is presentation-only and carries no data risk.

## 8. Production closeout (2026-09-03)

- Canonical commit: `470e4d13a4521e67dafeef4ccd1ffbc72aef702e`; worktree clean.
- Production republished from this SHA; `https://www.eduos.global` health `{"status":"ok","environment":"production"}`.
- Live evidence: served CSS `--eds-orange-500:#f97316`, zero `--pwa-*` occurrences, body `Inter`,
  page ground `rgb(248,249,251)`, `--primary` `#f97316`, Outfit/Inter/Playfair/DM Mono font links present.
- Package reconciles: 104 token definitions, 20 routes, 67 component headings (SHA256SUMS verified OK).
- Route probes: `/`, `/diagnostic`, `/about`, `/contact`, `/api/public/health`, `/robots.txt`,
  `/sitemap.xml` → 200; `/auth` → 307; `/home`, `/parent`, `/sme-review/mathematics` → 302 to `/auth`.
- Desktop 1280 / tablet 768 / mobile 375 walkthrough of 8 routes: 0 console errors at every viewport.
- Gates: Vitest 339/339, `tsgo --noEmit` clean, build clean, security scan 0 critical / 0 error
  (3 pre-existing advisory warnings), no secret exposure.
- No scoring, auth, entitlement, payment, RLS or learner-ownership change in this release.
- Pilot-invite routes 4 and 5 remain FUNCTIONAL_CONFLICT and are reserved for the incoming
  pilot-access + Google-login promotion.
- Rollback: revert the design-system commits (presentation-only, no migration) and republish.
