# EduOS UX Audit Report

**Scope:** Full repository review of the EduOS learning-intelligence platform (TanStack Start + Supabase).
**Lens:** Senior Product Design / UX Architecture.
**Journeys reviewed:** Educator · Parent · Student · Reviewer (plus Admin, which gates the Parent journey).
**Date:** 2026-08-25 · **No code was modified for this audit.**

---

## 1. Executive summary

EduOS has a genuinely strong first-run experience and a weak everything-after. The onboarding layer — role-scoped checklists with live-derived completion, guided tours, context help, quick-start guides — is the best-designed system in the product. But once onboarding completes, **every journey terminates in dead ends**:

- The educator's authoring chain (Curriculum → Blueprint → Question Bank → Builder → Diagnostic Engine) has **zero forward links** — every step tells you in prose where to go next and never links there.
- The student's two highest-motivation moments — finishing an assessment and practicing with the AI tutor — end with, respectively, a single "Back to My Learning" button and **no exit at all** (`tutor.$sessionId.tsx` has no back link, no finish action, and is unreachable from nav).
- The parent portal has exactly one action (record consent); after that it becomes a **fully static page with zero interactive elements** and nothing that pulls a parent back.
- The reviewer lands on one narrow audit slice with 16 undifferentiated sidebar entries, and the "acceptance checklists" that anchor each audit page are **hardcoded to always render green** — prose styled as evidence.

**Verdict on the core question — does the application naturally drive users toward the next action?**
**Only during onboarding.** The product invests heavily in telling users what to do *first* and almost nothing in telling them what to do *next*. The operating loop the product itself describes (diagnose → detect gap → intervene → tutor → reassess → prove lift) is never expressed as connected navigation; it exists only in help text.

Severity counts: **10 P0 · 14 P1 · 10 P2** (detailed in §6).

---

## 2. Journey findings

### 2.1 Educator journey

**Screens:** Dashboard, Learners (+ profile with 8 tabs), Assessments (self-labelled "Legacy"), Curriculum, Blueprint, Question Bank, Assessment Builder, Diagnostic Engine, Gap Analysis, Interventions, plus Settings/Help/Quick Start.

**What works**
- Dashboard onboarding checklist with live `done` derivation (`dashboard.tsx:147-180`) and ContextHelp "what do I do next" popovers.
- Curriculum upload → "Extract its curriculum next" toast → auto-navigate to review tab (`curriculum.tsx:147,167`) — the only genuine hand-off in the app.
- Gap Analysis has the app's best error handling (inline destructive card, `gap-analysis.tsx:549-555`) and its only empty state that links onward (`:490-495`).
- Diagnostic Engine's progressively-disabled cascade selects are correct progressive disclosure.

