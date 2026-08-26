# EduOS — Identity-First Purchase Flow Validation

Status: implemented and verified
Scope: parent purchase ownership (diagnostic ₹199, Board Success Plan ₹2,999)

---

## 1. What changed

EduOS previously sold to anonymous visitors. Ownership of an order lived in a
random `access_token` in the URL — whoever held the link held the purchase.

Ownership is now the authenticated account:

| Object | Before | Now |
| --- | --- | --- |
| Order | access token in URL | `parent_user_id` + `learner_id` |
| Entitlement | order id only | `parent_user_id` + `learner_id` |
| Diagnostic run | access token | order → account + student |
| Report | access token | order → account + student |
| Upgrade | access token | inherits parent order's account |

Access tokens still exist as the route key, but they are no longer proof of
ownership: every read and write re-checks `parent_user_id` against the signed-in
user server-side.

---

## 2. First-time parent journey (exact)

```
Landing / pricing
  ↓  "Start diagnostic"
/diagnostic                     ← identity gate
  ↓  not signed in
/auth?tab=parent&mode=signup&next=/diagnostic
  ↓  Name + Email + Mobile + password  → parent profile created
/diagnostic                     ← signed in, 0 students
  ↓  Add student: Student name + Board + Class
/diagnostic                     ← student selected
  ↓  Board / Class / Subject / Unit chosen → Create order (guarded)
/diagnostic/checkout/<orderRef> ← contact details pre-filled from account
  ↓  Razorpay checkout → signature verified server-side
/diagnostic/session/<token>     ← gated: must be the owning account
  ↓  Submit
/diagnostic/report/<token>      ← gap report, gated
  ↓  Upgrade CTA
/upgrade/<token>                ← ₹199 credited, gated
```

Anonymous purchase is not reachable at any step.

---

## 3. Purchase guard

`createDiagnosticOrder` refuses unless **all four** hold:

1. Authenticated user (`requireSupabaseAuth` on the server function).
2. A parent profile exists for that user (name, email, mobile).
3. At least one student profile exists on that account.
4. The submitted `learnerId` belongs to that account.

Failure returns an error before any Razorpay order is created — no orphan
gateway orders, no orphan entitlements.

---

## 4. Enforcement points

| Layer | Mechanism |
| --- | --- |
| Route (UI) | `ParentAuthGate` on `/diagnostic`, checkout, session, report, upgrade |
| RPC | `requireSupabaseAuth` middleware on every parent diagnostic server fn |
| Server logic | `assertOrderOwner(row, userId)` on order read, checkout start, verify, failure record, run, report, upgrade |
| Database | RLS on `parent_orders` / `parent_entitlements` scoped to `parent_user_id = auth.uid()` |
| Webhook | Razorpay HMAC signature; ownership carried from the stored order, never from the request |

A stolen link is useless: the token resolves an order whose `parent_user_id`
does not match the caller, and the server rejects with
"Sign in with the account that made this purchase."

---

## 5. Returning user flow

```
/auth (parent tab, sign in)
  ↓
/parent  → Students card  +  Your purchases card
             ├─ paid, not submitted → Resume
             ├─ submitted           → View report
             └─ diagnostic paid     → Upgrade
```

The parent portal reads the account, not a URL token, so purchases survive a
lost link, a new device, or a cleared browser.

---

## 6. Verification

Automated: `bunx vitest run` — **42 tests passing (4 files)**, including the new
`K. Purchase ownership` group:

- anonymous caller cannot start checkout → rejected, gateway never called;
- a different signed-in account cannot start checkout or read the order;
- a granted entitlement carries the owning `parent_user_id`.

All prior payment acceptance scenarios (A–J: new purchase, signature
tampering, failure handling, webhook idempotency, upgrade credit) were
re-run against identity-owned orders and still pass.

Manual checks:

- `/diagnostic` signed out → sign-in/sign-up card, no purchase controls.
- Signed in with no student → "Add student" required before pricing appears.
- Direct navigation to `/diagnostic/report/<token>` signed out → gate, no data.

---

## 7. Known follow-ups (not blockers)

- Legacy orders created before this change have no `parent_user_id`; they are
  unreachable from the parent portal and require a manual claim if any exist in
  production.
- Mobile number is captured but not OTP-verified.
