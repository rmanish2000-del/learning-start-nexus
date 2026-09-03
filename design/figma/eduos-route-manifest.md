# EduOS Route-to-Prototype Manifest
# Generated: 2026-09-03
# Product: EduOS Foundation — https://www.eduos.global
# Scope: CBSE Class 10 · Mathematics and Science · English-only
# Prototype: Figma Make interactive React demos (not native Figma frames)
# Version: 1.0.0

---

## VALIDATION CHECKLIST

- [x] CBSE Class 10 only — no Grade 7, no other boards
- [x] Mathematics and Science only — no other subjects
- [x] English-only interface — no Setswana, Hindi, or other languages in any state
- [x] Learner handles: alphanumeric + underscore, @-prefixed, 3–20 chars
- [x] Pilot access: NO payment record, order FK, or subscription FK
- [x] Partial credit: rubric-gated only — never awarded without explicit rubric
- [x] Reassessment: scored independently — practice scores do not carry over
- [x] AI Tutor: no access to personal data, payment status, or full diagnostic answers
- [x] Google sign-in: all failure and account-linking states are prototyped
- [x] Parent/learner identities separate: learner_profiles.google_sub, not a second Supabase auth user
- [x] Google is never compulsory for learners

---

## ALL 20 ROUTES — Complete State Inventory

### 1. / (Marketing homepage)
**Component:** HomePage
**States:** hero · features · pricing · CTA
**Pricing shown:** ₹199 one-time diagnostic · ₹2,999/year annual plan
**Key copy:** "Find the gaps. Close them. Prove it." / "The learning outcome system. Not an LMS."
**Responsive:** hero stacks on mobile · pricing cards 1-col mobile / 2-col tablet / 3-col desktop

---

### 2. /sign-in (Parent / admin sign-in)
**Component:** SignInDemo
**States:**
- `idle` — email + password fields, "Continue with Google" button below
- `loading` — spinner in button, fields disabled
- `wrong-password` — ErrorBanner: "Incorrect password. Try again or reset your password."
- `no-account` — ErrorBanner: "No account found for this email."
- `throttled` — ErrorBanner: "Too many attempts. Try again in 15 minutes."
**Accessibility:** role="alert" aria-live="assertive" on all error banners
**Google button:** shown on this screen — links to GoogleLinkFlow

---

### 3. /sign-in — Google path
**Component:** GoogleLinkFlow
**States (8):**
- `choose` — "Sign in" or "Continue with Google" choice
- `linking-prompt` — "Connect your Google account" modal (shows EduOS email)
- `linked-success` — "Google account connected. You can now sign in with Google or your email and password."
- `link-cancelled` — "No changes were made. You can still sign in with your email and password."
- `duplicate-email` — "This Google account is already linked to another EduOS account. Each Google account can only be linked to one EduOS account."
- `network-fail` — "We couldn't reach Google. Check your connection and try again." + retry button
- `wrong-account` — "You signed in with [google-email] but your EduOS account uses [eduos-email]."
- `already-linked` — "Your account is already connected to [google-email]."
**Constraint:** Google sign-in failure states are REQUIRED — bare happy-path is a failure condition

---

### 4. /invite/:token (Pilot parent invitation landing)
**Component:** PilotInviteFlow — Step 1: invitation-email
**Invitation email exact copy:**
```
From: hello@eduos.global
Subject: You have been invited to EduOS

[Parent name],

[School/centre name] has given you complimentary access to EduOS for your child.

Your access includes:
  Subjects: [Scope]
  Learner seats: [N]
  Valid until: [date]

There is no payment required.
This invitation expires in 72 hours.

[Accept invitation →]
```
**States:** invitation-email → landing → create-account → account-created → dashboard
**Token model:** invitation_tokens table · 72h expiry · used_at timestamp · personal to invited email
**Constraint:** No payment language anywhere in the invite flow

---

### 5. /invite/:token/create-account
**Component:** PilotInviteFlow — Step 3: create-account
**Landing page copy (shown before account creation):**
- Heading: "Your free access"
- "Subjects: Mathematics and Science (CBSE Class 10)"
- "Learner seats: [N]"
- "Valid until: [date]"
- "Cost: Free"
- "This access was provided by [school/centre]. No payment is required."
**Account creation:** pre-filled email chip (verified, non-editable) · Google or email+password choice
**Account created copy:** "You're in! Your pilot access is active." — NO payment confirmation language
**Constraint:** No order or payment record is created at any step

---

