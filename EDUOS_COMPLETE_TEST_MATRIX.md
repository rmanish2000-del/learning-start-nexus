# EduOS Complete Test Matrix

Scope: production-grade validation of routes, roles, workflows, forms and error paths.
Automated suite: `bunx vitest run` — 271 tests / 21 files.
Manual/E2E: headless Chromium against the running app (student session restored from a real auth user).

## 1. Route coverage

| Area | Route | Anon | Parent | Student | Educator | Reviewer | Admin | Result |
|---|---|---|---|---|---|---|---|---|
| Public | `/` | render | render | render | render | render | render | PASS |
| Public | `/about`, `/contact`, `/privacy`, `/terms` | render | render | render | render | render | render | PASS |
| Public | `/auth` | render (role chooser) | redirect to portal | redirect | redirect | redirect | redirect | PASS |
| Public | `/diagnostic` | checkout render | checkout | n/a | n/a | n/a | n/a | PASS |
| Public | `/diagnostic/session/:token` (bad token) | sign-in gate, no crash | friendly error | — | — | — | — | PASS |
| Public | `/diagnostic/complete/:token` (bad token) | graceful shell | graceful | — | — | — | — | PASS |
| Unknown | `/pricing`, `/this-route-does-not-exist` | 404 page | 404 | 404 | 404 | 404 | 404 | PASS |
| Workspace | `/home` | → `/auth` | → `/parent` | render | → role home | → `/launch-audit` | → role home | PASS |
| Workspace | `/dashboard` | → `/auth` | → `/parent` | → `/home` | render | → audit | render | PASS |
| Workspace | `/parent` | → `/auth` | render | → `/home` | → role home | → audit | → role home | PASS |
| Workspace | `/session/:id` (valid) | → `/auth` | not owner → guarded | review renders | — | — | — | PASS |
| Workspace | `/session/:id` (missing record) | → `/auth` | guarded | graceful, no crash | — | — | — | PASS |
| Support | `/quick-start`, `/help` | → `/auth` | render | render | render | render | render | PASS |
| Audit | `/launch-audit`, `/*-audit`, `/verification` | → `/auth` | → `/parent` | → `/home` | → role home | render | render | PASS |
| Admin | `/payment-settings` | → `/auth` | → `/parent` | → `/home` | → role home | → home | render | PASS |

## 2. Lifecycle coverage

| Lifecycle | Checks | Result |
|---|---|---|
| Assessment | draft sequencing (`clientRequestId`), publish, assign, run, submit, score, review breakdown | PASS |
| Diagnostic (parent) | purchase → token session → per-answer autosave → submit → report | PASS |
| Session result polymorphism | student `ResultEntry[]` and parent `DiagnosticReport` both render | PASS (regression test) |
| Payment | Razorpay order create, HMAC signature verify, webhook capture/fail/replay | PASS (webhook tests) |
| Entitlement | ₹199 diagnostic vs ₹2,999 annual plan gating | PASS |
| Gap analysis / evidence | gap generation, evidence chain, mastery history | PASS |
| AI tutor | intervention-scoped access, failsafe refusal | PASS |
| Curriculum | catalogue hierarchy, Class 10 2026–27 active year labelling | PASS |
| Auth / RLS | org isolation, learner isolation, role-scoped audit surfaces | PASS |

## 3. Error-handling matrix

| Case | Expected | Result |
|---|---|---|
| Empty required form fields | inline field message ("Enter your full name") | PASS |
| Invalid mobile number | inline field message, no raw JSON | PASS |
| Server validation failure (Zod) | sanitised sentence via `friendlyErrorMessage` | PASS |
| Database/Postgres error text | generic user sentence, technical text withheld | PASS |
| Stack-like error string | generic fallback only | PASS |
| Expired / missing session | redirect to sign-in, no crash | PASS |
| Unknown URL | branded 404 | PASS |
| Unauthorised route | redirect to role home | PASS |
| Missing / deleted record | guarded empty state | PASS |

## 4. Responsive

Rendered at 390×844, 820×1180 and 1280×1800 — no overflow or blocked primary actions on the audited routes.

## 5. Not covered automatically

- Live Razorpay checkout with real cards (sandbox verified only).
- Subject-expert approval of the 326 Class 10 draft items (content governance, not software).
