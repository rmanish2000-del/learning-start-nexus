# EduOS Figma-to-Production Visual Parity Audit

Date: 2026-08-28 (UTC)
Type: Audit + non-production preview only. No application code changed, nothing deployed.

---

## 1. Connection evidence

| Item | Result |
|---|---|
| Figma Desktop MCP reachable | YES |
| `get_metadata` (0:1) | SUCCESS — returned full canvas tree |
| `get_screenshot` (0:4, 0:3) | SUCCESS — landing render captured |
| `get_design_context` (0:4, 0:7) | FAIL — "Resource not found for the given URI" |
| `get_variable_defs` (0:4) | SUCCESS but empty `{}` — no local variables published |
| File name / file ID | NOT EXPOSED by local MCP (limitation, not a blocker) |

**Consequence:** the active Figma document is a **Figma Make code instance** (`code-instance` node), not a native layer tree. The MCP server cannot return design context, exact tokens, text nodes, spacing or type metrics for it. All Figma-side values in this audit are therefore **read visually from the rendered screenshot**, and are marked `VISUAL_ESTIMATE` where exact values were unavailable. This is recorded as a handoff gap, not an audit failure.

## 2. Figma node inventory

| Node ID | Name | Type | Dimensions | Parent | Production mapping | Classification |
|---|---|---|---|---|---|---|
| 0:1 | Page 1 | canvas | — | — | — | container |
| 0:3 | `/` | responsive-set | 1408 × 1244 | 0:1 | `src/routes/index.tsx` | FINAL |
| 0:4 | Desktop | frame | 1280 × 1080 | 0:3 | `/` desktop | FINAL |
| 0:7 | Code | code-instance | 1280 × 1080 | 0:4 | whole landing render | FINAL (opaque) |

**FIGMA_NODE_COUNT: 4** (1 canvas, 1 responsive set, 1 frame, 1 code instance).

Discovery result for everything else requested:

- Tablet frame (768) — FIGMA_SOURCE_NOT_FOUND
- Mobile frame (390) — FIGMA_SOURCE_NOT_FOUND
- 1440 frame — FIGMA_SOURCE_NOT_FOUND (responsive set is 1408 wide; only child is the 1280 Desktop frame)
- Navigation states / mobile menu / interaction states — FIGMA_SOURCE_NOT_FOUND
- About frames, Contact frames — FIGMA_SOURCE_NOT_FOUND
- Components library, local styles, variables — FIGMA_SOURCE_NOT_FOUND (`get_variable_defs` = `{}`)

The Desktop frame is 1080px tall and the render is **clipped** below the start of the "THE PROBLEM" section. Sections 5–15 of the requested comparison list have **no visible Figma source**.

## 3. Production baseline

| Item | Value |
|---|---|
| Application HEAD | `a84cb548f5a0d3bf115514d2ff7f2f153bc1cca0` (docs-only advance over the previously verified `54f78cd1…`) |
| Production URL | https://www.eduos.global — HTTP 200 |
| Published HEAD SHA | NOT EXPOSED by the deployment (no build-SHA endpoint) |
| Test baseline | Re-run this session: **97/97 passed, 11 files** |
| Worktree | clean before audit; this audit adds documentation + evidence assets only |
| Landing sections rendered | hero, `#problem`, `#how`, `#parents`, `#centres`, `#schools`, `#evidence`, `#pricing`, `#faq`, `#demo`, footer |
| Tokens | primary `oklch(0.52 0.105 168)`, radius `0.625rem`, `max-w-6xl`, Geist / Geist Mono, section rhythm `py-14 sm:py-20` |

## 4. Matched screenshots

Evidence assets (`/mnt/documents/figma-parity/`):

- `prod_390.png`, `prod_768.png`, `prod_1280.png`, `prod_1440.png` — production landing
- Figma: single 1280 × 1080 render captured via MCP (0:4) and the 1408 × 1244 responsive set (0:3)

| Viewport | Production | Figma | Status |
|---|---|---|---|
| 390 | captured | none | HANDOFF GAP |
| 768 | captured | none | HANDOFF GAP |
| 1280 | captured | captured | MATCHED |
| 1440 | captured | none (nearest: 1280 frame in a 1408 set) | HANDOFF GAP |

**VIEWPORTS_CAPTURED: production 4 / matched pairs 1.**

## 5. Section-by-section parity matrix