### 6. /onboarding (Parent onboarding checklist)
**Component:** OnboardingChecklist
**Steps:**
1. Verify email — active (done if email verified)
2. Add a learner — locked until step 1 done
3. Complete diagnostic — locked until step 2 done
**States per step:** active · locked · done · all-complete
**All-complete state:** "You're set up! Take the diagnostic to find your child's learning gaps."

---

### 7. /onboarding/add-learner (Handle creation)
**Component:** HandleCreationDemo
**States (6):**
- `idle` — empty @ input with rules hint
- `checking` — orange spinner, "Checking availability…"
- `available` — green checkmark, "Available ✓"
- `taken` — red X, "Already taken. Try @arjun_math or @arjun_2026"
- `invalid-format` — red X, "Letters, numbers and underscores only"
- `reserved` — red X, "This handle is reserved"
**Rules:** 3–20 chars · alphanumeric + underscore · @-prefixed · case-insensitive stored as lowercase
**Auto-fallback:** if no selection after 30s → suggest firstname + birth year (e.g. @arjun_2011)
**Auto-suggestions when taken:** firstname + random 3-digit, firstname + birth year
**Constraint:** Unsafe/unrestricted handles are a failure condition

---

### 8. /learner/sign-in (Learner sign-in)
**Component:** LearnerGoogleFlow
**Primary method:** Handle + PIN (ALWAYS primary, never removed)
**States (8):**
- `sign-in` — @handle input + "Sign in" CTA
- `google-option` — shown only when google_sub exists AND parent has enabled; handle auto-filled
- `google-linked` — PIN or Google button shown (Google is optional, not default)
- `google-not-linked` — Google option hidden; copy: "Ask a parent or guardian to add your Google account in account settings"
- `google-success` — "Signed in with Google. Welcome back, @handle!"
- `pin-success` — dashboard redirect
- `pin-wrong` — ErrorBanner (role=alert): "Wrong PIN. [N] attempts remaining." → lockout after 5
- `handle-not-found` — ErrorBanner: "No learner found with that handle."
**PIN input:** 4 visual boxes · hidden `<input type="tel" inputMode="numeric" maxLength="4">` · accessible
**Constraint:** Google is NEVER compulsory for learners — failure condition if made default or only option

---

### 9. /learner/dashboard (Learner home)
**Component:** LearnerDashboardFlow
**Views (3 tabs):**

**Home tab:**
- Greeting: "Good morning, [handle] 👋"
- "Here's your plan for today"
- Today's priority: gap card → "Start learning" CTA
- Quick access subject cards: Mathematics (3 gaps · 62%) / Science (Not started)
- No cached diagnostic answers shown; no payment status shown

**Subjects tab:**
- Mathematics: "Diagnostic complete" badge · unit breakdown with gap counts + progress bars
  - Number Systems: 2 gaps
  - Polynomials: 1 gap
  - Pair of Linear Equations: 0 gaps
- Science: "Not started" state with "Take diagnostic" CTA

**Progress tab:**
- "This week" heading
- 7-day bar chart (Mon–Sun) · bar height = questions answered
- Summary: "7 questions answered this week"
- No personal data, payment data, or cached answers shown

**Responsive:** mobile single-column stacked · tablet 2-col cards · desktop 3-col with sidebar

---

### 10. /learner/study-plan (Gap → intervention → practice)
**Component:** StudyPlanFlow
**Steps (4):**

**gap-list:**
- "Your study plan — Mathematics"
- "Work through these gaps in order. Each session takes 10–20 minutes."
- Cards ordered: High priority first → Medium → Low
- Card 1: "Next up" orange badge · Irrational Numbers · High · est. 15 min · score 40%
- Card 2: Euclid's division lemma · Medium · 10 min · score 60%
- Card 3: Zeroes of a polynomial · High · 20 min · score 20%

**intervention:**
- "High priority gap" red badge
- Concept explanation: "An irrational number cannot be expressed as p/q where p and q are integers and q ≠ 0."
- Examples panel (blue): √2 ≈ 1.41421356… (irrational) / √4 = 2 (rational) / π ≈ 3.14159265… (irrational)
- Common mistake panel (amber): "Assuming all square roots are irrational. Only non-perfect square roots are irrational."
- CTA: "Start practice questions →" / "Save for later" (grey text)

**practice:**
- Progress bar: 1/2 → 2/2
- MCQ format: 4 options, one correct
- Q1: "Which of the following is irrational?" Options: √4 · √9 · √2 · √16 (answer: √2)
- Q2: "π (pi) is a:" Options: Rational / Irrational / Natural / Integer (answer: Irrational)
- Navigation: Previous (when qIndex > 0) · Next (disabled until answered) · Submit (last question)

