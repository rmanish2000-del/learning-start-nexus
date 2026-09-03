# EduOS — Figma Latest-Design Reconciliation and Implementation Handoff

**Mode:** Figma latest-design reconciliation · **Deployment:** NOT PERFORMED (documentation only)
**Production reference:** https://www.eduos.global
**Date:** 2026-09-03

## 1. Verdict

**PARTIAL — blocked on design source.** The connected Figma workspace does not contain the
"complete latest EduOS design system and all designed screens" this assignment assumes.
A definitive implementation package covering public, auth, pilot invitation, parent, learner,
diagnostic, report, gap plan, AI Tutor, reassessment, admin and reviewer experiences **cannot be
produced from the currently connected file**, and no part of it has been estimated or invented.

## 2. Figma access evidence (reproducible)

| Probe | Result |
| --- | --- |
| `get_metadata` on page `0:1` | Returns exactly one responsive set `0:3` ("/", 1408×1244) containing one frame `0:4` ("Desktop", 1280×1080) whose only child is a `code-instance` `0:7` ("Code") |
| `get_variable_defs` on `0:4` | `{}` — zero published variables; no colour, type, spacing or radius tokens exist to extract |
| `get_design_context` on `0:4` | `Resource not found for the given URI` (Figma Make code instance, not extractable) |
| `get_screenshot` on `0:4` | Tool currently unavailable from the desktop connector |
| Connector state | `Figma` ready; `figma local` reporting an error (Settings → Connectors) |

Consequences:
- No design tokens, fonts, spacing scale, component variants, icon set or assets can be read.
- No tablet or mobile frames exist (single 1280×1080 desktop frame).
- Coverage is approximately **1 of 60 production routes** (the public landing page only), and even
  that one frame is not machine-readable in its current form.

## 3. Route-to-frame manifest (60 routes)

Status legend as specified: MATCH / MISSING_IN_PRODUCTION / OUTDATED_IN_PRODUCTION /
FUNCTIONAL_CONFLICT / DESIGN_NOT_AVAILABLE.

### 3.1 Public and authentication
| Route | Figma frame | Status |
| --- | --- | --- |
| `/` | `0:3` → `0:4` (Desktop 1280×1080) | DESIGN_NOT_AVAILABLE (frame exists but is an unreadable code instance; the previously implemented Recommendation-B refinement remains the production truth) |
| `/about`, `/contact`, `/privacy`, `/terms` | none | DESIGN_NOT_AVAILABLE |
| `/auth` | none | DESIGN_NOT_AVAILABLE |
| `/[.]lovable/oauth/consent` | none | DESIGN_NOT_AVAILABLE |

### 3.2 Parent, purchase and pilot invitation
| Route | Status |
| --- | --- |
| `/parent`, `/upgrade/$token`, `/diagnostic`, `/diagnostic/checkout/$orderRef`, `/diagnostic/handoff/$token` | DESIGN_NOT_AVAILABLE |
| Pilot invitation experience | DESIGN_NOT_AVAILABLE (no Figma frame; also no dedicated production route today — cannot be classified MISSING_IN_PRODUCTION without an approved design to compare against) |

### 3.3 Learner, diagnostic, report, gap plan, tutor, reassessment (pilot-critical)
| Route | Status |
| --- | --- |
| `/home`, `/free-check/$checkId`, `/diagnostic/session/$token`, `/diagnostic/complete/$token`, `/diagnostic/report/$token`, `/session/$sessionId`, `/assessment/$assessmentId`, `/gaps/$gapId`, `/tutor/$sessionId`, `/interventions`, `/outcome-proof`, `/quick-start`, `/help`, `/settings` | DESIGN_NOT_AVAILABLE |

### 3.4 Educator and admin
| Route | Status |
| --- | --- |
| `/dashboard`, `/learners`, `/learners/$learnerId`, `/assignments`, `/assessments`, `/assessment-builder`, `/assessment-blueprint`, `/question-bank`, `/diagnostic-engine`, `/gap-analysis`, `/curriculum`, `/admin`, `/payment-settings` | DESIGN_NOT_AVAILABLE |