| # | Section | Figma | Production | Verdict |
|---|---|---|---|---|
| 1 | Navigation | Dark bar, orange square mark, "EduOS / OUTCOME SYSTEM" lockup, 4 links, Sign In, Book Demo, orange "Free Learning Check →" | Light bar, evergreen mark, same 4 links, EN/हिंदी switch, Sign In, Book Demo, evergreen CTA | Structurally matched; brand + language switch differ |
| 2 | Hero | Serif display, "Your child is working hard. *Is it working?*", blue italic accent, mono eyebrow pill, 2 CTAs, reassurance line, 3-up stat row | Sans display, "Find the learning gaps. Close them with purpose. Prove the progress.", pill eyebrow, 2 CTAs, reassurance line, **no stat row** | Composition matched; copy intentionally rewritten; stat row missing |
| 3 | Hero visual | Dark "student overview" card, progress bar, 3 subject rows with status chips, floating "Gap Closed — Verified" badge | Light bordered "Evidence chain" table + disclaimer | INTENTIONAL reuse + fidelity miss (no dark card, no progress bar, no floating badge) |
| 4 | Problem | Centred mono eyebrow, centred serif headline "The gap between effort and results", centred body | Left-aligned eyebrow + headline, 3 audience cards, footnote | Different treatment (centred vs left); production is richer |
| 5 | How EduOS Works | FIGMA_SOURCE_NOT_FOUND | 6-step card grid | Not comparable |
| 6 | Parent section | FIGMA_SOURCE_NOT_FOUND | `#parents` present | Not comparable |
| 7 | Learning Centre | FIGMA_SOURCE_NOT_FOUND | `#centres` present | Not comparable |
| 8 | School | FIGMA_SOURCE_NOT_FOUND | `#schools` present | Not comparable |
| 9 | Trust and evidence | FIGMA_SOURCE_NOT_FOUND | `#evidence` present | Not comparable |
| 10 | Pricing | FIGMA_SOURCE_NOT_FOUND | `#pricing` ₹199 / ₹2,999 | Not comparable |
| 11 | Free Learning Check | FIGMA_SOURCE_NOT_FOUND | CTA + route live | Not comparable |
| 12 | Institutional CTA | FIGMA_SOURCE_NOT_FOUND | `#demo` present | Not comparable |
| 13 | Footer | FIGMA_SOURCE_NOT_FOUND | present | Not comparable |
| 14 | About | FIGMA_SOURCE_NOT_FOUND | `/about` live | Not comparable |
| 15 | Contact | FIGMA_SOURCE_NOT_FOUND | `/contact` live | Not comparable |

**SECTIONS_COMPARED: 4 of 15** (11 have no Figma source).

## 6. Token comparison

| Token | Figma (VISUAL_ESTIMATE unless noted) | Production (exact) | Variance |
|---|---|---|---|
| Primary accent | orange ≈ `#F26322` | `oklch(0.52 0.105 168)` evergreen | INTENTIONAL_BRAND_SYSTEM_CHANGE |
| Secondary accent | desaturated blue ≈ `#7FB3E8` (hero italic) | none | UNRESOLVED_FOUNDER_DECISION |
| Page background | dark navy ≈ `#0E1621` | `oklch(0.99 0.003 250)` light | INTENTIONAL_BRAND_SYSTEM_CHANGE |
| Section background | alternating `#0E1621` / `#111C29` | `bg-background` / `bg-muted/40` | equivalent rhythm, inverted mode |
| Text | near-white on dark | `oklch(0.22 0.02 260)` on light | mode inversion |
| Muted text | ≈ `#93A4B3` | `oklch(0.53 0.02 260)` | equivalent role |
| Border | ≈ rgba(255,255,255,.08) | `oklch(0.9 0.008 260)` | equivalent role |
| Shadow | soft large drop under product card | subtle card border, minimal shadow | IMPLEMENTATION_FIDELITY_MISS |
| Gradient | none detected | none | match |
| Display font | high-contrast serif with true italic | Geist (sans) | INTENTIONAL_BRAND_SYSTEM_CHANGE |
| Label font | monospace, uppercase, wide tracking | Geist Mono, uppercase, wide tracking | match |
| H1 size | ≈ 52–56px / 1.05 | ~48–56px `tracking-tight` | approximate match |
| Body | ≈ 17px / 1.6 | ~16–17px / 1.65 | match |
| Eyebrow | ≈ 11–12px, ~0.14em tracking, pill | ~11px, wide tracking, pill | match |
| Spacing scale | 4/8 based | Tailwind 4px base | match |
| Max content width | ≈ 1152px inside 1280 frame | `max-w-6xl` (1152px) | match |
| Radius | pill CTAs ≈ 8px, cards ≈ 12–16px | `0.625rem` (10px) family | close |
| Button height | ≈ 44px | ~40–44px | match |
| Section padding | ≈ 80–96px vertical | `py-14 sm:py-20` (56/80px) | minor fidelity gap on desktop |
| Field dimensions | FIGMA_SOURCE_NOT_FOUND | shadcn defaults | not comparable |