**session-complete:**
- "Session complete! 🎯"
- Score: 2/2 · 100% · +12 XP earned
- "A reassessment has been scheduled to confirm the gap is closed."
- CTA: "Continue to next gap →"

---

### 11. /learner/tutor (AI Tutor chat)
**Component:** AITutorFlow
**Views (2):**

**chat view:**
- Header: "EduOS Tutor" · "Topic: Irrational Numbers · Number Systems" · "Online" green pill
- Initial tutor message: "Hi Arjun! I'm your EduOS tutor. I can see you're working on Irrational Numbers from your diagnostic. What would you like help with?"
- Quick prompts (shown before first user message): "What is an irrational number?" / "Why is root 2 irrational?" / "Give me a practice question"
- Tutor supports **bold** markdown in responses
- Typing indicator: animated dots, 1.4s delay
- Input: "Ask about irrational numbers…" placeholder · Send button

**Canned response — "what is an irrational number":**
"An irrational number is a real number that cannot be written as a simple fraction (p/q where p and q are integers and q ≠ 0). Key properties: Non-terminating decimal expansion · Non-repeating decimal expansion. Examples: √2 ≈ 1.41421356…, π ≈ 3.14159265… Contrast: √4 = 2, which is rational because it simplifies to a whole number."

**Canned response — "why is root 2 irrational":**
Proof by contradiction: assume √2 = p/q (lowest terms) → p² = 2q² → p even → p = 2k → q² = 2k² → q even → contradiction (common factor 2) → √2 is irrational.

**context view:**
| Field | Value |
|-------|-------|
| Learner | @arjun_2026 · Class 10 CBSE |
| Current topic | Irrational Numbers |
| Source | Diagnostic gap — High priority |
| Diagnostic score | 40% (2/5 correct) |
| Session type | Intervention (pre-reassessment) |
| AI access | EduOS foundation model — no external web |
| Data shown to AI | Topic, score, learner grade — NO personal info |

**Constraint:** AI does not see personal data, payment status, or full diagnostic answers

---

### 12. /learner/reassessment (Gap verification)
**Component:** ReassessmentFlow
**Steps (5):**

**intro:**
- "Reassessment time 🔁"
- "You practised Irrational Numbers yesterday. Let's check if the gap is closed with a short reassessment."
- Metadata: Previous score 40% (2/5) · Questions today: 3 · Estimated time: 5 minutes
- "Tip: This is scored independently — your practice result does not carry over."

**question:**
- Q: "Which of the following represents an irrational number?"
- Options: 3/7 · √5 · 0.75 · −4 (answer: √5)
- Outcome demo picker (for prototype only): closed / partial / persists

**result-closed:**
- "Gap closed! 🎉"
- "Irrational Numbers · 3/3 correct (100%)"
- "Your parent will see this gap marked as closed ✓ on the report. It will be removed from your study plan."
- "A spaced-repetition review will be scheduled in 7 days to confirm retention."

**result-partial:**
- "Improving — not closed yet 📈"
- "Irrational Numbers · 2/3 correct (67%)"
- Before/after comparison: 40% → 67%
- "You're improving! The gap remains in your study plan. EduOS will recommend one more focused practice session."

**result-persists:**
- "Gap still open 🔍"
- "Irrational Numbers · 1/3 correct (33%)"
- "This topic needs more work. EduOS will suggest a different explanation approach."
- "Your parent has been notified that this gap persists and may benefit from a tutor session."
- CTAs: "Try a different explanation →" / "Ask the AI tutor for help"

---

### 13. /dashboard (Parent dashboard — pilot status)
**Component:** PilotStatusFlow
**States (5):**

