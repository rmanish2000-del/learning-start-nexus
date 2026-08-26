# EDUOS_PARENT_SIGNUP_PRODUCTION_FIX

Status: **FIXED AND PUBLISHED** — 2026-08-27

## 1. Symptom

Parent signs up → confirms email → is redirected to `/home` with role "Student"
and workspace "My Learning", instead of the Parent Portal / Create Student flow.

## 2. Root cause

Two defects compounding:

1. **Production was serving a pre-fix build.** The live sign-in bundle
   (`/assets/auth-DZkbYqtf.js`) still contained the original resolver:

   ```js
   async function O(e){
     let {data:t}= await a.from(`user_roles`).select(`role`).eq(`user_id`,e).limit(1).maybeSingle();
     return t?.role ?? `student`;      // <-- hard-coded student fallback
   }
   ```

   Any account with **no role row** was treated as a student and routed to `/home`.

2. **Role creation was client-side only and fragile.** The signup trigger
   `handle_new_user()` created a `profiles` row but **never** a `user_roles` row.
   The parent role depended on browser code (`claimParentRole`) running after
   email confirmation. When the confirmation link opened in a different
   browser/device (or the claim call failed), the account was left role-less and
   fell through to the "student" default above.

## 3. Database evidence (before fix)

```
email                        role     profile
---------------------------  -------  -------------
shalinipatel5883@gmail.com   <nil>    Shalini Patel   <-- affected account
rmanish2000@yahoo.co.in      parent   MANISH PATEL
```

`auth.users.raw_user_meta_data` for both accounts contained only
`full_name / email / sub` — no `signup_role`, no `phone` — confirming the
signups were created by the pre-fix build.

## 4. Affected code path

- `public.handle_new_user()` (signup trigger) — created profile only, no role.
- `src/routes/auth.tsx` → `resolveRole()` — `?? "student"` fallback.
- `src/routes/_authenticated/route.tsx` → `roleHomePath(role)` — routed the
  wrongly-inferred `student` role to `/home` / "My Learning".

## 5. Fix

**Database (migration applied):**

- `handle_new_user()` now writes the profile **and** the `user_roles` row from
  `raw_user_meta_data->>'signup_role'` (`parent | student | educator | reviewer`),
  plus the signup `phone`. Role assignment happens atomically at account
  creation — no browser round-trip required.
- Backfill: every profile with no role row was set to `parent` (self-service
  signup is parent-only in EduOS).

**Application:**

- `src/routes/auth.tsx`: removed the `"student"` fallback. If the role row is
  missing, the app claims the parent role and returns `parent`; a failed claim
  is logged, never silently downgraded.
- `src/lib/learners.functions.ts`: admin-created learner accounts now pass
  `signup_role: "student"` so the trigger assigns the correct role for them.

## 6. Verification

**Database after fix**

```
email                        role     phone
---------------------------  -------  ----------
shalinipatel5883@gmail.com   parent   -
rmanish2000@yahoo.co.in      parent   -
meera.patel@eduos.dev        parent   9876543210
```

**Production build after publish** — new sign-in bundle
`/assets/auth-Dq-jIwF_.js` now contains:

```js
if(t?.role) return t.role;
... try{ await C({data:{fullName:r, ...}}) }catch(e){ console.error(`[auth] parent role claim failed`,e) }
return `parent`;
```

The `"student"` fallback is gone from the shipped bundle.

**End-to-end session test** (signed in as the affected account
`shalinipatel5883@gmail.com`):

| Entry URL | Landing URL | Result |
|-----------|-------------|--------|
| `/auth`   | `/parent`   | PASS — Parent Portal |
| `/home`   | `/parent`   | PASS — student workspace no longer reachable |

**Screenshot after fix:** `Parent portal` with the "How EduOS Works" parent
onboarding dialog (Record consent → Follow the learning loop → Track progress →
Talk to the educator) — captured at
`/tmp/browser/pfix/screenshots/1_after_auth.png`.

**Regression suite:** 46/46 tests pass; typecheck clean.

## 7. Residual notes

- Existing affected accounts are repaired; no user action needed.
- Future signups get their role from the database trigger, so the flow no longer
  depends on which browser opens the confirmation email.
