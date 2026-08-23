# EduOS Phase 1 — Platform Foundation

A learning-intelligence platform for tutoring centers with role-based access for Admin, Educator, and Student. Phase 1 ships auth, role-based navigation, dashboards, learner management, and a learner profile — all on realistic seeded demo data. No AI tutor, recommendations, assessment engine, mastery calculation, or intervention logic.

## Resolved decisions

- Entry point: app opens straight to the login page (no marketing landing).
- Student login: Handle + 4-digit PIN, accounts created by staff.
- Demo data: rich seed — 1 admin, 3 educators, ~12 learners (grades 5–8), plus tasks/metrics/assessment history.

## 1. Foundation

- Enable Lovable Cloud (database, auth, server functions).
- Design system in `src/styles.css`: professional SaaS tokens (Linear/Notion/Stripe feel) — neutral surfaces, one confident accent, subtle borders/shadows, full light + dark palettes via oklch. Class-based dark mode with a theme toggle (system default, persisted).
- Typography: Geist Sans for UI + Geist Mono for numeric/data (loaded via @fontsource, wired in `@theme`).
- App shell: shadcn sidebar layout with role-filtered nav, org branding, user menu, theme toggle, sign-out. Add needed shadcn components (sidebar, card, table, tabs, badge, dialog, select, input, dropdown-menu, avatar, skeleton, sonner).

## 2. Database schema + seed (single migration, with GRANTs + RLS)

- `app_role` enum: `admin`, `educator`, `student`.
- `organizations` — org profile (name, tagline, contact info) for Settings.
- `profiles` — id → auth.users, full_name, org_id; auto-created via signup trigger.
- `user_roles` — (user_id, role), plus `has_role()` security-definer function.
- `learners` — org_id, student_user_id → auth.users, full_name, handle (unique), grade, subject, status (`active` / `needs_attention` / `paused`), assigned educator_id, mastery_score, mastery_lift, focus note.
- `mastery_history` — (learner_id, recorded_on, score) for Mastery tab + Progress charts.
- `learner_assessments` — (learner_id, title, subject, taken_on, score, status) for the Assessments tab.
- `learning_items` — (student_user_id, title, subject, kind: lesson/practice/review, status, progress_pct, due) powering Continue Learning, Today's Tasks, Learning page.
- RLS: admins manage everything in their org; educators read/update their assigned learners; students read only their own learner row and learning items. GRANT statements for every table.
- Seed (literal INSERTs in the migration): auth users via SQL with hashed passwords — admin@eduos.dev, 3 educators (priya.nair@, marcus.reed@, sofia.alvarez@eduos.dev), ~12 students incl. **Aarav Sharma (Grade 6, Mathematics)** with mastery history, assessments, and tasks for every student.

## 3. Authentication

- `/auth` public route with two tabs:
  - **Staff** (Admin/Educator): email + password via `signInWithPassword`.
  - **Student**: Handle + 4-digit PIN. Handle normalizes to a synthetic email (`<handle>@student.eduos.local`); the PIN maps to a deterministic derived password — so standard Supabase email auth works with no custom session minting. Trade-off (confirmed): no email-based password recovery for students; staff reset PINs by editing the learner.
- Enable `auto_confirm_email` (auth config) so seeded + staff-created accounts sign in immediately; the login page shows demo credentials.
- Role-aware redirect after login: admin/educator → `/dashboard`, student → `/home`. Root `/` redirects to `/dashboard` (the managed `_authenticated` gate bounces signed-out users to `/auth`).
- Root `onAuthStateChange` subscriber (filtered to identity transitions) + sign-out hygiene (cancel queries, clear cache, sign out, replace-navigate to `/auth`).

## 4. Routes & role-based navigation

All app routes under `_authenticated/`; nav items filtered by role from the user's `user_roles` row.

| Route | Roles | Content |
|---|---|---|
| `/dashboard` | admin, educator | Educator: 4 stat cards — Active Learners, Learners Needing Attention, Active Interventions, Average Mastery Lift — computed from seed. Admin: org summary (users, learners by status, educators). |
| `/users` | admin | Users table (name, email, role), Add User dialog (name, email, role → admin API creates auth user + role), role reassignment. |
| `/learners` | admin, educator | Search + Grade filter + Status filter; table: Student Name, Grade, Subject, Status → row opens profile. Admin extras: Add Learner dialog (creates student account: name, handle, PIN, grade, subject, assign educator). |
| `/learners/$learnerId` | admin, educator | Profile header + 5 tabs: Overview, Mastery (history chart), Assessments (seeded list), Learning Plan (seeded plan), Evidence (seeded work samples). |
| `/settings` | admin | Organization Profile form (name, tagline, contact). |
| `/settings` | educator | Own profile + appearance. |
| `/assessments`, `/interventions` | educator | Phase 2 placeholder pages (styled empty states, clearly marked "Coming in Phase 2"). |
| `/home` | student | Welcome message, Continue Learning card, Today's Tasks checklist, Progress Summary. |
| `/learning` | student | Seeded learning modules by subject with progress. |
| `/progress` | student | Mastery chart from `mastery_history`, subject breakdown, stats. |

Student accounts never see staff routes (role-gated redirect to `/home`); staff hitting student routes redirect to `/dashboard`.

## 5. Server functions

Thin `createServerFn` wrappers in `src/lib/*.functions.ts`, all `requireSupabaseAuth` except none public; privileged operations (Add User, Add Learner, role assignment, PIN reset) verify `has_role(..., 'admin')` (educator for Add Learner) before loading `supabaseAdmin` inside the handler. Zod validation on every input. Learner/dashboard reads use the RLS-scoped context client.

## 6. Verification

- Build passes; every route has head() metadata (unique titles/descriptions; no og:image without a real asset).
- Playwright pass: sign in as admin, educator, and student (Aarav Sharma + PIN); confirm each role's nav, educator dashboard cards, learner search/filters, Aarav's profile tabs, student home, dark/light toggle, sign-out.

## Out of scope (Phase 2)

AI Tutor, Recommendation Engine, Assessment Engine, real mastery calculations, intervention logic — only navigation placeholders.
