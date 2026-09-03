# EduOS Elite UI/UX Audit

**Scope:** UI/UX quality only — visual and information hierarchy, design system, responsiveness, accessibility, dashboard clarity, and premium-SaaS finish.
**Method:** Direct inspection and measurement of the React implementation at `4fc20ca` (46 routes, 45 UI primitives, `src/styles.css` token set). All figures below are counted from source, not estimated.
**Out of scope by instruction:** redesign proposals, architecture, curriculum.

### Input availability

| Input | Status |
|---|---|
| Current implementation in repository | ✅ Available — primary basis for this audit |
| `UX_AUDIT_PACKAGE.pdf` | ❌ Not present in this environment |
| `EDUOS_UI_UX_90_ROADMAP.md` | ❌ Not present |
| `EDUOS_UX_PHASE1_IMPLEMENTATION_PLAN.md` | ❌ Not present |
| Grok Buyer Review | ❌ Not provided |

Four of five inputs could not be located anywhere in the repository or environment (only `docs/EDUOS_UX_AUDIT.md`, this session's earlier journey audit, exists). **This audit is therefore derived entirely from the implementation itself.** That is the authoritative source for every dimension requested — nothing in the findings below depends on the missing documents. What is *not* covered without them: alignment against the 90-day roadmap's sequencing, whether Phase-1 plan items were delivered as specified, and reconciliation with the buyer's stated objections. Supply those four and I will produce a delta pass.

---

## 1. Verdict — what prevents 9/10

**Current: 6.0 / 10.** EduOS is a competent, coherent, information-dense admin application. It is not a premium product, and the gap is not subtle craft — it is four structural properties that every benchmark product has and EduOS does not.

| # | Blocker | Evidence | Benchmark contrast |
|---|---|---|---|
| 1 | **No primary action anywhere** | `dashboard.tsx` contains **0 `<Button>` elements**. Across the app: 156 `variant="outline"`, 42 `secondary`, 27 `ghost`. The onboarding checklist — the product's own "what to do next" device — renders CTAs as `variant="outline" size="sm"` (`onboarding-checklist.tsx:118,122`). | Linear/Stripe: exactly one filled primary per view. |
| 2 | **The app is set in 12px** | Of 1,221 type-size declarations: **477 `text-xs`, 388 `text-sm`, 86 arbitrary `text-[10px]`/`text-[11px]`** — 78% at ≤14px. Only 173 `text-base`. | Stripe/Notion body copy is 15–16px. |
| 3 | **Not designed for phones** | **122 total breakpoint prefixes across 46 routes** (~2.6/route). 23 pages render `<Table>` with 302 columns and **0 mobile fallbacks**. No button size reaches 44px (`default: h-9`=36px, `sm: h-8`=32px; 92 uses of `sm`). | Duolingo/Khan are phone-first with ≥48dp targets. |
| 4 | **Design system is declared, not enforced** | `--success`/`--warning` are defined (`styles.css:83-84`) and used **0 times**; 146 hardcoded `emerald-*`/`amber-*` utilities bypass them. Tokens cover colour + radius only — **no type scale, no spacing scale, no elevation or motion tokens**. 6 different page container widths. | Linear's system is the only way to build a screen. |

Fixing these four moves EduOS to roughly 8.5. The last 0.5 is the polish tier in §4 (P2).

### Dimension scores

| Dimension | Score | One-line reason |
|---|---|---|
| 1. Visual hierarchy | 4/10 | No primary CTA; everything is outline-weight and 12px |
| 2. Information hierarchy | 6/10 | Sensible grouping, but rank↔size unenforced (20 `<h1>`, 38 `<h2>`, 3 `<h3>`) |
| 3. Cognitive load | 5/10 | Admin sidebar = 30 items; educator = 13; dense tables default |
| 4. Dashboard clarity | 4/10 | Inert stat tiles, zero buttons, no "needs attention" focus |
| 5. Parent trust signals | 5/10 | Consent flow now solid; educator identity masked, no freshness stamp |
| 6. Student motivation | 4/10 | Celebration fires only for a setup checklist, never for achievement |
| 7. Educator efficiency | 5/10 | No hover affordances, no bulk actions, no keyboard surface |
| 8. Mobile UX | 3/10 | Sub-44px targets, table-only data, 122 breakpoints total |
| 9. Design system consistency | 5/10 | Good foundation, systematically bypassed |
| 10. Premium SaaS quality | 4/10 | **0 hover states** on any authenticated page; persistent "Demo" bar |

---

## 2. P0 — Must fix

### P0-1 · No primary action exists in the product

**Current issue.** `dashboard.tsx` renders **zero `<Button>` elements** — the educator's home screen offers only three text `<Link>`s. App-wide there are 156 `variant="outline"`, 42 `secondary`, 27 `ghost` buttons. The onboarding checklist styles its CTAs `variant="outline" size="sm"` (`onboarding-checklist.tsx:118,122`), so even the designated next-step control is tertiary weight at 32px tall.

**Why it matters.** Visual hierarchy is created by contrast, not position. When every control has identical weight, the eye has no entry point and the interface reads as a report to be surveyed rather than a tool to be operated. This is the mechanical cause of the "doesn't drive users to the next action" symptom — the product *says* what to do next in prose while giving that instruction the least visual authority on screen.

**Recommended fix.** Establish and enforce a one-primary-per-view rule: the checklist's active step, "Add learner", "Assign", "Start", and "Record consent" become filled `default` buttons at `default` size; demote sibling actions to outline/ghost. Add a filled primary to the educator dashboard tied to the top needs-attention item.

**Business impact.** Directly suppresses activation and time-to-first-value in demos — a buyer clicking through sees no obvious next step and reads the product as unfinished. This is the finding most likely behind a "feels like an internal tool" objection.

**User impact.** Educators scan and hesitate on every screen; students miss the one thing they were meant to do; parents complete consent only because the checklist scrolls them to it.

---

### P0-2 · The interface is set in 12px

**Current issue.** Measured across `routes/` and `components/`: 477 `text-xs` (12px), 388 `text-sm` (14px), 173 `text-base` (16px), 56 `text-[11px]`, 30 `text-[10px]`, plus `text-[0.8rem]`. 78% of all type is ≤14px, and 86 declarations sit off any scale. There are no typography tokens in `styles.css` — only `--font-sans`/`--font-mono`.

**Why it matters.** Type size is the strongest single signal of product tier. Stripe and Notion set body copy at 15–16px with deliberate hierarchy; dense 12px greys read as a legacy admin console regardless of how good the layout is. Combined with `--muted-foreground` at 5.13:1 (AA, but at the floor), 11px muted text is near the edge of comfortable reading — and this is a product used by 11-year-olds and by parents on phones.

**Recommended fix.** Define a type scale as tokens (e.g. display/title/body/label/caption) and bind each to a rank. Promote default body copy from `text-xs` to `text-sm`/`text-base`, reserve `text-xs` for genuine metadata, and eliminate the 86 arbitrary `text-[10px]`/`text-[11px]` uses.

**Business impact.** The cheapest single change with the largest perceived-quality delta; affects every screenshot in every sales conversation.

**User impact.** Reduces reading strain for parents on phones and students; makes scanning a roster materially faster for educators.

---

### P0-3 · Data views are unusable on a phone

**Current issue.** 23 authenticated pages render `<Table>`, totalling **302 columns**, with **zero mobile card-stack fallbacks** (no `md:hidden`/`hidden md:table` pattern anywhere). The whole app uses **122 responsive breakpoint prefixes** (63 `sm:`, 36 `md:`, 23 `lg:`) across 46 routes. Tables scroll horizontally inside `overflow-auto` — including tables containing interactive `Select` dropdowns (`admin.tsx`, `assignments.tsx`).

**Why it matters.** Parents and students are overwhelmingly phone users; educators check rosters between sessions on a phone. A 7-column table in a horizontal scroll container is the single worst mobile data pattern, and it is EduOS's only data pattern. Khan Academy and Duolingo treat the phone as the primary canvas; EduOS treats it as a viewport that must not crash.

**Recommended fix.** Introduce one responsive list primitive — table at `md+`, stacked cards below — and route the roster, staff, sessions, item-bank, and assignment views through it. Prioritise the five tables in daily use over the 18 in audit surfaces.

**Business impact.** Mobile is where parent retention and student habit are won or lost; a buyer opening EduOS on a phone during evaluation currently sees the weakest version of the product.

**User impact.** Parents cannot read progress on the device they actually use; students on tablets fight horizontal scroll during assessments.

---

### P0-4 · No touch target in the system meets minimum size

**Current issue.** `components/ui/button.tsx:21-24` defines every size below the accessibility floor: `default: h-9` (36px), `sm: h-8` (32px), `lg: h-10` (40px), `icon: h-9 w-9` (36px). `size="sm"` is used **92 times**. Additional sub-minimum interactive heights appear as `h-7` (28px, 10 uses) and `h-6` (6 uses) — including the assessment question-navigator grid students tap most.

**Why it matters.** The iOS 44pt / Android 48dp minimum is not a guideline for polish; below it, mis-taps rise sharply — worst for children and for anyone with a motor impairment. This is Fitts's Law applied to the product's youngest users on its most-used screen.

**Recommended fix.** Raise the size scale (`default` → 40px with ≥44px on coarse pointers, `sm` → 36px minimum) or add hit-slop via `after:absolute after:-inset-*` on coarse-pointer media, as `ui/sidebar.tsx` already does for rails. Fix the question navigator explicitly.

**Business impact.** A concrete, testable accessibility failure that appears in any procurement accessibility review, and a visible defect in any child-facing demo.

**User impact.** Students mis-tap during timed assessments; every role loses precision on mobile.

---

### P0-5 · The design system is bypassed wherever it matters

**Current issue.** `--success` and `--warning` are defined (`styles.css:83-84`) and referenced **zero times** in application code. Instead there are **146 hardcoded palette utilities** — 57 `text-emerald`, 40 `text-amber`, 17 `bg-emerald`, 17 `bg-amber`, 9 `border-amber`, 6 `border-emerald`. Measured against the light background, the hardcoded values used for status **fail WCAG AA**: `emerald-500` 2.47:1, `amber-500` 2.09:1, `amber-600` 3.10:1. The tokens they bypass also fail as body text (`--success` 3.93:1, `--warning` 3.12:1). In dark mode `--border` sits at roughly 1.3:1 — below the 3:1 required for UI boundaries, leaving inputs effectively borderless.

**Why it matters.** Every status signal in the product — mastery, risk, pass/fail, consent state — is drawn with an unthemeable, sub-AA colour. The system cannot be re-themed, cannot be corrected centrally, and is failing contrast in the exact places meaning is encoded. This is why the earlier token-level contrast defect went unnoticed: nothing consumes the tokens.

**Recommended fix.** Correct `--success`/`--warning` to ≥4.5:1 on light, then migrate the 146 hardcoded utilities onto the semantic tokens. Raise dark `--border`/`--input` to meet 3:1.

**Business impact.** Blocks any credible accessibility statement (VPAT/WCAG), which is a gating item for school and district procurement.

**User impact.** Low-vision users cannot reliably distinguish "on track" from "needs attention" — the product's core signal.

---

## 3. P1 — Should fix

### P1-1 · The educator dashboard is a report, not a cockpit

**Current issue.** Three sections — *Intervention outcomes*, *Roster*, *Recent evidence* (`dashboard.tsx:239,284,338`). Stat tiles are inert `<p>` values with no links; ~21 discrete elements sit above the fold; there is no needs-attention queue and, per P0-1, no button.

**Why it matters.** A dashboard's job is triage: what changed, what is at risk, what do I do. EduOS's answers what happened. Linear's inbox and Stripe's home both lead with actionable state.

**Recommended fix.** Make the stat tiles links to their filtered views, and lead the page with a compact needs-attention list (open gaps, ready diagnostics, completed interventions awaiting reassessment, missing consent) — each row carrying a single primary action.

**Business impact.** The dashboard is the first authenticated screen in every demo; it currently sets a "passive reporting" frame for the whole product.

**User impact.** Educators must self-organise across 13 nav items to work out where to start each morning.

---

### P1-2 · Nothing responds to the cursor

**Current issue.** A search for `hover:` affordances (background, border, shadow, translate) across every authenticated page returns **zero matches**. Roster rows, learner rows, assessment cards and stat tiles are visually inert. App-wide there are only 21 `transition-colors` uses, and elevation is applied ad hoc (10 `shadow-sm`, 10 `shadow-lg`, 7 `shadow-md`, 3 `shadow-2xl`) with no elevation tokens.

**Why it matters.** Hover and elevation are how an interface signals "this is interactive." Their complete absence is a large part of why the product feels static next to Linear or Notion, where every row lifts, highlights, or reveals an action on hover.

**Recommended fix.** Add one hover treatment for list rows and one for cards, driven by tokens; introduce a 3-step elevation scale and use it consistently.

**Business impact.** Cheap, broad lift in perceived quality — this is the difference buyers describe as "polish" without being able to name it.

**User impact.** Users cannot tell what is clickable without trial clicks.

---

### P1-3 · Page width changes as you navigate

**Current issue.** Authenticated pages use **six different container widths** — 30× `max-w-5xl`, 18× `max-w-2xl`, 9× `max-w-6xl`, 7× `max-w-3xl`, 6× `max-w-4xl`, plus `max-w-md/lg/xl/sm` — and four pages (`assessments`, `assignments`, `assessment.$assessmentId`, `launch-audit`) have no container at all and run full-bleed. Vertical rhythm is equally unsettled: 107 `space-y-1`, 69 `space-y-3`, 66 `space-y-2`, 65 `space-y-4`, 37 `space-y-6`.

**Why it matters.** A shifting content column on every navigation reads as instability. Premium products hold one measure so that only the content changes.

**Recommended fix.** Adopt a single content width for workspace pages (with a documented narrow variant for focused/reading views), apply it in the shell rather than per page, and standardise on a small set of spacing steps as tokens.

**Business impact.** Removes a persistent low-grade "assembled from parts" impression during click-throughs.

**User impact.** Reduces re-orientation cost on every navigation.

---

### P1-4 · Dynamic feedback is invisible to assistive technology

**Current issue.** **`aria-live` appears 0 times** in the entire application; `aria-pressed` 0; `aria-invalid` 1; `aria-describedby` 1. There is **no skip-to-content link** in `app-shell.tsx` or `__root.tsx`, so keyboard users tab through up to 30 sidebar items on every page load. Heading structure is inverted — 20 `<h1>` and 38 `<h2>` with only 3 `<h3>`, and the shell renders its own `<h1>` on every page, producing duplicates. Focus rings are inconsistent (8 primitives at `ring-1`, 9 at `ring-2`); a 1px ring against a 1.3:1 dark border is effectively invisible. There is **zero `prefers-reduced-motion` handling** despite 66+ animation and transition uses, including full-viewport confetti.

**Why it matters.** Autosave status, tutor replies, probe results and toast outcomes are announced to no one. Combined with the P0-5 contrast failures, EduOS cannot currently pass an accessibility review — a hard gate in education procurement, where accessibility conformance is frequently contractual.

**Recommended fix.** Add a skip link; wrap autosave/tutor/probe status in polite live regions; mark invalid fields with `aria-invalid` and bind messages via `aria-describedby`; normalise focus rings to a single visible treatment; add a `prefers-reduced-motion` guard covering confetti and dialog animation; enforce one `<h1>` per page.

**Business impact.** Removes a category of deal-blocking objection and legal exposure in public-sector sales.

**User impact.** Screen-reader and keyboard users cannot confirm their work saved; motion-sensitive users get unavoidable full-screen animation.

---

### P1-5 · Reward is attached to setup, not achievement

**Current issue.** `Celebration` is triggered from exactly one place — `onboarding-checklist.tsx:136`, on completing the *setup checklist*. Submitting an assessment produces a toast and a `Trophy` icon; finishing tutor practice produces nothing. Progress is presented as three overlapping representations (a stat tile, a line chart, an outcomes list), and help copy promises a "mastery ring" that does not exist in the codebase.

**Why it matters.** Duolingo and Khan Academy attach reinforcement to the moment of effort. EduOS rewards administrative completion and stays silent at the two moments a learner has actually earned something — inverting the motivational contract.

**Recommended fix.** Move celebration to assessment submission and tutor-session completion, frame scores in encouraging language, and consolidate to one progress representation. Either build the promised mastery ring or correct the three copy strings that describe it.

**Business impact.** Student engagement and repeat usage are the retention story sold to tutoring centres; this is the mechanism that story depends on.

**User impact.** Students receive no acknowledgement at exactly the moments that would sustain effort.

---

### P1-6 · Parent trust signals are incomplete

**Current issue.** The consent experience is now genuinely strong — terms shown, identity displayed, withdrawal available, history labelled and attributed. Around it, trust cues are missing: the educator's name is deliberately masked (`app-shell.tsx:200` renders the literal string `"Your child's educator"`), there are **no data-freshness indicators anywhere in the app** (0 "last updated"/"as of" strings across all routes), assessment rows are titled generically, and a persistent `DemoContextBar` (`app-shell.tsx:204`) stamps a "Demo" pill above the parent portal on every visit.

**Why it matters.** Parents extend trust based on provenance: who is teaching my child, how current is this number, what exactly was assessed. A "Demo" badge over a legally-consented child-data view actively withdraws it.

**Recommended fix.** Show the assigned educator's name; add a timestamp to progress surfaces; use real assessment titles; role-gate or remove the demo bar in production.

**Business impact.** Parent-facing trust is the differentiator tutoring centres resell; a demo watermark is a visible credibility defect in front of the buyer's own customers.

**User impact.** Parents cannot tell whether a figure is current or who to talk to about it.

---

### P1-7 · Choice load is front-loaded, especially for admins

**Current issue.** Measured from `app-shell.tsx`: admins see **30 nav items** (12 workspace + 16 system + 2 support) — 53% of it internal QA tooling; reviewers see 23; educators 13 in one flat list mixing daily work with one-time setup. Students (4) and parents (3) are correctly scoped.

**Why it matters.** Hick's Law: decision time scales with option count. The two roles that drive purchase and daily retention face the highest choice cost, and internal build artefacts outnumber product surfaces in the admin's sidebar.

**Recommended fix.** Group the educator's ten items into task-named clusters separating daily work from setup, and collapse the 16 audit entries behind a single grouped entry for admins.

**Business impact.** An admin sidebar dominated by "Sprint 3 Audit", "Sprint 4 Audit", "Build Proof" reads as unfinished engineering scaffolding to a buyer.

**User impact.** Educators re-scan a flat list to find routine actions; admins hunt product features among QA pages.

---

## 4. P2 — Nice to have

| # | Issue | Fix | Impact |
|---|---|---|---|
| P2-1 | Empty-state inconsistency: the `EmptyState` component is imported by only **2 pages**, against **27 bare `<p>No …</p>`** text empties | Route all empties through the component with an action | Business: consistency signal. User: knows what to do when a view is blank |
| P2-2 | Loading is skeleton-first (78 `<Skeleton>` vs 8 spinners) but coverage is partial — sections pop in individually | Extend skeletons to cover remaining sections | Business: perceived speed. User: less layout shift |
| P2-3 | No elevation, motion, or easing tokens; shadows applied ad hoc across 6 values | Add a 3-step elevation scale and 2 duration/easing tokens | Business: coherence. User: consistent depth cues |
| P2-4 | Theme toggle is binary (`theme-toggle.tsx:15`), permanently discarding the "system" preference the provider supports | Make it tri-state | Business: table-stakes parity. User: OS preference respected |
| P2-5 | Icon vocabulary is ambiguous — `ShieldCheck` used 3×, `Crosshair` 3×, `ClipboardCheck` 3× across unrelated destinations | One icon per concept | Business: scanability. User: faster nav recognition |
| P2-6 | Onboarding copy conflicts (dashboard says "Four steps", quick-start says "Five") and describes a non-existent "mastery ring" | Reconcile copy to implementation | Business: credibility. User: instructions match reality |
| P2-7 | Persistent chrome — header + `DemoContextBar` — consumes two rows above content on every page including phones | Role-gate the context bar | Business: professionalism. User: more content above fold |
| P2-8 | No keyboard surface: no shortcuts, no command palette, despite `ui/command.tsx` being vendored and unused | Wire ⌘K to navigation | Business: parity with Linear/Notion for power users. User: faster educator navigation |

---

## 5. Benchmark summary

| Product | What they hold that EduOS does not |
|---|---|
| **Linear** | One filled primary per view; enforced token system; hover state on every row; ⌘K everywhere |
| **Stripe** | 15–16px body copy; a single content measure held across the entire dashboard; semantic status colours that pass contrast |
| **Notion** | Consistent interactive affordances; restrained type scale with genuine rank hierarchy |
| **Anthropic** | Generous spacing and reading-optimised measure; calm neutral palette used deliberately |
| **Duolingo** | Reward attached to effort, not setup; phone-first targets ≥48dp |
| **Khan Academy** | Progress framed in learner-comprehensible language; mobile-first data presentation |

EduOS's foundation is genuinely sound — self-hosted Geist, an OKLCH palette, correct dark-mode bootstrapping with no FOUC, 45 vendored primitives, and skeleton-first loading. The gap to 9/10 is not missing infrastructure. It is that the system is **declared but not enforced**, and that the interface never tells the user where to look or what to press.

---

## 6. Recommended sequence

| Order | Work | Why first |
|---|---|---|
| 1 | P0-1 primary CTA + P0-2 type scale | Highest perceived-quality gain per unit effort; both are largely mechanical |
| 2 | P0-5 token enforcement + contrast | Unblocks accessibility claims; prerequisite for any re-theming |
| 3 | P0-4 touch targets | One change in `button.tsx` plus the question navigator |
| 4 | P0-3 responsive list primitive | Largest effort; one primitive fixes the five tables that matter |
| 5 | P1-1, P1-2, P1-3 | Dashboard, hover, layout consistency — the "premium" tier |
| 6 | P1-4 accessibility completion | Procurement gate |
| 7 | P1-5, P1-6, P1-7 then P2 | Motivation, trust, choice load, polish |

---

*Audit produced by inspection of the repository at commit `4fc20ca`. Every quantitative claim is reproducible with `grep`/`rg` over `src/`; contrast ratios computed from `styles.css` token values in OKLCH converted to sRGB, validated against a white/black anchor at 21.00:1.*
