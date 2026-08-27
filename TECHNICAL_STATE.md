# EduOS — Technical State

**Last verified:** 2026-08-27 (UTC)
**Evidence sources:** repository at commit `6f570d0`, `package.json`, `src/routes` and `src/lib` listings, live database introspection, `bunx vitest run`, runtime secret presence check.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start v1 (React 19), file routes in `src/routes` |
| Build | Vite 7, Tailwind CSS v4 via `src/styles.css` |
| Runtime | Edge/Worker (Cloudflare workerd) for SSR and server functions |
| Backend | Lovable Cloud (Postgres + Auth + Storage) |
| Server logic | `createServerFn` in `*.functions.ts`, implementations in `*.server.ts` |
| Public HTTP | `src/routes/api/public/*` (Razorpay webhook) |
| AI | Lovable AI Gateway via `@ai-sdk/openai-compatible` (`src/lib/ai-gateway.server.ts`) |
| Tests | Vitest — **46 passing, 5 files** (2026-08-27) |
| Typography | Geist / Geist Mono; dark + light themes |

## 2. Code shape

- ~41 authenticated routes, 16 public routes/entries.
- Domain modules follow a strict triple: `X-shared.ts` (pure), `X.server.ts` (privileged), `X.functions.ts` (thin RPC wrappers).
- Notable modules: `study-plan`, `parent-account`, `parent-diagnostic`, `payment-audit`, `payment-credentials`, `razorpay`, `curriculum`, `blueprint`, `question-bank`, `diagnostic`, `gap`, `interventions`, `outcomes`, `tutor`, plus nine audit modules.
- Auth attachment: `src/start.ts` registers client-side bearer middleware; protected server fns use `requireSupabaseAuth`.

## 3. Database (verified counts)

| Table | Rows |
|---|---|
| `books` | 4 (3 approved Class 10, 1 archived Grade 3) |
| `curriculum_units` | 19 |
| `curriculum_chapters` | 92 |
| `assessment_outcomes` | 96 |
| `question_bank` | 289 — `import` 210, `ai` 51, `manual` 28 |
| `learners` | 17 |
| `parent_orders` | 7 (paid 4, created 2, failed 1) |
| `parent_entitlements` | 4 |
| `payment_webhook_events` | 121 |
| `auth.users` | 25 |
| `user_roles` | admin 1, reviewer 1, educator 5, parent 3, student 15 |

Schema notes verified this pass: `assessment_outcomes` has **no** `chapter_id` column (outcome→chapter linkage is indirect); `parent_entitlements` has no `product_code` column, it uses `kind` (`diagnostic_credit` observed); `profiles` has no `user_id` column. Treat older doc snippets that reference those columns as wrong.

## 4. Security

- RLS enabled across public tables with GRANTs; org isolation via `private` schema `SECURITY DEFINER` helpers to avoid recursive policies.
- `organizations` UPDATE policy scoped to the admin's own org in USING and WITH CHECK.
- Payment credentials stored AES-256-GCM encrypted; admin-only `/payment-settings`.
- Webhook: HMAC verified before parsing; duplicate event ids recorded as duplicates; handler throws 500 to force gateway retry.
- Open accepted warning: one `SECURITY DEFINER` function executable by signed-in users (the org-scoping helper).
- ⚠️ **Unverified:** no security scan or linter run since the Class 10 import and the study-plan work.

## 5. Payments

- `src/lib/razorpay.server.ts` reads `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` at call time; `razorpayMode()` derives mode from the key prefix. No test/live code branches.
- **Verified 2026-08-27:** all three secrets are present and `RAZORPAY_KEY_ID` begins with `rzp_live`. Earlier reports claiming a test-mode blocker are stale.
- ⚠️ **Unverified:** that `RAZORPAY_WEBHOOK_SECRET` is the live-mode endpoint secret, and that a real live capture has completed.
- Webhook endpoint: `https://www.eduos.global/api/public/razorpay-webhook`, events `payment.captured`, `payment.failed`.

## 6. Content pipeline

- Book upload → PDF extraction (`unpdf`) → curriculum spine → outcomes → question bank → concept graph.
- Class 10 import is idempotent through `question_bank.external_ref` (unique index); `question_bank.source` check constraint allows `import`.
- Storage buckets hold uploaded source books.

## 7. Known technical debt

1. Duplicate single-chapter Science book (`26ac60d7…`) overlapping the full Science pack.
2. Maths pack is intentionally thin (15 outcomes / 45 atoms) — diagnostics may report allocation shortfalls for large blueprints.
3. Imported questions remain `draft` / `unverified` pending Verification Center sign-off.
4. Legacy pre-identity orders (if any) carry no `parent_user_id` and are unreachable from the parent portal.
5. Mobile numbers unverified (no OTP).
6. SEO metadata, JSON-LD and staff/audit surfaces are English-only.
7. Apex domain `eduos.global` still awaiting DNS; only `www` is live.

## 8. Commands

```
bun run dev        # dev server on :8080
bunx vitest run    # 46 tests
bun run build      # production build
```

---

### Update protocol

Updated by the Lovable agent after any schema migration, dependency change, secret change, or test-count change. Counts in §3 must be re-queried, not copied. The founder does not normally edit this file.