Exact Figma values could not be pulled because the node is a code instance; see limitations.

## 7. Copy comparison

| Slot | Figma | Production | Classification |
|---|---|---|---|
| Nav lockup | "EduOS / OUTCOME SYSTEM" | "EduOS" | IMPLEMENTATION_FIDELITY_MISS (minor, optional) |
| Nav links | For Parents / For Centres / For Schools / About | identical | match |
| Nav CTAs | Sign In · Book Demo · Free Learning Check → | Sign In · Book Demo · Free Learning Check (+ EN/हिंदी) | production superset |
| Eyebrow | LEARNING OUTCOME SYSTEM | Learning Intelligence & Intervention | approved rewrite |
| H1 | "Your child is working hard. *Is it working?*" | "Find the learning gaps. Close them with purpose. Prove the progress." | approved Program Director rewrite |
| Sub | "…gives you verified proof of real improvement." | "…uses fresh reassessment to provide evidence of demonstrated progress." | INTENTIONAL_PRODUCT_TRUTH_CHANGE (removes proof/guarantee framing) |
| CTAs | Start a Free Learning Check → · Book a Centre Demo | identical | match |
| Reassurance | "No credit card. No commitment. Results in 20 minutes." | "CBSE Class 10 Mathematics and Science. No credit card required for the free check." | INTENTIONAL_PRODUCT_TRUTH_CHANGE (20-minute claim removed, scope added) |
| Stat row | "< 20 min / 6-step / 100% verified before gap closes" | absent | mixed: "100%" and "<20 min" are unsupported claims (correctly dropped); the *row itself* is an IMPLEMENTATION_FIDELITY_MISS |
| Product card | "Amara Osei · Grade 7", Setswana, English, Mathematics, "57% closure", "Gap Closed — Verified" | "Evidence chain" abstract table + "Example layout only" disclaimer | INTENTIONAL_PRODUCT_TRUTH_CHANGE (Grade 7, Setswana, English, fabricated learner and stats are all out of scope) |
| Problem headline | "The gap between effort and results" | "Marks describe the result. They rarely explain the cause." | approved rewrite |
| Problem body | "Hard work is not the same as measurable improvement…" | 3 audience cards + footnote | production expansion |
| Pricing | not shown in Figma | ₹199 diagnostic / ₹2,999 annual | production-only, correct |
| Language switch | not in Figma | EN / हिंदी | production-only, keep |

Content in Figma that must stay excluded: Setswana, Grade 7, English as a subject, named fictional learner with invented percentages, "verified proof of real improvement", "100%", "results in 20 minutes".

## 8. Intentional differences

**INTENTIONAL_PRODUCT_TRUTH_CHANGES: 5**
1. Setswana / English subjects → CBSE Mathematics and Science only.
2. Grade 7 learner → CBSE Class 10 scope.
3. Named learner "Amara Osei" with invented stats → abstract, disclaimered evidence chain.
4. "verified proof of real improvement" / "100%" → evidence-of-progress language.
5. "Results in 20 minutes" → scope + no-credit-card reassurance.

Recommendation for all five: **KEEP_PRODUCTION**.

**INTENTIONAL_BRAND_CHANGES: 3**
1. Orange accent → evergreen `oklch(0.52 0.105 168)`.
2. Serif display + blue italic → Geist.
3. Dark marketing canvas → light canvas with theme toggle.

Recommendation: KEEP_PRODUCTION for 1 and 3 unless the founder decides otherwise; 2 is a REQUIRES_FOUNDER_DECISION item (display typeface).

**PRODUCTION_COMPONENT_REUSE: 4** — shadcn button, card, badge and separator primitives replace the Figma prototype's bespoke chips, pills and card shells. Recommendation: **KEEP_PRODUCTION** (accessibility, theming, maintenance).

## 9. Implementation fidelity misses