### 3.5 Reviewer, SME and audit surfaces
| Route | Status |
| --- | --- |
| `/sme-review/`, `/sme-review/$subject`, `/verification`, `/assessment-verification`, `/rls-verification`, `/assessment-audit`, `/assessment-proof`, `/launch-audit`, `/pilot-evidence`, `/payment-audit`, `/ux-phase1-plan`, `/sprint-3-audit`, `/sprint-4-audit`, `/sprint-5-audit`, `*-audit` variants | DESIGN_NOT_AVAILABLE |

No route can currently be marked MATCH, OUTDATED_IN_PRODUCTION, MISSING_IN_PRODUCTION or
FUNCTIONAL_CONFLICT, because those judgements require an approved design to compare against and
none is readable.

## 4. Current production token and component truth (unchanged, authoritative until a design lands)

Source: `src/styles.css`, `components.json`.

- Typography: `Geist Variable` (sans), `Geist Mono Variable` (mono), letter-spacing `-0.01em` on body.
- Radius scale from `--radius: 0.625rem` (sm/md/lg/xl/2xl/3xl/4xl derived).
- Semantic OKLCH tokens for light and dark: background, foreground, card, popover, primary
  (evergreen `oklch(0.52 0.105 168)` light / `oklch(0.7 0.12 168)` dark), secondary, muted, accent,
  destructive, success, warning, border, input, ring, chart-1..5, sidebar-*.
- Marketing-only ink surface: `--ink`, `--ink-raised`, `--ink-border`, `--ink-foreground`,
  `--ink-muted`, `--ink-accent`.
- A separate legacy PWA token block (`--pwa-*`) uses hex values and Outfit/Inter/DM Mono. **This is
  the one confirmed internal inconsistency** — it conflicts with the Geist + OKLCH system.
- Components: shadcn/ui "new-york", lucide icons, aliases per `components.json`.

## 5. Unified-system recommendation (the only design work safely actionable now)

Pending an approved Figma source, exactly one consolidation is evidence-backed:

1. Retire the `--pwa-*` hex/Outfit/Inter/DM Mono block and re-express the PWA install banner,
   update prompt, offline shell and connectivity toasts on the semantic OKLCH tokens
   (`--warning`, `--destructive`, `--success`, `--card`, `--border`) and the Geist stack.
2. Keep `public/offline.html` self-contained (it must render without the app bundle) but align its
   literal values to the same palette.
3. No other visual change is justified without design input.

This is a presentation-only refactor with no route, permission, data-ownership or CBSE-scope impact.
It has **not** been applied in this assignment (no implementation was authorised beyond the audit).

## 6. Preserved product truth (must survive any future design adoption)

- Current-year scope: CBSE 2026–27, Class 10 Mathematics and Science only.
- 210 approved+verified items (Mathematics 45, Science 165); 326 drafts remain `draft`/`unverified`.
- Both subjects remain NOT_CERTIFIED; the Science book remains unapproved.
- Role permissions, organisation isolation RLS, payment-credential service-role-only access,
  learner PIN login, parent/learner separation and the SME review workflow are functional truth and
  outrank any conflicting design.

## 7. What is required to complete this assignment

1. Publish the latest EduOS design as **native Figma frames** (not a Figma Make code instance) in
   the connected file, or share the file that contains them.
2. Publish **Figma variables** for colour, typography, spacing and radius so tokens are extractable.
3. Provide desktop / tablet / mobile frames per journey, prioritised: learner home → diagnostic →
   report → gap plan → AI Tutor → reassessment.
4. Fix the `figma local` connector error in Settings → Connectors so screenshots resolve.

On receipt, the audit can be completed per-frame with exact node references, copy, tokens,
component variants, assets, responsive and accessibility specifications.

## 8. Known limitations and unresolved conflicts

- Figma coverage ≈1 frame; no mobile/tablet source; zero variables; screenshot tool erroring.
- No assets or icons are exportable; `http://localhost:3845/...` asset URLs from the local connector
  are unusable in this environment and were not referenced anywhere.
- Accessibility requirements cannot be derived from a design that cannot be read; the production
  accessibility baseline (single H1, skip link, focus-visible rings, 44px targets, alt text) stands.
- Nothing was deployed; production remains on its current published artifact.
