# Acceptance Criteria — Centre Admin First-Login

## P0 — Critical (must pass before any release)

- [ ] Payment Settings is completely absent from the DOM for all accounts except `rmanish2000@gmail.com`. Not conditionally hidden. Not returned as 403. Absent.
- [ ] Quick Start nav item is present and pinned at position 1 on first login. Removed automatically when all 6 checklist steps complete.
- [ ] Sample workspace is clearly labelled SAMPLE on every screen and in every export.
- [ ] Sample data is isolated — never appears in production reports, billing, compliance, or evidence chain.
- [ ] Remove Sample Workspace completes in one action with confirmation. Removal is atomic (transaction). Removal is logged.
- [ ] Payment Settings gate is enforced **server-side** — never client-side only.

## P1 — High

- [ ] Every visible route implements: loading, error/retry, zero-data (actionable), populated, primary next action states.
- [ ] Loading states use skeleton shimmer, not spinner-only. Sidebar nav remains interactive during loading.
- [ ] Error states show a friendly message + Retry + `support@eduos.global`. No technical stack traces.
- [ ] Zero-data states have an actionable primary CTA. Never "No data found" without a next step.
- [ ] Checklist progress is stored server-side. Client does not assume state from local storage alone.
- [ ] Help is always visible and never greyed, regardless of setup progress.

## P2 — Standard

- [ ] Centre Admin role accent is `#2563EB`, distinct from educator (`#0D9488`), reviewer (`#6D28D9`), and learner (`#EA580C`).
- [ ] All pricing shown matches exactly: ₹0 / ₹199/month / ₹2,999/month / ₹2,800/month.
- [ ] No real learner names, no private gap data, no internal test data visible in any screen.
- [ ] Mobile layout (360px+) has bottom nav with 5 items max. Sidebar hidden on mobile.
- [ ] All interactive elements meet WCAG 2.1 AA: 4.5:1 contrast (body), 3:1 (large text and UI components).
- [ ] Focus rings visible on all interactive elements. Not suppressed.
- [ ] All icon-only buttons have `aria-label`. Nav items have `aria-current="page"` when active.

## P3 — Nice to have

- [ ] Micro-interactions and transitions on checklist step completion.
- [ ] Export to PDF in Reports tab (after populated state).
- [ ] Onboarding guide accessible from Help with deep links to each checklist step.

## Out of scope

- Actual PDF/ZIP/binary export from the design tool environment.
- Real learner data in any design or prototype.
- Deployment of any code to production.
