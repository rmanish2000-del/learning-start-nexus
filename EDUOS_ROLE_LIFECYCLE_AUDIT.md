# EduOS Role Lifecycle Audit

Date: 2026-08-26 · Scope: Parent, Student, Educator, Staff (admin/educator workspace), Admin, Reviewer

## Method

- Source review of the route gate (`src/routes/_authenticated/route.tsx`), role helpers (`src/lib/roles.ts`), auth screen (`src/routes/auth.tsx`), parent account RPCs (`src/lib/parent-account.functions.ts`).
- Live database inspection of `auth.users`, `public.user_roles`, `public.profiles`.
- Automated suite: 42 tests passing (`vitest run`), typecheck clean.

## Per-role matrix

| Role | A. Signup URL | B. Email confirmation | C. First login route | D. Dashboard | E. Permissions | F. Persistence |
|---|---|---|---|---|---|---|
| Parent | `/auth?tab=parent&mode=signup` (CTAs on landing hero, pricing, footer, header, `/diagnostic` gate) | Supabase confirmation mail, `emailRedirectTo=/auth`; on return the role is claimed via `claimParentRole` | `/parent` | `/parent` | Portal, purchases, students, reports only. Blocked from every staff/student/audit route | Session persisted; gate re-resolves role each load |
| Student | No self-service. Provisioned by staff (handle + 6-digit PIN, synthetic `@student.eduos.local` email) | Not applicable — no inbox; accounts are pre-confirmed | `/home` | `/home` | `STUDENT_ALLOWED_PATHS` only: home, session, assessment, tutor, settings, quick-start, help. No billing, purchases or parent features | Handle+PIN sign-in on `/auth?tab=student` |
| Educator | Invite/provision by admin (staff tab sign-in) | Standard email confirmation | `/dashboard` | `/dashboard` | Learners, assessments, interventions, curriculum. Blocked from `/parent`, audit routes, org-admin surfaces | Standard email/password session |
| Staff (admin/educator shared workspace) | `/auth` → "Staff sign-in" | Standard | `/dashboard` | `/dashboard` | Per underlying role | OK |
| Admin | Provisioned | Standard | `/dashboard` | `/dashboard` | Full workspace + all audit routes + org settings (RLS scoped to own org) | OK |
| Reviewer | Provisioned | Standard | `/launch-audit` | `/launch-audit` | Read-only audit surfaces only | OK |

## Findings

1. **FIXED — P0: missing role row silently defaulted to `student`.**
   The protected-route gate resolved `role ?? "student"`. A parent whose profile write was deferred by email confirmation, arriving directly at a workspace URL (not via `/auth`), was classified as a student and bounced into `/home` — the reported "Parent lands in Student workspace" defect class.
   Fix: the gate no longer guesses. A user with no role row is redirected to `/auth?tab=parent`, where `resolveRole` claims the `parent` role from signup metadata and routes to `/parent`. Every provisioned role (admin, educator, student, reviewer) always has a role row, so the redirect only ever affects unclaimed self-service parents.

2. **Cross-role leakage: none found.** The gate enforces four independent guards — reviewer allow-list, parent allow-list, student allow-list, audit-path admin/reviewer check — plus `roleHome()` fallbacks. Server functions independently enforce role and org scope (`requireAnyRole`, `callerOrgId`, `requireAuditRole`), so a direct RPC call cannot bypass the UI gate.

3. **Data integrity: clean.** All 23 auth users have both a role row and a profile row. Distribution: admin 1, educator 5, student 14, reviewer 1, parent 2. No orphans, no duplicate role rows.

4. **Student isolation confirmed.** No billing, purchase, or parent surface is reachable from `STUDENT_ALLOWED_PATHS`; `/parent` explicitly redirects non-parents to their role home.

5. **Educator isolation confirmed.** `/payment-audit` and all `AUDIT_PATHS` are admin/reviewer only; `/parent` is parent only; org settings writes are RLS-scoped to the caller's organization.

## Status

Role lifecycle: **PASS** (with the P0 gate fix applied in this change).
