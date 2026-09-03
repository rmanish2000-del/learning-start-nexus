# EduOS Payment Settings Security Audit

Date: 2026-08-26 · Scope: `/payment-settings` and the Razorpay credential stack
Decision: **SAFE_FOR_LIVE_KEYS** (after fixes applied in this audit)

## Verification results

| # | Requirement | Result | Evidence |
|---|-------------|--------|----------|
| 1 | No secret ever returned to browser APIs | ✅ Pass | Every server function (`getPaymentSettingsFn`, `savePaymentSettingsFn`, `clearPaymentSettingsFn`, `testPaymentSettingsFn`) returns only `razorpayCredentialStatus()` — masked key id (`rzp_live…••••XXXX`) + boolean flags — or `{ ok, message }`. No code path returns `keySecret` / `webhookSecret`. |
| 2 | Secrets encrypted at rest | ✅ Pass (fixed in this audit) | `key_secret` and `webhook_secret` are now AES-256-GCM encrypted before insert (`v1:<iv>:<tag>:<ct>`). Key derived via HKDF-SHA256 from the service-role key, which never leaves the server. A raw table read yields ciphertext only. Legacy plaintext rows are transparently decrypted and upgraded on next save. 4 new crypto tests (round-trip, unique IV, tamper rejection, legacy passthrough). |
| 3 | Only admin role can access `/payment-settings` | ✅ Pass (hardened in this audit) | Three layers: (a) layout `beforeLoad` in `_authenticated/route.tsx` redirects any non-admin away from `/payment-settings`; (b) the page component renders an admin-only notice and disables queries for non-admins; (c) every server function enforces `requireAnyRole(..., ["admin"])` server-side — the RPC endpoint is the real security boundary. |
| 4 | Educator, Parent, Student, Reviewer cannot access | ✅ Pass | Route gate: parent → bounced to `/parent` (allowlist), student → `/home` (allowlist), reviewer → `/launch-audit` (allowlist), educator → now redirected by the new admin-only rule. Server functions reject all four roles with a permission error. Sidebar link is `roles: ["admin"]` only. |
| 5 | Audit log records key updates, secret updates, environment switches | ✅ Pass (added in this audit) | New append-only table `public.payment_credential_audit` records every `save` (key + secret update, incl. test↔live mode switch), `clear` (source switch back to environment keys) and `test` (connection check), with actor, prev/next mode and source, masked key id, timestamp. RLS: SELECT for admins only; no UPDATE/DELETE for anyone; inserts via service role only. Visible on the page as "Credential audit log". |
| 6 | Connection test does not expose credentials | ✅ Pass | `testRazorpayCredentials` runs server-side only, returns `{ ok, message }` (e.g. "Razorpay accepted the live keys" / "rejected (401)"). Credentials never leave the server; errors are generic. |
| 7 | Live/Test mode switch cannot be triggered by non-admins | ✅ Pass | Mode is derived from the key id prefix (`rzp_live_` / `rzp_test_`); the only mutation paths are `savePaymentSettingsFn` and `clearPaymentSettingsFn`, both admin-gated server-side. There is no client-controllable mode flag. |

## Fixes applied during this audit

1. **Encryption at rest** — secrets were stored as plaintext in `public.payment_credentials`; now AES-256-GCM with an HKDF-derived key (`src/lib/payment-credentials.server.ts`).
2. **Audit trail** — new `payment_credential_audit` table + writes on save/clear/test; admin-visible history card on `/payment-settings`.
3. **Route gate** — `_authenticated/route.tsx` now redirects non-admins from `/payment-settings` (previously only the page component and server fns blocked educators).

## Residual notes

- `payment_credentials` intentionally has RLS enabled with **no policies** — only the service role can read/write it. This is a design choice (linter INFO), documented in security memory.
- The `private.has_role` security-definer function remains executable by signed-in users by design; RLS policies depend on it (linter WARN, pre-existing).
- Secrets transit the browser once on **submit** (admin pasting keys) over TLS — unavoidable and standard for key entry; they are never rendered back.

## Tests

46/46 vitest cases pass, including 4 new credential-crypto tests.

## Decision

**SAFE_FOR_LIVE_KEYS** — live `rzp_live_*` credentials and the webhook secret can be stored via `/payment-settings`.


---

## 2026-09-03 — P0 remediation: `payment_credentials_admin_readable_secrets`

**Finding.** `public.payment_credentials` carried four `TO authenticated`
policies gated only on `private.has_role(auth.uid(), 'admin')`. That role check
is *not* organisation-scoped, so an admin of any tenant matched it. No table
privilege was granted to `anon`/`authenticated`, so the rows were not actually
reachable through the Data API — but a single future `GRANT` would have silently
exposed platform-wide gateway secrets. Treated as a real P0 latent exposure.

**Proof taken before the fix.**
`has_table_privilege('authenticated','public.payment_credentials','SELECT')` =
false (no live read path), while `pg_policies` showed the four admin policies
present and org-agnostic (latent cross-organisation access).

**Remediation applied (migration `20260903045542_…`).**
- Dropped all four `payment_credentials` authenticated policies and the dead
  admin SELECT policy on `payment_credential_audit`.
- `REVOKE ALL … FROM anon, authenticated` on both tables; `service_role` retains
  full access to `payment_credentials` and `SELECT, INSERT` on the audit table.
- RLS re-asserted on both tables — enabled with **zero** policies, so the only
  access path is the service-role server module.
- Audit trail made immutable: a `BEFORE UPDATE OR DELETE` trigger
  (`payment_credential_audit_immutable`) raises, making the log append-only.

**Post-fix verification.** `pg_policies` count for both tables = 0;
`has_table_privilege` false for `anon` and `authenticated` on SELECT/UPDATE and
on the audit table; `service_role` SELECT = true.

**Application paths.** Unchanged and still working: all reads/writes go through
`src/lib/payment-credentials.server.ts` using the service-role client; the admin
UI, connection test, webhook signature verification and order creation all
resolve credentials server-side. Server functions in
`payment-settings.functions.ts` remain admin-gated and return masked status only.

**Regression tests.** `src/lib/__tests__/payment-credential-access.test.ts` —
12 cases covering policy removal, privilege revocation, service-role grant,
audit immutability, no later re-grant, admin-client-only table access, no
browser-facing module touching the tables, write-only status shape, masked-only
audit inserts, no secret logging, and no live-key literals. Suite: 320/320.

**Rotation assessment.** `public.payment_credentials` is **empty** (no stored
override); live gateway credentials exist only as platform environment secrets,
which were never exposed by this finding, never returned to a client, and never
present in the repository or build output. **Rotation is therefore not required.**
If the founder still wants precautionary rotation, that is the single unavoidable
external dependency (Razorpay Dashboard → Settings → API Keys / Webhooks); all
technical readiness is complete — new keys can be pasted into `/payment-settings`
with zero code change, and the change is recorded in the immutable audit log.
