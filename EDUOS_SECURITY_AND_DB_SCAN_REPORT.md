# EduOS Security and Database Scan Report

**Last verified:** 2026-08-27 (UTC)
**Evidence source:** Lovable security scan (supabase, supabase_lov, wiz, app_mcp),
Postgres security linter, `pg_policies`, repository grep, `vitest`.
All checks were read-only; no destructive fix was applied.

---

## Summary

| Severity | Count | Items |
|---|---|---|
| **P0** | 0 | — |
| **P1** | 1 | staff phone numbers readable org-wide |
| **P2** | 2 | `SECURITY DEFINER` function executable by signed-in users; RLS-enabled table with no policy (intentional) |

No critical finding. Nothing blocks the live pilot.

---

## Findings

### P1 — Staff phone numbers visible to all org members
`profiles` policy *Members view profiles in their own org* lets any signed-in
member of an organisation read every colleague's `phone`. Scoped to one
organisation (no cross-tenant leak) and limited to staff contact data, so it is
not a launch blocker. **Recommended fix (not applied, needs a product call):**
expose `phone` through a view restricted to admins/educators.

### P2 — Signed-in users can execute a `SECURITY DEFINER` function
Pre-existing finding, unchanged by this assignment. The new
`expire_stale_parent_orders()` is **not** the cause: it was created with
`REVOKE ALL … FROM PUBLIC, anon, authenticated` and `GRANT EXECUTE … TO service_role`.
Remaining definer functions are the `private.*` RLS helpers, which must run with
owner rights for tenant isolation to work.

### P2 — RLS enabled, no policy: `public.payment_credentials`
**Intentional and correct.** The table holds AES-256-GCM encrypted gateway
credentials; with RLS on and zero policies it is unreachable by `anon` and
`authenticated` and readable only by the service-role server code. Accepted, not
a defect.

---

## Checks performed

| Check | Result |
|---|---|
| Repository security scan (wiz / app_mcp) | 0 findings |
| Dependency scan | no vulnerable package reported |
| Database linter | 1 INFO, 1 WARN (above) |
| RLS / policy review | every public table has RLS; only `payment_credentials` is deliberately policy-less |
| Cross-tenant access checks | `private.*` definer helpers enforce `org_id` matching; existing RLS verification centre probes pass |
| Secret exposure scan | no key, secret or token in source, reports or client bundles; `.env` holds only publishable values; server secrets read inside handlers only |
| Payment integrity | 4 paid orders / 4 entitlements, no orphans, no duplicate captures, all live deliveries signature-valid |
| Entitlement integrity | no entitlement without a paid parent order |
| Automated tests | `vitest` **46 / 46 passing** |
| Typecheck | clean |

---

## Not applied on purpose

- No policy rewrite for the `profiles.phone` exposure (product decision needed).
- No revocation on the shared `private.*` helpers — revoking would break tenant
  isolation.
- No destructive data fix anywhere; the only writes were the documented
  verification, expiry and archive updates.