**What breaks**
- **The authoring chain is five sidebar-only islands.** Builder says "Import a book on the Curriculum page" with no link (`assessment-builder.tsx:306`); Question Bank says "build them in the blueprint first" with no link (`question-bank.tsx:723`); Builder says built assessments "appear on the Assessments page" with no link (`:732`). Nothing anywhere links *to* `/assessment-builder`, `/question-bank`, `/assessment-blueprint`, or `/diagnostic-engine`.
- **Three competing assessment-creation paths** (Legacy Assessments, Builder, Diagnostic Engine) with no guidance on which to use — and the "Legacy" page is the *only* place to assign an assessment, and the checklist's step-2 target.
- **Blueprint's book selector is permanently `disabled`** (`assessment-blueprint.tsx:658`) — a populated dropdown that can never be opened; books switch only via hand-editing `?book=`.
- Assessment Builder is 7 numbered steps and ~40 interactive elements on one unbroken page; the Build button sits ~2000px down with no sticky action bar and a 4-clause silent disable condition (same pattern on Diagnostic Engine's Generate, `diagnostic-engine.tsx:567-578`).
- The learner profile's 8 tabs are local state (not URL-synced), un-deep-linkable, and overflow off-screen on phones (`ui/tabs.tsx:15` has no wrap/scroll).
- Empty states describe the next action in prose but never link it (7 instances on the learner profile alone).
- Destructive actions fire without confirmation: question delete (`question-bank.tsx:434-444`), intervention cancel (`interventions.tsx:288-295`), learner status change (`learners.$learnerId.tsx:947-961`).
- Validation is toast-only everywhere; the Question Bank form's five `<Label>`s have no `htmlFor` and its prompt field is never validated client-side.
- The dashboard links educators to `/sprint-5-audit` (`dashboard.tsx:244-249`) — internal QA tooling the nav model deliberately hides from them — and **no audit route has a role guard**, so all 16 are URL-reachable by educators and students.
- Jargon throughout: "diagnostic weight", "largest remainder", "Bloom level", `MTH-6-…` codes, and the builder literally advertising "No auto-assign · no auto-generation · no auto-grading".

### 2.2 Student journey

**Flow:** handle+PIN login → `/home` → assessment player (`/session/$sessionId`) or AI tutor (`/tutor/$sessionId`) → progress panels on `/home`.

**What works**
- The assessment player is the best-built screen in the app: numbered jump grid with three visual states, progress bar keyed to *answered* count, debounced autosave with force-flush on submit, a resume banner, and a well-written submit confirmation that counts unanswered questions.
- Student login failure copy is age-appropriate ("Check with your educator if you forgot them") — better than the staff path, which leaks raw Supabase errors.
- The tutor's UI collapses its 7-button palette to a single answer input when a question is pending — good reduction of choice at the moment of thinking.
- Students see a disciplined 4-link nav.

**What breaks**
- **The tutor is a hard dead end**: no back link, no "finish session" action (nothing ever sets `tutor_sessions.status` away from `active`), no nav entry — leave the page and there is no way back to the session.
- **No AI timeout**: `tutor.server.ts:61-82` calls `generateText` with no `AbortSignal`; a hung upstream leaves a child on "Thinking…" forever with every control disabled.
- The assessment result screen offers only "Back to My Learning" — no celebration (confetti is reserved for the *setup checklist*, an inverted reward), no score framing, no link to practice the outcomes just missed.
- Autosave failure is a transient toast with no retry and no persistent banner; the "All answers saved" chip never resets, so it can read "saved" while a save is failing.
- Login defaults to the **Staff** tab though students are the highest-volume role; PIN is a masked plain input (the vendored `input-otp` component is unused); errors are toasts, not inline.
- The `/home` page stacks up to nine sections with three overlapping progress representations and two differently-named "what to work on" lists; three sections *disappear entirely* when empty, so a new student sees none of what onboarding just promised.
- Touch targets: question-jump buttons are 28px (`h-7 w-7`), most student CTAs are `size="sm"` (32px) — under the 44px/48dp guideline on the screens most used on phones.
- Essentially no ARIA on student screens: MCQ options are bare buttons with no radiogroup/checked state; no `aria-live` on autosave status, counters, or tutor replies; 56-piece confetti with no `prefers-reduced-motion` guard.
- Adult vocabulary in child-facing chrome ("Socratic companion", "mastery lift", "baseline", a "Library" badge leaking implementation detail) — while the tutor's *generated* output is explicitly constrained to age-appropriate language.
- Help copy promises a "mastery ring" three times; the component is a line chart. No ring exists.

### 2.3 Parent journey

**What works**
- The pre-consent funnel is well built: a 2-step checklist, a scroll-to-consent CTA, and a clear primary action.
- The data model supports multiple children.

**What breaks**
- **Parents cannot be provisioned in-product.** The role enums in `schemas.ts:20-29` exclude `parent` from both create and edit; no code anywhere writes `parent_learner_links`. The only parent in existence was hand-seeded in a SQL migration. The parent empty state says "Ask your tutoring center's admin to link your child" — an instruction **no admin screen can fulfil**. Both ends of the journey are broken.
- **After consent, the portal has zero CTAs.** The form unmounts, the checklist self-completes, and every subsequent visit is a static read-only report. Nothing is clickable — no assessment names, no drill-downs, no "how to help at home".
- **Errors render as reassuring zeros**: all four progress sub-queries swallow failures via `?? []` (`parent.tsx:128-133`), so an RLS denial shows a confident "0%" and "No assessments assigned yet"; a failed links query shows "No linked children yet".
- **No educator communication channel** — and the educator's name is actively masked from parents (`app-shell.tsx:199-201` renders the literal string "Your child's educator"), while the help text advises "Talk to the educator".
- **Consent is one-way**: the DB grants parents INSERT only; there is no revoke, no consent document to read, and the form silently submits the parent's name/email without displaying them.
- Assessment rows show only "Assessment submitted — 62%" with no subject or title; raw enum values surface as "Needs_attention"; "+7 lift" appears with no explanation.
- Parents get no Settings (so no profile, no org contact info), an empty labelled "System" group in their sidebar, silent redirects with no explanation when they follow any deep link, and a logo that links to `/dashboard` — a page they are bounced straight back out of.
- **Rendering bug:** `parent.tsx` (and `assignments.tsx`) wrap their content in a second `<AppShell>` inside the layout's shell — two sidebars, two headers, nested `SidebarProvider`s with shadowed context, doubled padding.

### 2.4 Reviewer journey (and the audit surface)

**What works**
- A real, first-class role with a 23-path allowlist, including read-only access to six *product* surfaces so claims can be cross-checked against the real UI — a genuinely good pairing.
- Probe suites, RLS tables, and the Launch Audit's checks are **live-computed** (real `pg_policies` reads, real HTTP fetches of `/privacy` etc., real manifest/icon verification). Audit pages are `noindex` and printable.

**What breaks**
- **The acceptance checklists are hardcoded green.** Nine audit pages declare `CHECKLIST` arrays whose type has no pass/fail field and render an unconditional emerald `CheckCircle2` per item. On pages whose premise is "verify, don't trust", a checklist that can never turn red is a credibility risk — a reviewer will read it as a passing test suite.
- **Probes are opt-in; the fake-green state is the default.** Until "Run probe suite" is pressed, the only verdict visible is the hardcoded checklist. The default view should be the honest one.
- 16 flat sidebar entries with near-indistinguishable names, ordered by internal sprint number, with icons reused up to 3× across unrelated items. Reviewers get no landing index, no suggested order, no roll-up of overall pass/fail. Their home is `/launch-audit` — one narrow slice.
- Admins inherit all 16 entries: a 28-item sidebar where internal QA tooling is 57% of the navigation.
- ~25% of the authenticated app's code is copy-pasted audit surface (`ProbeCard`, `CountRow`, checklist blocks duplicated across 9 files; `audit-shared.tsx` is 53 lines against ~4,300 lines of near-duplicate route code), producing visible design drift (different paddings, container widths from `max-w-3xl` to none at all, `launch-audit.tsx` double-padded and full-bleed).

### 2.5 Admin journey (gates the parent journey)

- Staff creation hands back a **one-time plaintext temp password** with no invite email, no reset action, and — since the app has no change-password screen — no way to comply with its own "change it after signing in" advice. Close the dialog without copying and the account is locked out permanently.
- **Role change is a one-click, unconfirmed, destructive delete-then-insert**; unknown roles (including `parent` and `reviewer`) display as "Student", so an admin "fixing" one would silently wipe the real role.
- No delete/deactivate for staff; no edit/archive for learners; no search/filter/pagination (silent truncation at 1000); no empty state at all; `isError` never read — a failed staff query renders an empty table.
- The stat tiles are inert (none link anywhere), the staff-count tile disagrees with the table below it, and the admin page never surfaces the two things an admin most needs: learners without an educator and learners without consent on file.
- Staff can self-certify guardian consent from the learner profile with no record of who recorded it.

---

## 3. Cross-cutting evaluation

### Navigation architecture
Role-filtered single sidebar (`app-shell.tsx`) with three groups (Workspace / Support / System). Students and parents are well-scoped (≤4 links). Educators get 10 flat Workspace items mixing daily work with one-time setup. Admins get 28. The logo hard-links to `/dashboard` for every role — the universal "go home" affordance works only by accident (via guard redirects) for students and never perceptibly for parents. No breadcrumbs anywhere; wayfinding is a regex-derived 14px header title.

### Information architecture
Nominally 2 levels deep, but tabs hide real depth: the learner profile is effectively 11 screens (3 stat cards + 8 tabs), none deep-linkable. IA vocabulary is system-first ("Blueprint", "Diagnostic Engine", "Gap Analysis"), not task-first. The audit surface is organized by engineering chronology (sprint numbers), meaningless to its audience. Two onboarding surfaces disagree (dashboard checklist: "Four steps"; quick start: "Five steps", different lists).

### Cognitive load
Worst offenders: Assessment Builder (7 steps, ~40 controls, no gating), the 28-item admin sidebar, the student home's nine stacked sections, the tutor's 7 equally-weighted action buttons, Gap Analysis' 7-column table with stacked cell values. First login can stack three interruption layers (How-It-Works modal at 600ms, guided tour at 900ms, then celebration) — serialized by a mutex, but never reduced.

### Responsiveness / Mobile / Tablet / Desktop
- **Mobile:** sidebar correctly collapses to a Sheet; tables scroll in containers; grids have breakpoints; inputs avoid iOS zoom. But: `TabsList` neither wraps nor scrolls (8 learner-profile tabs overflow the viewport); dialogs lack `max-h`/scroll except one; the guided tour hardcodes a 320px tooltip whose clamp math places it **off-screen at 320px viewports**, and its sidebar step targets an element not rendered on mobile; `useIsMobile` returns `false` pre-effect, flashing desktop chrome; touch targets run 28–36px; the admin card header has no `flex-wrap` and collides below ~380px.
- **Tablet:** the auth page's buyer-oriented brand panel shows to students in landscape; 6–7-column tables become long horizontal scrolls.
- **Desktop:** container widths vary per page (`max-w-2xl` → `max-w-5xl` → none); `launch-audit` is full-bleed and double-padded while its siblings cap at 1024px.

### Accessibility
- **No skip-to-content link**; keyboard users tab through up to 28 sidebar links per page.
- Three hand-rolled modals (guided tour, celebration, how-it-works) have `role="dialog"` but no focus trap, no focus restore, and (tour, celebration) no `aria-modal`/label — while a fully accessible Radix `Dialog` sits vendored and unused for them.
- **Zero `prefers-reduced-motion` handling** repo-wide; 56-piece full-viewport confetti unguarded.
- No `aria-live` anywhere it matters: autosave status, probe results, tutor replies.
- Duplicate `<h1>` on 7 pages (shell header + page title); the visually primary heading is an `<h2>` on 9 others.
- Form labeling is inconsistent: exemplary on `auth.tsx`, absent on Question Bank (5 unassociated labels), missing entirely on the learner focus-note input; icon-only buttons without accessible names (curriculum outcome edit/delete, admin copy-password).
- Color/contrast: `--success` (3.93:1) and `--warning` (3.12:1) fail AA in light mode — and are **used zero times** anyway, bypassed by 156 hardcoded `emerald`/`amber` utility classes; dark-mode borders sit at ~1.3:1 against the 3:1 non-text requirement; `text-primary-foreground/60` on the auth hero lands near 2.5:1; a DB-supplied hex renders band badges with no contrast guarantee.

### Empty states
A good `EmptyState` component exists and is used on exactly three screens. Everywhere else: one-line grey text, prose that names the next action without linking it, sections that silently unmount when empty (student home), or nothing at all (admin). Filtered-empty states never offer "clear filters".

### Error states
**The largest systemic hole.** Almost every `useQuery` destructures only `data`/`isPending`. Failures render as empty states ("No learners yet"), zeros (parent portal), or blank sections (student home) — indistinguishable from "no data". Learner-profile errors throw `notFound()`, telling educators a learner doesn't exist on a transient network failure. Mutation errors surface raw server/Postgres strings in toasts, including to children. Gap Analysis is the lone counter-example worth generalizing.

### Form design
Validation is server-side Zod + toast, never inline; failing fields are never marked (`aria-invalid` appears nowhere in app forms); disabled submit buttons never explain why (create-assessment needs a 3-char title, consent needs 7 digits — both silent). PINs are typed and displayed in plaintext by staff. The builder silently discards invalid time limits. The vendored `form.tsx` (react-hook-form wiring) is never used.

### Dashboard design
The educator dashboard reads as a report, not a cockpit: stat cards are inert, the roster is a table, no "needs attention" queue, no primary CTA (checklist buttons are `variant="outline"`, so nothing on the page is visually primary), and its one prominent link sends educators to internal QA tooling. The admin dashboard has the same inert-tiles problem. The parent "dashboard" is a terminal leaf.

### Typography / Color / Layout hierarchy
Solid foundation: Geist Variable self-hosted, OKLCH token palette with an evergreen primary, a derived radius ramp, correct dark mode with FOUC-blocking script. Undermined by: heading-rank chaos (three sizes for the same rank), pervasive 11–12px descriptive text at the muted-contrast floor, semantic-color tokens defined-but-never-used, per-file container widths, and five different `space-y` values for the identical card stack. The theme toggle destroys the "system" preference irrecoverably; no toggle exists on public/auth pages; `theme-color` has no dark variant.

### CTA placement
Primary actions are mostly top-right where they exist, but: the builder's Build button is below seven steps with no sticky bar; Gap Analysis' one forward action is a text link buried in muted body copy; the parent portal's only action is below the fold; the assessment result's only CTA points backwards; error/404 pages hand-roll buttons that drop the focus ring and route signed-out users into a redirect chain ending at a login wall.

### UX-law scorecard

| Law | Verdict | Evidence |
|---|---|---|
| **Hick's Law** | ✗ | 28-item admin nav; 16 undifferentiated audit links; 7-button tutor palette; 3 competing assessment-creation paths |
| **Fitts's Law** | ✗ | 28px jump-grid targets; 32px `sm` buttons across student CTAs; primary Build action ~2000px from its inputs |
| **Jakob's Law** | ~ | Familiar sidebar/shadcn patterns (good); but logo-home broken per role, a permanently disabled select, tabs that don't deep-link, and toasts where inline errors are expected |
| **Miller's Law** | ✗ | 10 flat educator items; 8-tab learner profile; 9-section student home; 7-column tables with stacked values |
| **Progressive disclosure** | ~ | Done well in cascade selects and the tutor's answer-mode swap; inverted on audit pages (honest probes hidden behind a click, fake-green checklist shown by default) and absent in the 7-step single-page builder |

---

## 4. Does the app drive the next action?

**During onboarding: yes — the strongest system in the product.** Checklists derive completion from live data, block steps with named reasons, and deep-link their CTAs.

**After onboarding: no.** The moments that should chain never do:

| Moment | What happens | What should happen |
|---|---|---|
| Educator finishes authoring step N | Prose names step N+1, no link | Hand-off link/CTA (as Curriculum already does) |
| Assessment built | "appears on the Assessments page" (no link) | "Assign to learners →" |
| Gap analysis read | Text link buried in muted copy | Primary "Plan interventions →" |
| Intervention completed | Nothing | "Assign reassessment →" (the loop's whole point) |
| Student submits assessment | "Back to My Learning" | Celebrate, frame score, "Practice what you missed →" |
| Student in tutor | No exit, no completion | Finish action updating plan progress, return home |
| Parent records consent | Page becomes static forever | Digest, drill-downs, "how to help", contact educator |
| Reviewer lands | One narrow audit slice, 16 flat links | Roll-up scoreboard → drill into failures |
| Checklist hits 4/4 | Card persists at 4/4 forever | Swap to a "needs attention" queue |

---

## 5. Ideal navigation models

### 5.1 Educator — "Today, then the loop"

Collapse 10 flat items to 5 task-named groups; move authoring behind one entry; make the operating loop the nav's spine.

```
┌────────────────────────────────────────────────────────────────┐
│ EduOS                       Learner profile          [E] [👤] │
├──────────────┬─────────────────────────────────────────────────┤
│ ▸ Today      │  TODAY                                          │
│ ▸ Learners   │  ┌───────────────────────────────────────────┐  │
│ ▸ Assess     │  │ NEEDS ATTENTION (4)                       │  │
│   · Assign   │  │ ⚠ Priya — 3 open gaps    [Plan help →]    │  │
│   · Results  │  │ ⚠ Diagnostic ready       [Assign →]       │  │
│   · Create   │  │ ⚠ Intervention done      [Reassess →]     │  │
│ ▸ Insights   │  │ ⚠ 2 learners no consent  [Request →]      │  │
│   · Gaps     │  └───────────────────────────────────────────┘  │
│   · Interv.  │  ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│ ▸ Library    │  │ Mastery ▲  │ │ Sessions   │ │ Active     │   │
│   · Books    │  │ +7 this wk │ │ 12 this wk │ │ plans: 5   │   │
│   · Outcomes │  └────────────┘ └────────────┘ └────────────┘   │
│   · Questions│                                                 │
│ ──────────── │  ROSTER (6 of 24)              [All learners →] │
│ Help         │  …                                              │
│ Settings     │                                                 │
└──────────────┴─────────────────────────────────────────────────┘
```

- **Today** replaces Dashboard: a needs-attention queue computed from open gaps, ready diagnostics, completed interventions, and missing consent — each row a one-click CTA. This is what closes the loop the current dashboard leaves open.
- **Assess** unifies the three creation paths: *Create* becomes a single wizard (book → outcomes → questions → publish) replacing Builder + Blueprint-picking + Diagnostic Engine as separate destinations; *Assign* absorbs the "Legacy" page's one real job; *Results* absorbs sessions.
- **Library** groups Curriculum / Blueprint / Question Bank as reference material — visited occasionally, not competing with daily work.
- Every wizard step ends with a forward CTA; the final step is "Assign to learners".
- Learner profile: 8 tabs → 4 URL-synced tabs (Overview · Plan · Assessments · Settings), with Gaps/Evidence/Outcomes folded into Overview and Plan.

### 5.2 Student — "One thing next"

Mobile-first bottom tab bar; a single "Up next" card as the home hero; the tutor becomes a resumable destination.

```
┌──────────────────────────────┐   Assessment player (focus mode)
│  Hi Aarav 👋        [🔥 3]   │  ┌──────────────────────────────┐
│                              │  │ ← Exit   Q 4/12   ●●●●○○ 33% │
│  ┌────────────────────────┐  │  │                              │
│  │ UP NEXT                │  │  │   What is 3/4 of 20?         │
│  │ Fractions check-in     │  │  │   ┌────────┐  ┌────────┐     │
│  │ 12 questions · ~15 min │  │  │   │   12   │  │   15   │     │
│  │      [ Start ▶ ]       │  │  │   └────────┘  └────────┘     │
│  └────────────────────────┘  │  │   (targets ≥ 44px)           │
│                              │  │                              │
│  Keep practicing             │  │  [← Back]   ✓ Saved  [Next →]│
│  · Fractions with Tutor  ▶   │  └──────────────────────────────┘
│  · Decimals review       ▶   │
│                              │   Result screen
│  My progress          ▓▓▓░   │  ┌──────────────────────────────┐
│                              │  │   🎉 You scored 8/12!        │
├──────────────────────────────┤  │   Fractions are growing 🌱   │
│  🏠 Home   ⚡ Practice  📈 Me │  │ [Practice what I missed ▶]   │
└──────────────────────────────┘  │ [ Back home ]                │
                                  └──────────────────────────────┘
```

- **Home** shows exactly one primary "Up next" card (assessment, or the top plan item), then a short "keep practicing" list. Collapse the current nine sections into three: Up next · Practice · Progress.
- **Practice** tab lists tutor sessions — resumable, with visible progress toward a real goal (not an interaction counter) and a "Finish session" action that updates the plan.
- **Result screen** celebrates (confetti belongs here, not on the setup checklist), frames the score in kid language, and routes forward to tutor practice on missed outcomes.
- Login: Student tab default, six-box `input-otp` PIN with reveal, inline errors.

### 5.3 Parent — "What changed, what to do"

```
┌────────────────────────────────────────────────┐
│ EduOS          My Children             [👤]    │
├────────────────────────────────────────────────┤
│  [ Aarav ✓ ]  [ Meera ⚠ consent ]              │  ← switcher with
│                                                │    status dots
│  SINCE YOUR LAST VISIT                         │
│  · Fractions check-in — 82%  [See details →]   │
│  · New support plan started  [What's this? →]  │
│                                                │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Mastery  │ │ This wk  │ │ Support plans  │  │
│  │ 74% ↑    │ │ 3 done   │ │ 1 active       │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
│                                                │
│  HOW TO HELP AT HOME                           │
│  Aarav is working on equivalent fractions —    │
│  try cooking measurements together.            │
│                                                │
│  [ ✉ Message Ms. Rivera ]   [ Settings ]       │
└────────────────────────────────────────────────┘
```

- Nav: **Overview · Progress · Messages · Settings** (parents currently get no Settings at all).
- Labelled child switcher with per-child status dots (consent needed, new results) — currently unlabelled color-only buttons.
- "Since your last visit" digest gives repeat visits a reason to exist; every row drills down (assessment names, subjects — currently "Assessment submitted — 62%").
- Named educator + message affordance (the name is currently masked); "How to help at home" translates interventions into parent action.
- Consent: readable document, checkbox, visible identity fields, and a revoke path.
- **Prerequisite:** admin UI to create parent accounts and link children — the journey currently cannot begin.

### 5.4 Reviewer — "Scoreboard, then evidence"

```
┌───────────────────────────────────────────────────────────────┐
│ EduOS Audit Center              reviewer@… · read-only        │
├──────────────┬────────────────────────────────────────────────┤
│ ▸ Overview   │  AUDIT OVERVIEW          [Run all probes ⟳]    │
│ ▸ Isolation  │  ┌──────────────────────────────────────────┐  │
│   & security │  │ Isolation & security   ✓ 41/41 probes    │  │
│ ▸ Content    │  │ Content pipeline       ✓ 28/28           │  │
│   pipeline   │  │ Assessment & scoring   ✗ 33/34  [view →] │  │
│ ▸ Assessment │  │ Launch & compliance    ✓ 12/12           │  │
│   & scoring  │  └──────────────────────────────────────────┘  │
│ ▸ Launch &   │  Probes auto-run on load. Grey = not yet run.  │
│   compliance │  Nothing on this page is hardcoded.            │
│ ──────────── │                                                │
│ Product      │  CROSS-CHECK IN THE PRODUCT (read-only)        │
│ (read-only)  │  Curriculum → Blueprint → Question bank → …    │
└──────────────┴────────────────────────────────────────────────┘
```

- One sidebar entry ("Audit Center") replacing 16; inside, four concern-named groups (not sprint numbers — keep sprint IDs as subtitles for traceability). Admin sidebar drops from 28 to ~12 items, reaching audits via a link on `/admin`.
- Reviewer home = a roll-up scoreboard; probes auto-run (or show an explicit grey "not yet run" state). **Checklists either bind to real probe results or lose their checkmarks** and become neutral "verify by hand" instructions.
- The existing read-only product access is kept and surfaced as the "cross-check" panel.

---

## 6. Recommendations

### P0 — Critical (broken journeys, trust, safety)

1. **Make the parent journey possible**: allow the `parent` role in admin create/edit (`schemas.ts:20-29`) and build the link-child flow writing `parent_learner_links`. The portal's own empty state currently instructs an impossible action.
2. **Fix the double `AppShell`** on `/parent` and `/assignments` (nested sidebars/headers, shadowed sidebar context).
3. **Guard the audit routes** — add role checks to all 16 (currently URL-open to every role) and remove the educator dashboard's link to `/sprint-5-audit`.
4. **Remove plaintext demo credentials** from the login page (`auth.tsx:233-255`) — admin/educator/reviewer passwords ship to every visitor, including children.
5. **Stop rendering failures as data**: read `isError` on every query; replace `?? []` swallowing on `/parent` and `/home`; distinguish network errors from `notFound` on the learner profile; add an error card pattern (generalize Gap Analysis').
6. **Un-dead-end the tutor**: back link, "Finish session" that closes `tutor_sessions.status`, and an upstream timeout/`AbortSignal` in `tutor.server.ts` so children are never stranded on an infinite "Thinking…".
7. **Make audit checklists honest**: bind each `CHECKLIST` item to a probe result or remove the unconditional green checkmarks; auto-run probes (or default to an explicit "not run" state).
8. **Account lifecycle basics**: password reset/change screen, recoverable (re-issuable) staff credentials, staff deactivation, and a confirm step on role changes (which are currently one-click destructive delete-then-inserts that also mislabel `parent`/`reviewer` as "Student").
9. **Consent integrity**: show the parent what they're signing (document + identity fields), and provide revocation; record who captured staff-entered consent.
10. **Give assignment a non-"Legacy" home**: the only assign path is a page that tells users not to trust it, and it's the onboarding checklist's step-2 target.

### P1 — Important (friction, coherence, accessibility)

1. Restructure educator nav per §5.1 (5 groups; authoring behind "Library"/"Create"); rename system-jargon labels task-first; de-duplicate icons.
2. Add forward links across the authoring chain and loop seams (builder→assign, gaps→interventions as a real CTA, intervention-complete→reassess, curriculum-style hand-offs everywhere).
3. Fix the Blueprint book selector (permanently `disabled` today).
4. Rebuild the assessment result screen: celebration, score framing, "practice what you missed".
5. Inline form validation app-wide (use the vendored `form.tsx`): field-level errors, `aria-invalid`, explanations for disabled submits; stop toasting raw server/Postgres strings.
6. Confirmations for destructive actions (question delete, intervention cancel, learner status, role change).
7. Mobile: make `TabsList` scrollable; cap dialogs at `max-h-[90vh]` with scroll; ≥44px touch targets on the question grid and student CTAs; fix the guided tour's 320px clamp math and mobile-missing targets; fix the `useIsMobile` first-render flash.
8. Accessibility baseline: skip-to-content link; replace hand-rolled modals with the vendored Radix `Dialog` (focus trap/restore); `aria-live` for autosave, probes, tutor replies; MCQ radiogroup semantics; `prefers-reduced-motion` guards; single `<h1>` per page.
9. Color-system repair: raise `--success`/`--warning` to AA, migrate the 156 hardcoded `emerald`/`amber` classes onto tokens, fix dark-mode border contrast (~1.3:1) and the auth hero's `/60` text.
10. Student login: default to Student tab, `input-otp` PIN with reveal, inline errors.
11. Consolidate the student home's nine sections into three; rewrite child-facing chrome vocabulary.
12. Autosave resilience: persistent failure banner with retry; reset the "saved" chip on new edits; save position on navigation.
13. Empty-state system: use `EmptyState` everywhere, always with a working CTA; never silently unmount promised sections; "clear filters" on filtered-empty.
14. Collapse the audit surface per §5.4 (one Audit Center; concern-based grouping; shared components — ~4,300 lines of duplication).

### P2 — Nice to have (polish, retention, growth)

1. Real breadcrumbs / deep-linkable tabs on the learner profile.
2. A public landing page: `/` currently double-redirects to the login wall, its SEO `head()` is dead code, and the sitemap indexes a sign-in form; the well-written `/about` content is the landing page behind the wrong door.
3. Parent retention: "since your last visit" digest, email summaries, per-child status dots on the switcher.
4. Student gamification beyond one-shot onboarding confetti: streaks, per-session goals, celebration at achievement moments — and either build the promised "mastery ring" or fix the three help strings that describe it.
5. Theme: 3-state toggle (light/dark/system — "system" is currently irrecoverable after one click), toggle on public/auth pages, dark `theme-color` variant, dark splash `background_color`.
6. PWA: `screenshots` in the manifest for rich install UI; `start_url` pointed past the redirect chain.
7. Layout consistency: one container-width and `space-y` convention; fix `launch-audit`'s double padding/full-bleed.
8. Reconcile onboarding copy (4-step checklist vs 5-step quick start); remove the phantom tour step about verification pages students can't see.
9. Remove or role-gate the persistent "Demo" context bar and the onboarding debug buttons in Settings.
10. Humanize data display: assessment names/subjects for parents, formatted enum values, explained "+7 lift", rounded AI latency.

---

## Appendix — method

Repository reviewed at `learning-start-nexus` on branch `main` state as of 2026-08-25. All findings reference `file:line` in the source. Four parallel deep-reads covered: educator surfaces (16 routes), student surfaces (auth/home/session/tutor + components), parent/admin surfaces (+ Supabase migrations for the parent data model), and the reviewer/audit surface + design system (tokens, contrast computation, public pages, PWA). No code was modified.