**active:**
- Dark nav shows: "🎓 Pilot Access" badge (bg rgba(37,99,235,0.15), text #93C5FD)
- Dashboard shows: PilotEntitlementCard (scope · seats · expiry · progress ring · "Active" green pill)
- No payment records, invoices, or subscription details shown

**expiring-soon (≤14 days):**
- Amber inline warning: "Your pilot access expires in [N] days."
- Subscribe CTA: "View plans →"
- Pilot badge still shown in nav

**expired:**
- Full-page: 📅 icon · "Your pilot access has ended"
- "Your data has been retained."
- "No payment was taken." (explicit copy — prevents confusion)
- CTA: "Subscribe to continue learning →"
- No invoice or payment record shown

**revoked:**
- Full-page: 🔒 icon · "Your access has been removed"
- "If you think this is a mistake, contact support."
- Support email link only — no subscribe CTA (admin must re-grant)

**admin-view:**
- Table: parent name · email · scope · expiry · days-left · status · Revoke button
- Status colour-coded: active (green) · expiring (amber) · expired (grey) · revoked (red)

---

### 14. /dashboard/diagnostic (Diagnostic progress)
**Component:** DiagnosticProgressDemo
**States (3):**
- `not-started` — "Take the diagnostic" CTA, explanation of what it tests
- `in-progress` — subject progress bars, resume CTA
- `completed` — both subjects showing %, view report CTA

---

### 15. /dashboard/diagnostic/report (Gap report with drawer)
**Component:** DiagnosticProgressDemo (completed state)
**Contents:**
- Per-subject score summary
- Gap list ordered: High → Medium → Low severity
- Each gap card tappable → GapDetailDrawer
- Drawer: gap name · severity · CBSE unit · concept explanation · "Add to study plan" CTA
**Constraint:** No cached private diagnostic answers shown to parent

---

### 16. /admin/pilots (Pilot administration)
**Component:** PilotAdminFlow
**Views:**

**Pilot list:**
- Summary stats: Active [N] · Expired [N] · Revoked [N]
- Filter tabs: All · Active · Expired · Revoked
- Per-pilot row: name · email · scope · expiry · days-left warning (red ≤7d, amber ≤14d) · status pill · Revoke button
- "Add pilot family" PrimaryButton → AddPilotModal

**AddPilotModal:**
- Fields: Parent name (required) · Email (required) · Number of learners 1–4 (stepper) · Subject scope (All / Maths / Science) · Access expiry date (min: today+7d) · Notes (optional)
- Submit: creates `pilot_entitlements` row — NO order, subscription, stripe_customers FK
- Note shown in form: "No payment record is created. Pilot access is tracked separately from subscriptions."

**RevokePilotDialog:**
- "Revoke access for [parent name]?"
- "Their learners will lose access immediately. Their data will be retained."
- Cancel button (default focus) · "Revoke access" DangerButton
- role="alertdialog"

---

### 17. /diagnostic/session — multi-part scoring
**Component:** MultiPartScoring
**Key rules:**
- Multi-part questions: each part scored independently
- Partial credit: ONLY awarded when explicit rubric specifies it — never inferred
- Scoring shown: ScoreBar per part (green=full, amber=partial, red=zero)
- Part breakdown: expandable accordion — learner answer vs correct answer vs marks awarded
**Constraint:** "Partial credit is never awarded without an explicit rubric" — violation = failure condition

---

### 18. /diagnostic/session — math input
**Component:** MathInputDemo
**Input formats accepted:** plain text (sqrt(2), x^2, 3/4) · LaTeX-like notation
**Normalise preview:** renders input as formatted math below the field
**Math keyboard (optional toggle):** grid of common symbols: √ · π · ² · ³ · × · ÷ · ≤ · ≥ · ∞
**Accessibility:** keyboard-navigable symbol grid · aria-label on each symbol button

---

### 19. /auth/reset (Password reset)
**Component:** PasswordResetDemo
**States (7):**
1. `request` — "Reset your password" · email input · "Send reset link" CTA
2. `email-sent` — "Check your email" · "We sent a reset link to [email]" · resend link (60s cooldown)
3. `set-password` — new password field + confirm + strength indicator + "Set new password" CTA
4. `success` — "Password updated ✓" · "Sign in now →"
5. `link-expired` — "This link has expired. Reset links are valid for 1 hour." · "Request a new link →"
6. `invalid-token` — "This link is not valid." · "Request a new link →"
7. `throttled` — "Too many requests. Try again in [N] minutes."

---

### 20. /sme/review (SME / teacher content review)
**Component:** SMEReviewFlow
**Views (5):**

**queue:**
- Summary: Pending [N] · Approved [N] · Flagged [N]
- Item list: type icon (❓ question / 📋 gap concept) · content preview · unit chip · submitted-by · date · Review button

**question-review:**
- Content displayed in monospace
- CBSE checklist (5 items):
  1. Content is factually correct for CBSE Class 10
  2. Language is age-appropriate and clear
  3. Answer/key is correct
  4. No bias, discriminatory language, or inappropriate content
  5. Exactly one correct option (MCQ)
- Approve → publishes to next content release
- Flag → requires reason text (blocks publication + notifies content team)

**gap-review:**
- Same checklist with item 5 replaced: "Concept aligns with NCERT syllabus"

**approved:** "Content approved ✓" · "This question/gap has been approved and will be included in the next content release."

**flagged:** "Content flagged 🚩" · "The content team has been notified. This question/gap will not be published until the issue is resolved."

---

## PILOT ENTITLEMENT — Data Model

```sql
-- pilot_entitlements table
-- NO foreign key to orders, subscriptions, or stripe_customers

CREATE TABLE pilot_entitlements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_email  text NOT NULL,
  parent_name   text NOT NULL,
  learner_count int  NOT NULL CHECK (learner_count BETWEEN 1 AND 4),
  scope         text NOT NULL CHECK (scope IN ('all', 'maths', 'science')),
  expiry_date   date NOT NULL,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'expired', 'revoked')),
  notes         text,
  added_by      uuid REFERENCES auth.users(id),
  added_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  revoked_by    uuid REFERENCES auth.users(id)
);

-- invitation_tokens table
CREATE TABLE invitation_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text UNIQUE NOT NULL,
  email       text NOT NULL,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  used_at     timestamptz,
  entitlement_id uuid REFERENCES pilot_entitlements(id)
);
```

---

## GOOGLE OAUTH — Integration Notes

**Parent account linking:**
- Provider: Supabase social (Google)
- Link: `supabase.auth.linkWithOAuth({ provider: 'google' })`
- Fresh sign-in: `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Error types handled: account_exists · network · cancelled · wrong_account

**Learner Google link:**
- Stored as `google_sub` on `learner_profiles` — NOT a second Supabase auth user
- Parent-action-only: learner cannot self-link
- Shown on learner sign-in only when: `google_sub IS NOT NULL AND parent_google_enabled = true`

---

## RESPONSIVE SPECIFICATIONS

### Mobile (375px base)
- Single column layout
- Stacked navigation (hamburger → full-height overlay)
- Bottom-sheet drawers (GapDetailDrawer slides up, 80% viewport height, drag handle)
- Full-width buttons (min-height 44px)
- Tab bars scroll horizontally if > 3 tabs
- PINInput: 4 boxes fill row width

### Tablet (768px)
- 2-column card grids
- Side panels replace bottom sheets (GapDetailDrawer → right-side panel, 360px)
- Navigation: full links visible, no hamburger
- Study plan: gap list 1-col, content panel 2-col

### Desktop (1280px)
- 3-column dashboard layout
- Sticky sidebar nav (learner dashboard, admin)
- Full data tables (PilotTable with all columns)
- Modal max-width 480px centered, overlay backdrop
- Max content width: 1200px centered

### Wide (1440px)
- Same as desktop with wider hero/marketing sections
- Max content width: 1200px (same — adds breathing room on sides)

---

## NATIVE FIGMA FILE — Manual Construction Required

**Why this is needed:** Figma Make generates React code in a browser preview. It cannot create native Figma frames, variables, or components in a .fig file. Lovable MCP tools (get_design_context, get_screenshot, get_variable_defs) operate on design files, not code previews.

**10-step construction guide:**
1. Open Figma → New File → name: "EduOS Foundation Design System"
2. Install Tokens Studio plugin from Figma Community
3. In Tokens Studio: Settings → Load tokens → paste eduos-design-tokens.json → Apply to document
4. Create Text Styles: Outfit/700 (Display Heading) · Outfit/600 (Display Label) · Inter/400 (Body) · Inter/500 (Body Medium) · Inter/600 (Body Semibold) · DM Mono/400 (Mono) · DM Mono/500 (Mono Medium)
5. Create Color Styles from all values in the tokens file
6. Build component frames using component-manifest.md — each component gets: frame + Auto Layout + constraints + variant properties
7. For each route in this manifest: create 3 frames named exactly:
   - "[Route] — Desktop" (1280px wide)
   - "[Route] — Tablet" (768px wide)
   - "[Route] — Mobile" (375px wide)
8. Fill each frame with the component compositions specified in this manifest
9. Publish library to Figma team workspace
10. Confirm get_design_context and get_screenshot resolve against published frame names

**MCP status after manual construction:**
| Tool              | Status   | Resolves against          |
|-------------------|----------|---------------------------|
| get_variable_defs | ✓ ready  | Variables panel in step 3 |
| get_design_context| ✓ ready  | Named frames from step 7  |
| get_screenshot    | ✓ ready  | Named frames from step 7  |
