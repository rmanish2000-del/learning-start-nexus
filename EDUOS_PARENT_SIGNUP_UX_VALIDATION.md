# EduOS — Parent-First Authentication UX Validation

Date: 2026-08-25
Scope: make parent registration obvious, without breaking the existing diagnostic gate.

---

## 1. What changed

| Requirement | Implementation |
| --- | --- |
| Public header shows Sign In + Create Account | Landing header (`src/routes/index.tsx`) and shared public page header (`src/components/public-layout.tsx`) now render a text **Sign In** link and a primary **Create Account** button. |
| `/auth` defaults to parent sign-in | `validateSearch` defaults `tab` to `parent`, `mode` to `signin`. Staff is no longer the default tab. |
| Parent CTAs on landing, hero, pricing, footer | Shared `ParentCtas` component (**Start Diagnostic** + **Create Parent Account**) rendered in the hero, in the new pricing block, and in the footer. |
| Diagnostic gate preserved | `/diagnostic` still renders `ParentAuthGate` for anonymous visitors, linking to `/auth?tab=parent&mode=signup&next=/diagnostic`. |
| Staff moved behind a secondary path | Staff tab is hidden unless `?tab=staff`; a small **Staff access** link at the bottom of `/auth` and in the landing footer reveals it. |
| Hindi parity | New CTA, pricing and footer strings added to `src/lib/i18n/hi.ts` with English fallback. |

Purchase rules were not touched: authentication, parent profile, student profile and an active student selection are still enforced server-side before any Razorpay order is created.

---

## 2. Entry points to registration (all new, all above the fold or in chrome)

1. Landing header → **Create Account** → `/auth?tab=parent&mode=signup`
2. Landing hero → **Create Parent Account**
3. Pricing block (`#pricing`) → **Create Parent Account**
4. Footer → **Create Parent Account**
5. About / Privacy / Terms / Contact header → **Create Account**
6. `/diagnostic` gate → **Create a parent account** (unchanged)

---

## 3. First-time parent journey — click count

| # | Screen | Action | Result |
| --- | --- | --- | --- |
| 1 | `/` Landing | Click **Create Parent Account** (header, hero, pricing or footer) | `/auth?tab=parent&mode=signup`, Parent tab active |
| 2 | `/auth` | Fill name, mobile, email, password → **Create parent account** | Authenticated parent, profile row created |
| 3 | `/diagnostic` | **Add student**: name, class, board → save | Student profile owned by the parent |
| 4 | `/diagnostic` | Select student, board/class/subject/unit → **Start diagnostic** | Order created (guard passes), `/diagnostic/checkout/<orderRef>` |
| 5 | Checkout | **Pay ₹199** → Razorpay | Payment captured, entitlement granted to `user_id` + `student_id` |
| 6 | `/diagnostic/session/<token>` | Take the diagnostic | Report at `/diagnostic/report/<token>`, upgrade at `/upgrade/<token>` |

**Clicks from landing to authenticated parent account: 2** (CTA + submit).
**Clicks from landing to paid diagnostic start: 5.**

Previously the only path was: landing → Start diagnostic → gate → create account (4 clicks, and no discoverable registration entry in the site chrome).

---

## 4. Browser verification (headless Chromium, localhost:8080)

| Check | Result |
| --- | --- |
| Landing header renders `Sign In` and `Create Account` | Pass |
| `Create Account` navigates to `/auth?tab=parent&mode=signup` | Pass |
| Tab list shows only **Parent** and **Student**; Parent active | Pass |
| Bare `/auth` opens with **Parent** tab active (not Staff) | Pass |
| Sign-up form fields present: full name, mobile, email, password | Pass |
| **Staff access** secondary link present at the bottom of `/auth` | Pass |
| `/diagnostic` still shows the identity gate when signed out | Pass |
| Console errors during the flow | None |

Screenshots captured during the run: landing hero with both CTAs, `/auth` parent sign-up screen, `/diagnostic` identity gate.

---

## 5. Residual notes

- Parents never land on Staff by default; staff must use `/auth?tab=staff` or the secondary link.
- `next=` deep-linking still works, so the gate returns the parent to `/diagnostic` after sign-up.
- No database, payment or entitlement logic was modified in this change.
