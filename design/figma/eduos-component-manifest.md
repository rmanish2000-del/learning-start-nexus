# EduOS Component Manifest
# Generated: 2026-09-03
# Product: EduOS Foundation
# Scope: CBSE Class 10 · Mathematics and Science · English-only
# Purpose: Basis for native Figma component creation and Lovable implementation
# Components: 54 across 14 categories
# Version: 1.0.0

---

## FONT STACK

| Role      | Family           | Weights Used  | CSS Fallback               | Source       |
|-----------|------------------|---------------|----------------------------|--------------|
| Display   | Outfit           | 400, 600, 700 | sans-serif                 | Google Fonts |
| Body      | Inter            | 400, 500, 600 | system-ui, sans-serif      | Google Fonts |
| Editorial | Playfair Display | 400, 600      | Georgia, serif             | Google Fonts |
| Mono      | DM Mono          | 400, 500      | Courier New, monospace     | Google Fonts |

**Google Fonts single @import (place first in CSS, before all other rules):**
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&family=Playfair+Display:wght@400;600&family=DM+Mono:wght@400;500&display=swap');
```

**Usage rules:**
- Outfit: headings (h1–h4), buttons, nav links, badges, tab labels, card titles
- Inter: body copy, input fields, labels, table cells, descriptions
- Playfair Display: marketing hero headings ONLY (/, /about) — not in app shell
- DM Mono: token labels, data values, handles (@arjun_2026), timestamps, code

---

## ICON SYSTEM

EduOS uses emoji characters as icons throughout — no custom SVG icon library.

**Icon usage by context:**
| Emoji | Context |
|-------|---------|
| 🎓 | Pilot access badge |
| 🔁 | Reassessment |
| 📈 | Partial improvement |
| 🔍 | Gap persists / needs work |
| ❓ | Question type in SME queue |
| 📋 | Gap concept type in SME queue |
| ✅ | Approved / complete |
| 🚩 | Flagged content |
| 🎯 | Session complete |
| 🎉 | Gap closed |
| 📅 | Access expired |
| 🔒 | Access revoked |
| 🤖 | AI Tutor avatar |
| 👋 | Dashboard greeting |

**No custom SVG icon package exists.** If a custom icon set is required, it is a separate design deliverable outside this handoff.

---

## CATEGORY 1 — Navigation (3 components)

### AppNav
- **Background:** #0C1628 · **Height:** 56px · **Position:** fixed top, z-index 200
- **Logo:** 28px orange square mark (bg #F97316, border-radius 8px, white "E" Outfit 700) + "EduOS" wordmark Outfit 600 white 15px
- **Desktop links:** Home · About · How it works · Pricing · Contact (Inter 14px white/70%)
- **CTA:** "Get started" PrimaryButton (right side)
- **Mobile:** hamburger icon (3 bars, white) → full-height overlay menu
- **Variants:** `default` | `with-pilot-badge` (adds 🎓 Pilot Access pill after logo) | `admin`
- **Accessibility:** role="navigation" · aria-label="Main navigation"

### LearnerNav
- **Background:** #0C1628 · **Height:** 56px
- **Contents:** EduOS logo (left) · @handle chip (white/10% bg, Inter 13px, rounded-full) · sign out (right)
- **No main nav links** — learner has tab-based navigation within dashboard
- **Variants:** `default` | `with-google-badge` (small Google icon next to handle)

### AdminNav
- **Background:** #0C1628 · **Height:** 56px
- **Contents:** EduOS logo · "Admin" grey badge (DM Mono 10px) · pilot count indicator ("N pilots active") · sign out
- **Variants:** `default` | `with-pilot-count`

---

## CATEGORY 2 — Buttons (4 components)

### PrimaryButton
- **Background:** #F97316 · **Text:** #FFFFFF · **Font:** Outfit 600 14px
- **Border-radius:** 12px · **Min height:** 44px · **Padding:** 12px 24px
- **Hover:** opacity 0.9 (transition 150ms) · **Active:** scale(0.98)
- **Focus:** outline 2px solid #2563EB, offset 2px
- **Variants:**
  - `default` — standard
  - `loading` — orange spinner (24px, white ring) replaces text; button disabled; aria-busy="true"
  - `disabled` — opacity 0.4; cursor: not-allowed; aria-disabled="true"
  - `full-width` — width 100%, used in mobile flows
- **WCAG contrast:** white on #F97316 = 3.1:1 (meets large-text AA) — use Outfit 600 ≥14px

### SecondaryButton
- **Background:** transparent · **Border:** 1.5px solid #E3E5EE · **Text:** #374151 · **Font:** Outfit 600 14px
- **Same height/padding as PrimaryButton**
- **Hover:** bg #F8F9FB · **Active:** bg #F2F3F7
- **Variants:** `default` | `hover` | `disabled` (opacity 0.4)

### GoogleSignInButton
- **Background:** #FFFFFF · **Border:** 1px solid #D1D5DB · **Text:** #374151 · **Font:** Inter 500 14px
- **Height:** 48px · **Full width** on mobile
- **Icon:** Google official 4-color SVG logo, 20px, left-aligned with 12px gap to text
- **Text:** "Continue with Google"
- **Variants:**
  - `default`
  - `loading` — spinner replaces Google logo; text: "Connecting…"
  - `disabled` — opacity 0.4
- **Shown on:** /sign-in · /invite/:token/create-account
- **NEVER shown** as the only option — email/password always present alongside

### DangerButton
- **Background:** #DC2626 · **Text:** #FFFFFF · **Font:** Outfit 600 14px
- **Same sizing as PrimaryButton**
- **Used only for:** Revoke pilot access · destructive confirmations
- **Always paired with RevokePilotDialog** where Cancel receives default focus
- **Variants:** `default` | `loading` | `disabled`

---

## CATEGORY 3 — Inputs (7 components)

### TextInput
- **Border:** 1.5px solid #D1D5DB · **Radius:** 12px · **Height:** 48px · **Padding:** 12px 16px
- **Font:** Inter 14px #374151 · **Placeholder:** Inter 14px #9CA3AF
- **Background:** #FFFFFF
- **Focus:** border-color #2563EB + box-shadow: 0 0 0 3px rgba(37,99,235,0.15)
- **Error:** border-color #DC2626 + error message below (role="alert" aria-live="assertive")
- **Disabled:** bg #F2F3F7 · opacity 0.6 · cursor: not-allowed
- **Label:** Inter 14px #374151 above input (explicit `<label htmlFor>` — no placeholder-only labels)
- **Variants:** `default` | `focused` | `error` | `disabled` | `with-prefix (@)`

### PasswordInput
- **Extends:** TextInput
- **Right side:** eye / eye-off toggle icon button (24px, #6B7280)
- **Toggle:** `type="password"` ↔ `type="text"`
- **Accessibility:** aria-label="Show password" / "Hide password"

### EmailInput
- **Extends:** TextInput with `type="email"`
- **Validates on blur** — error: "Enter a valid email address"

### PINInput
- **Layout:** 4 visual boxes (44px × 52px each) in a row with 8px gap
- **Each box:** border 1.5px #D1D5DB · radius 12px · bg white
- **Selected box:** border #2563EB (border tracks input position via caret)
- **Filled box:** bg #F97316 · text white · border #F97316
- **Implementation:** hidden `<input type="tel" inputMode="numeric" maxLength="4">` over boxes
- **Error state:** all boxes border #DC2626 · shake animation (keyframes: 0→-4px→4px→0, 150ms)
- **Accessibility:** aria-label="4-digit PIN" on hidden input · role="group" on container

### HandleInput
- **Layout:** @ prefix chip (bg #F2F3F7, text #6B7280, left-attached, not focusable) + TextInput
- **Debounce:** 400ms after last keystroke before availability check
- **Status icons (right side):**
  - `idle` — no icon
  - `checking` — #F97316 spinner 16px · aria-label="Checking availability"
  - `available` — green checkmark · helper: "Available ✓" (#059669)
  - `taken` — red X · helper: "Already taken. Try @[suggestion1] or @[suggestion2]"
  - `invalid-format` — red X · helper: "Letters, numbers and underscores only"
  - `reserved` — red X · helper: "This handle is reserved"
- **Rules:** 3–20 chars · [a-z0-9_] · stored lowercase · @-prefixed in display
- **Auto-suggestions:** firstname+birth-year, firstname+3-digit-random
- **Auto-fallback (30s timeout):** selects best suggestion automatically with notification

### MathInput
- **Extends:** TextInput
- **Below input:** normalised preview (renders formatted math, updates on change)
- **Preview examples:** "sqrt(2)" → "√2", "x^2" → "x²", "3/4" → "³⁄₄"
- **Toggle button:** "⌨ Math keyboard" — opens symbol grid below
- **Symbol grid:** √ · π · ² · ³ · ¹ · × · ÷ · ± · ≤ · ≥ · ∞ · ≠ · α · β (tap inserts at cursor)
- **Accessibility:** each grid button has aria-label with symbol name

### DateInput
- **Extends:** TextInput with `type="date"`
- **Min value:** today's date (for pilot expiry: today + 7 days)
- **Used in:** AddPilotForm expiry field

---

## CATEGORY 4 — Select / Choice (3 components)

### SubjectTabs
- **Layout:** inline pill tabs with gap-2
- **Active:** bg white · text #111827 · shadow-sm
- **Inactive:** bg transparent · text #6B7280
- **Font:** Outfit 600 14px · Height: 36px · Radius: full · Padding: 8px 20px
- **Subjects:** Mathematics | Science
- **Accessibility:** role="tablist" · each tab: role="tab" aria-selected aria-controls

### RadioGroup (MCQ)
- **Each option:** full-width button · border 1.5px #E3E5EE · radius 12px · padding 12px 16px
- **Unselected:** bg white · text #374151
- **Selected:** border #2563EB · bg #EFF6FF · text #1E40AF
- **Hover:** bg #F8F9FB (unselected) / bg #DBEAFE (selected)
- **Font:** Outfit 14px · Min height: 44px
- **Accessibility:** role="radiogroup" on container · role="radio" aria-checked on each option

### ScopeSelector
- **Layout:** 3-option horizontal grid (equal width)
- **Options:** "All subjects" | "Mathematics only" | "Science only"
- **Selected:** bg #EFF6FF · border #2563EB · text #1E40AF
- **Unselected:** bg white · border #E3E5EE · text #374151
- **Used in:** AddPilotModal
- **Accessibility:** role="radiogroup" aria-label="Access scope"

---

## CATEGORY 5 — Cards (4 components)

### SubjectCard
- **Background:** white · **Border:** 1px #E3E5EE · **Radius:** 16px · **Padding:** 20px
- **Contents (top to bottom):**
  - Subject icon (32px emoji or SVG)
  - Subject name: Outfit 600 16px #111827
  - LinearProgress (score %)
  - Gap count badge: "N gaps" (red if N > 0, green if N = 0)
- **Tappable:** navigates to /learner/study-plan?subject=[subject]
- **Hover:** shadow-card transition 150ms

### GapCard
- **Background:** white · **Radius:** 16px · **Padding:** 16px
- **Left border:** 4px solid (red #DC2626 = High · amber #D97706 = Medium · green #059669 = Low)
- **Contents:**
  - Skill name: Outfit 600 14px #111827
  - Unit: DM Mono 11px #9CA3AF
  - Score: DM Mono 12px (colored by severity)
  - SeverityBadge (right-aligned)
  - Chevron icon (right edge, #9CA3AF)
- **Tappable:** opens GapDetailDrawer
- **Ordered by:** High → Medium → Low within each unit

### StudyPlanCard
- **Background:** white · **Radius:** 16px · **Padding:** 16px
- **Top-left badge:** "Next up" (orange, first item) or "Step N" (grey, others)
- **Top-right badge:** SeverityBadge (priority level)
- **Border:** matches priority (red top-border 2px = High · amber = Medium · grey = Low)
- **Contents:** skill name · unit · estimated time (DM Mono)
- **Tappable:** navigates to intervention step

### PilotEntitlementCard
- **Background:** #EFF6FF · **Border:** 1px #BFDBFE · **Radius:** 16px · **Padding:** 20px
- **Expiring variant:** bg #FFFBEB · border #FDE68A
- **Contents:**
  - 🎓 icon + "Pilot Access" Outfit 700 16px
  - Scope label (Outfit 500 14px #374151)
  - Learner seats count
  - Expiry date (DM Mono)
  - Days remaining (bold, coloured: red ≤7d · amber ≤14d · grey otherwise)
  - Circular progress ring (SVG, blue #2563EB fill)
  - StatusPill (active / expiring / expired)
- **NO payment amounts, invoice numbers, or order IDs shown**

---

## CATEGORY 6 — Overlays (4 components)

### GapDetailDrawer
- **Mobile:** bottom sheet — slides up from bottom · 80% viewport height · drag handle (32px bar, #D1D5DB)
- **Desktop:** right panel — fixed 400px wide · full viewport height · left-side backdrop
- **Background:** white · **Radius (mobile):** 24px top corners
- **Contents:** gap title · severity badge · CBSE unit · concept explanation · "Start learning →" CTA
- **Accessibility:** role="dialog" aria-modal="true" aria-labelledby="drawer-title"
- **Close:** X button (top-right) · backdrop tap · Escape key · focus trap inside

### AddPilotModal
- **Layout:** centered modal · max-width 480px · radius 20px · shadow-modal
- **Backdrop:** rgba(0,0,0,0.5) · closes on Escape (but NOT on backdrop click — force explicit cancel)
- **Form fields:** (see AddPilotForm in Forms section)
- **Footer:** Cancel SecondaryButton · "Add pilot family" PrimaryButton
- **Accessibility:** role="dialog" aria-modal="true" · focus traps to first field on open

### RevokePilotDialog
- **Layout:** centered modal · max-width 400px · radius 20px
- **Heading:** "Revoke access for [parent name]?" (Outfit 700 18px)
- **Body:** "Their learners will lose access immediately. Their data will be retained."
- **Buttons:** "Cancel" SecondaryButton (receives focus on open) · "Revoke access" DangerButton
- **Accessibility:** role="alertdialog" aria-describedby · Cancel must receive default focus (safety default)

### AccountLinkingPrompt
- **Trigger:** parent already has EduOS account, attempts Google link with different email
- **Contents:** "Which account would you like to use?" · EduOS email chip · Google email chip · "Link accounts" · "Keep separate" (Cancel)
- **Accessibility:** role="dialog" aria-modal="true"

---

## CATEGORY 7 — Banners + Alerts (4 components)

### ErrorBanner
- **Background:** #FEF2F2 · **Border:** 1px #FECACA · **Text:** #991B1B · **Radius:** 12px · **Padding:** 12px 16px
- **Icon:** red circle-X (16px, left-aligned)
- **Dismiss:** X button (right side)
- **Accessibility:** role="alert" aria-live="assertive" — screen readers announce immediately
- **Placement:** above affected form, or below nav (full-width variant for critical errors)
- **Used for:** sign-in failures · wrong PIN · network errors · revoke errors · Google auth failures

### WarningBanner
- **Background:** #FFFBEB · **Border:** 1px #FDE68A · **Text:** #92400E · **Radius:** 12px
- **Icon:** amber warning triangle
- **Accessibility:** role="status" aria-live="polite"
- **Used for:** pilot expiry ≤14d · medium-priority gap callouts

### SuccessToast
- **Background:** #ECFDF5 · **Border:** 1px #6EE7B7 · **Text:** #065F46 · **Radius:** 12px
- **Position:** fixed top-right · slides in (translateX: 110% → 0, 250ms ease-out)
- **Auto-dismiss:** 4 seconds · pauses on hover
- **Dismiss:** X button (manual)
- **Accessibility:** role="status" aria-live="polite" aria-atomic="true"
- **Used for:** pilot added · Google linked · handle created · password reset sent

### PilotExpiryWarning
- **Inline variant** of WarningBanner — shown in parent dashboard header area
- **Copy:** "Your pilot access expires in [N] days."
- **CTA:** "View plans →" link (orange)
- **Threshold:** shown when days_remaining ≤ 14

---

## CATEGORY 8 — Badges + Status (4 components)

### PilotNavBadge
- **Background:** rgba(37,99,235,0.15) · **Text:** #93C5FD · **Border:** 1px rgba(147,197,253,0.2)
- **Font:** DM Mono 10px · **Radius:** full · **Padding:** 2px 8px
- **Content:** "🎓 Pilot Access"
- **Position:** in dark AppNav, after logo, before nav links
- **Shown only when:** pilot_entitlements.status = 'active'

### StatusPill

| Status    | Background | Text     | Border   |
|-----------|------------|----------|----------|
| active    | #ECFDF5    | #065F46  | #6EE7B7  |
| expiring  | #FFFBEB    | #92400E  | #FDE68A  |
| expired   | #F2F3F7    | #6B7280  | #E3E5EE  |
| revoked   | #FEF2F2    | #991B1B  | #FECACA  |
| pending   | #EFF6FF    | #1E40AF  | #BFDBFE  |

- **Font:** DM Mono 10px · **Radius:** full · **Padding:** 2px 8px · **Border:** 1px

### SeverityBadge

| Level  | Background | Text     |
|--------|------------|----------|
| High   | #FEF2F2    | #DC2626  |
| Medium | #FFFBEB    | #D97706  |
| Low    | #ECFDF5    | #059669  |

- **Font:** DM Mono 10px · **Radius:** full · **Padding:** 2px 8px · **Uppercase**

### PriorityBadge
- Same palette and sizing as SeverityBadge
- Labels: High priority · Medium priority · Low priority

---

## CATEGORY 9 — Progress (3 components)

### LinearProgress
- **Track:** bg #E5E7EB · **Height:** 6px · **Radius:** full
- **Fill color by score:**
  - ≥ 80%: #059669 (green)
  - 40–79%: #D97706 (amber)
  - < 40%: #DC2626 (red)
- **Accessibility:** role="progressbar" aria-valuenow aria-valuemin="0" aria-valuemax="100" aria-label="[subject] progress"

### DiagnosticProgress
- **Per subject:** label (Outfit 600 14px) + LinearProgress + percentage pill (DM Mono 12px)
- **Subjects:** Mathematics · Science
- **Not started:** LinearProgress empty + "Not started" grey pill

### WeeklyActivityChart
- **7 columns:** Mon Tue Wed Thu Fri Sat Sun (DM Mono 10px labels)
- **Bar height:** proportional to questions answered (0–max scale per week)
- **Bar color:** #2563EB (today's bar) · #BFDBFE (all other bars)
- **Bar width:** fixed 24px · radius top corners 4px
- **No axes labels beyond day names · no gridlines**
- **Accessibility:** role="img" aria-label="Weekly activity chart: [N] questions this week"

---

## CATEGORY 10 — Data Display (5 components)

### PilotTable
**Columns:** Parent name | Email | Scope | Expiry date | Days left | Status | Action
- **Days left color:** red ≤7d · amber ≤14d · grey otherwise
- **Scope values:** All subjects · Mathematics only · Science only
- **Action column:** "Revoke" DangerButton → opens RevokePilotDialog
- **Empty state:** "No pilots yet. Add a pilot family to get started."
- **Mobile:** horizontal scroll (table-layout: auto, min-width: 640px)

### SMEQueueList
**Each row:**
- Type icon badge (❓ blue for question · 📋 amber for gap concept)
- Content preview (1 line, truncated)
- Unit chip (DM Mono)
- Submitted by + date (DM Mono #9CA3AF)
- "Review →" blue button
- **Filter tabs:** All · Pending · Approved · Flagged

### GapList
- **Ordered by:** High → Medium → Low severity
- **Each item:** GapCard (see Cards section)
- **Tappable:** opens GapDetailDrawer with concept explanation
- **Empty state:** "No gaps found. Great work! 🎉" with green checkmark

### ScoreBar
- Same visual as LinearProgress
- **Label:** fraction format "3/5" (DM Mono 12px, right of bar)

### PartBreakdown
- **Expandable accordion** per question part
- **Collapsed:** "Part [A/B/C]" + score indicator (full/partial/zero badge) + chevron
- **Expanded:** two rows:
  - "Learner answer" — what was submitted (mono font)
  - "Correct answer" — rubric answer (mono font, green)
  - "Marks" — N/M awarded (coloured by outcome)
- **Partial credit:** ONLY shown when rubric explicitly assigns partial marks

---

## CATEGORY 11 — Forms (5 components)

### SignInForm
- Fields: EmailInput · PasswordInput (with show/hide)
- Below password: "Forgot password?" link (#2563EB, Inter 14px)
- Submit: "Sign in" PrimaryButton (full width)
- Below submit: GoogleSignInButton (full width, with divider "or")
- ErrorBanner above form for sign-in failures

### SignUpForm
- Fields: EmailInput · PasswordInput · Confirm password
- Password strength meter (below password):
  - Weak: red bar 33% + "Add numbers or symbols to strengthen"
  - Fair: amber bar 66% + "Good — add one more character type"
  - Strong: green bar 100% + "Strong password"
- Submit: "Create account" PrimaryButton

### PasswordResetForm
See route /auth/reset for all 7 states and exact copy.

### AddPilotForm (inside AddPilotModal)
- Parent name: TextInput (required)
- Email: EmailInput (required, checked for existing account)
- Number of learners: stepper (−/+, range 1–4, default 1)
- Subject scope: ScopeSelector (required)
- Access expiry date: DateInput (required, min: today + 7 days)
- Notes: textarea (optional, max 200 chars)
- **Validation on submit:** all required fields · valid email · future date
- **On success:** creates pilot_entitlements row — zero payment fields

### HandleCreationForm
- HandleInput (@ prefix + availability check)
- Rules hint below: "3–20 characters. Letters, numbers and underscores only." (DM Mono 11px #9CA3AF)
- Suggestions shown when status = taken
- Submit: "Save handle" PrimaryButton (disabled until status = available)
- Skip link: "I'll do this later" (grey text, available after 10s)

---

## CATEGORY 12 — Loading / Empty / Error (5 components)

### SkeletonCard
- **Animation:** pulse (opacity: 0.6 → 1 → 0.6, ease-in-out, 1.5s loop)
- **Color:** #E5E7EB · **Radius:** matches replaced card
- **Dimensions:** match actual card — prevents layout shift
- **Accessibility:** aria-hidden="true" · sibling `<p aria-live="polite">Loading…</p>` (sr-only)

### EmptyState
- **Layout:** centered vertically and horizontally
- **Icon:** 48px emoji or SVG (contextual per screen)
- **Heading:** Outfit 600 18px #111827
- **Body:** Inter 14px #6B7280 (max-width 320px centered)
- **CTA:** optional PrimaryButton

### ErrorState
- **Icon:** ⚠ (48px) or custom SVG
- **Heading:** Outfit 600 18px #111827
- **Body:** Inter 14px #6B7280
- **CTAs:** "Try again" PrimaryButton · "Contact support" text link (below, #2563EB)
- **Accessibility:** role="alert" if error is unexpected

### OfflineBanner
- **Position:** fixed top, full width, z-index 500 (above nav)
- **Background:** #FEF2F2 · **Text:** "No connection — some features may not work" · **Icon:** wifi-off
- **Auto-dismiss:** when connection restored (navigator.onLine + fetch test)
- **Height:** 40px

### LoadingSpinner
- **Sizes:** 20px (inline) · 24px (button) · 32px (page)
- **Ring:** 3px stroke, #F97316 (rotating arc), #E5E7EB (track)
- **Animation:** rotate 360deg, 0.8s linear infinite
- **Accessibility:** role="status" aria-label="Loading"

---

## CATEGORY 13 — Chat / AI Tutor (5 components)

### TutorMessage
- **Background:** white · **Border:** 1px #E3E5EE · **Radius:** 16px (top-left 4px)
- **Padding:** 12px 16px · **Max-width:** 80%
- **Font:** Inter 13px #374151 · **Line-height:** 1.65
- **Bold support:** `**text**` → `<strong style="color:#111827">`
- **Avatar:** 24px circle, bg #EFF6FF, 🤖 emoji, left-aligned

### LearnerMessage
- **Background:** #F97316 · **Text:** white · **Radius:** 16px (top-right 4px)
- **Padding:** 12px 16px · **Max-width:** 80% · **Right-aligned**
- **Timestamp:** 9px DM Mono, white/60%, below message text

### TypingIndicator
- **Visual:** 3 dots (8px each, #9CA3AF)
- **Animation:** each dot scales 1→1.4→1, staggered 200ms apart, loop
- **Container:** same style as TutorMessage (white bg, border, radius)
- **Accessibility:** aria-label="Tutor is typing" aria-live="polite"

### QuickPromptChip
- **Background:** #EFF6FF · **Border:** 1px #BFDBFE · **Text:** #2563EB
- **Font:** DM Mono 10px · **Radius:** full · **Padding:** 6px 12px
- **Shown only:** before first user message (messages.length ≤ 1)
- **Tappable:** sends message immediately, same as typing it

### TutorInput
- **Layout:** TextInput (flex-1) + "Send" PrimaryButton (shrink-0) in a horizontal row
- **Container:** bg white · border 1px #E3E5EE · radius 12px · padding 8px 8px 8px 12px
- **Placeholder:** "Ask about [current topic]…"
- **Disabled when:** tutorState = "typing"
- **Submit:** Enter key or Send button

---

## CATEGORY 14 — Pilot Access Full-Screen (4 components)

### PilotStatusCard
- **Full summary panel** for parent dashboard
- **Active variant:** bg #EFF6FF · border #BFDBFE
- **Expiring variant:** bg #FFFBEB · border #FDE68A + amber warning + subscribe CTA
- **Contents:** 🎓 Pilot Access heading · scope · seats · expiry · days remaining · circular progress ring · StatusPill
- **Circular progress ring:** SVG, 80px diameter, stroke-width 8, #2563EB fill arc

### PilotDashboardBadge
- Larger variant of PilotNavBadge
- **Font:** DM Mono 12px · **Padding:** 4px 12px · **Radius:** full
- Shown in parent dashboard header

### PilotExpiredScreen
- **Layout:** full-page centered (min-height: calc(100vh - 56px))
- **Contents:**
  - 📅 icon (48px)
  - Heading: "Your pilot access has ended" (Outfit 700 24px)
  - "Your data has been retained."
  - "No payment was taken." ← explicit copy, required
  - PrimaryButton: "Subscribe to continue learning →"
  - Text link: "View plans" (#2563EB)
- **NO invoice, order number, or payment record shown**

### PilotRevokedScreen
- **Layout:** full-page centered
- **Contents:**
  - 🔒 icon (48px)
  - Heading: "Your access has been removed" (Outfit 700 24px)
  - "If you think this is a mistake, contact support."
  - Support email: support@eduos.global (link, #2563EB)
- **NO subscribe CTA** — admin must re-grant
- **NO payment records shown**

---

## ACCESSIBILITY REQUIREMENTS — COMPLETE LIST

### Touch targets
- All interactive elements: minimum 44×44px (buttons, links, tabs, checkboxes)
- PINInput boxes: 44×52px
- QuickPromptChips: minimum 36px height (acceptable for supplementary controls)

### Focus management
- Focus indicator: 2px solid #2563EB + 2px offset (visible on all backgrounds)
- Modal open: focus moves to first focusable element inside
- Modal close: focus returns to trigger element
- Focus trap: active inside all modals and drawers while open
- Escape key: closes all overlays

### ARIA patterns
- Modals: role="dialog" aria-modal="true" aria-labelledby aria-describedby
- Alert dialogs: role="alertdialog" (RevokePilotDialog)
- Error messages: role="alert" aria-live="assertive"
- Status messages: role="status" aria-live="polite"
- Progress bars: role="progressbar" aria-valuenow aria-valuemin aria-valuemax
- Tab panels: role="tablist" / role="tab" aria-selected / role="tabpanel"
- Radio groups: role="radiogroup" / role="radio" aria-checked
- Loading spinners: role="status" aria-label="Loading"
- Charts: role="img" with descriptive aria-label

### Color contrast (WCAG 2.1 AA)
- Body text #374151 on white: 8.3:1 ✓
- Primary text #111827 on white: 16.1:1 ✓
- Secondary text #6B7280 on white: 4.6:1 ✓
- White on #F97316 (PrimaryButton): 3.1:1 ✓ (≥14px bold)
- White on #2563EB (GoogleLinkFlow): 4.7:1 ✓
- White on #DC2626 (DangerButton): 4.6:1 ✓
- #93C5FD on #0C1628 (PilotNavBadge): 5.8:1 ✓

### Keyboard navigation
- All interactive elements reachable via Tab in logical order
- Dropdown/select alternatives use arrow keys within role="radiogroup"
- PINInput: full keyboard entry via hidden input (no mouse required)
- HandleInput: Enter submits after available state confirmed

### Motion
- All transitions respect `prefers-reduced-motion: reduce`
- When reduced: disable all transforms, fade transitions only, disable auto-scroll

### Screen reader
- Logical heading hierarchy: h1 (page title) → h2 (section) → h3 (card title) — no skips
- Decorative images: alt=""
- Functional images: descriptive alt text
- No information conveyed by colour alone (icons or text always accompany colour signals)
- Form errors: announced via aria-live before field label in DOM order

---

## FAILURE CONDITIONS REFERENCE

The following are explicit failure conditions for this product. Lovable must not implement any of these:

1. Payment or order record created for free pilot access
2. Google sign-in made compulsory for learners (handle+PIN must always work)
3. Existing email account duplicated when Google linking (account_exists error must be handled)
4. Parent and learner identities mixed (learner_profiles.google_sub ≠ second Supabase auth user)
5. Missing pilot expiry or revoke controls in admin view
6. Google sign-in shown without all failure states (duplicate-email, wrong-account, network-fail, cancelled)
7. Partial credit awarded without an explicit rubric
8. Unsafe or unrestricted custom handles accepted
9. Assessments implied to work fully offline (connection required for scoring)
10. Cached private learner, payment, report or diagnostic answer data shown
11. Grade 7 content, Setswana language, or subjects outside Mathematics and Science