| # | Miss | Impact | Recommendation |
|---|---|---|---|
| 1 | Hero stat row absent (three compact proof metrics under a rule) | Medium — hero loses a credibility beat | ADAPT_FIGMA_TO_PRODUCTION_SYSTEM (use ₹199 / 6-step / ₹2,999, no invented claims) |
| 2 | Hero product visual is a flat table, not a dark elevated dashboard card | High — the strongest visual in the design is missing | ADAPT_FIGMA_TO_PRODUCTION_SYSTEM |
| 3 | No progress bar / status chips in the hero visual | Medium | ADAPT_FIGMA_TO_PRODUCTION_SYSTEM |
| 4 | No floating "verified" callout badge overlapping the card | Low–medium | ADAPT (must read "illustrative", not "verified outcome") |
| 5 | No elevation/shadow language anywhere on the marketing page | Medium — page reads flat | ADAPT |
| 6 | Desktop section padding shorter than Figma (80px vs ~96px) | Low | ADAPT |
| 7 | Problem section centred in Figma, left-aligned in production | Low | KEEP_PRODUCTION (consistent with rest of page) |
| 8 | Nav lockup missing the "OUTCOME SYSTEM" descender line | Low | REQUIRES_FOUNDER_DECISION |
| 9 | No display/italic typographic accent in any headline | Medium — hero lacks focal contrast | REQUIRES_FOUNDER_DECISION |
| 10 | No mobile/tablet Figma reference to validate against | — | Handoff gap, not a code miss |

**IMPLEMENTATION_FIDELITY_MISSES: 9** (10 is a handoff gap).

## 10. Founder decisions required

1. **Public accent colour** — keep evergreen, or adopt the Figma orange for marketing pages only?
2. **Display typography** — keep Geist everywhere, or introduce a serif display face for marketing headlines?
3. **Marketing canvas mode** — keep light-first with toggle, or make marketing dark-first as in Figma?
4. **Does editorial styling apply to marketing only** (portals stay evergreen/Geist), or platform-wide?
5. **Nav lockup** — add the "OUTCOME SYSTEM" descender line?

**FOUNDER_DECISIONS_REQUIRED: 5**

## 11. Option A previews — production brand refinement

Assets: `preview_A_desktop.png`, `preview_A_mobile.png`.

Keeps evergreen, Geist/Geist Mono, shadcn, light canvas, current routes and copy guardrails. Adopts from Figma: split hero composition, mono eyebrow pill, dark elevated product card with progress bar and status chips, hero stat row (₹199 / 6-step / ₹2,999), rule-separated hero footer, softer card elevation.

## 12. Option B previews — Figma visual identity

Assets: `preview_B_desktop.png`, `preview_B_mobile.png`.

Adopts the Figma dark canvas, orange accent, serif display with blue italic accent, mono labels and card treatments — while holding India/INR, CBSE Class 10 Mathematics and Science, disclaimered illustrative data, and current routes. Authenticated surfaces are untouched.

Both previews are **static, non-production renders**. No route, component or token in the application was modified.

## 13. Recommended final direction

**Recommendation: B — refine the production design toward Figma while retaining evergreen and Geist** (i.e. ship Option A).

- **Visual impact:** high; misses 1–6 are where the page currently reads flat, and all are compositional rather than chromatic.
- **Brand coherence:** evergreen is already carried across portals, emails and the published domain; switching the public accent to orange fragments the identity for a design source that covers only the hero.
- **Implementation effort:** ~1 focused sprint on `src/routes/index.tsx` and marketing components; no schema, no server, no i18n keys beyond the new stat labels.
- **Accessibility:** contrast stays on the audited light theme; the dark hero card is a single controlled surface.
- **Performance:** no webfont added (Option C would add a serif family and dark-mode image work).
- **Portal isolation:** zero — changes stay in the public marketing route.
- **Maintenance:** shadcn primitives retained.
- **Regression risk:** low; presentation-only, 97/97 tests unaffected.

Adopting the full Figma identity (C) is not advisable on this evidence base: the Figma source covers roughly one and a half sections of a fifteen-section site, has no mobile frames, no variables, and its content is built on out-of-scope product claims.

## 14. Implementation effort and risk

| Item | Effort | Risk |
|---|---|---|
| Hero dark product card + chips + progress bar | M | Low |
| Hero stat row | S | Low |
| Elevation/shadow tokens | S | Low |
| Section padding tuning | S | Low |
| Optional serif display face | M | Medium (perf + brand decision) |
| Full dark marketing canvas | L | Medium (contrast re-audit, image assets) |

## 15. Known limitations

1. Figma file name and file ID are not exposed by the desktop MCP server.
2. The active node is a **Figma Make code instance**; `get_design_context` returns "Resource not found", so no exact spacing, colour, or type metrics could be extracted. All Figma token values here are visual estimates.
3. `get_variable_defs` returned `{}` — no published variables or styles.
4. Only one frame exists (1280 × 1080) and its render is clipped; 11 of 15 requested sections have no Figma source.
5. No mobile (390), tablet (768) or 1440 Figma frames exist — matched-viewport comparison was possible at 1280 only.
6. The published deployment does not expose a commit SHA, so production HEAD could not be compared byte-for-byte with application HEAD.
