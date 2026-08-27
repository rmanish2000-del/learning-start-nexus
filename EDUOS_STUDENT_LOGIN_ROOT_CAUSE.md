# EduOS — P0 Student Login Failure Root Cause

Date: 2026-08-27 · Account under test: handle `earthpatel-e3ab7e1b`, PIN `123456`
Reported error: "That handle and PIN don't match. Check with your educator if you forgot them."

## Root cause

**No authentication account existed for this student when the founder tried to
sign in.** The learner record was correct in every respect, but its
`student_user_id` was empty, meaning no credential had ever been created for the
handle. Sign-in with a handle whose login does not exist produces exactly the
"handle and PIN don't match" message, because the sign-in call fails at the
credential lookup, not at the PIN comparison.

Why the credential was never created: the admin "Student logins → set PIN"
control was added to the codebase yesterday and has **not been published**. The
production site at www.eduos.global is still serving the previous build, which
has no such control, so the PIN the founder believed was set was never written
by any server call. Nothing in the login logic itself is broken — verified end to
end below.

## Audit table

| # | Check | Expected | Actual (before fix) | Result |
|---|---|---|---|---|
| 1 | Learner record exists | 1 row for Earth Patel | 1 row, id `ee1b33b7…d907d` | PASS |
| 2 | Handle stored in database | `earthpatel-e3ab7e1b` | `earthpatel-e3ab7e1b` | PASS |
| 3 | PIN / credential stored | An auth account with a password derived from the PIN | `student_user_id` empty; no account with `earthpatel-e3ab7e1b@student.eduos.local`; the only student accounts on the system were the seeded ones | **FAIL** |
| 4 | Learner active | `active` | `active` | PASS |
| 5 | Correct organization | Pilot org `11111111-…-111111111111` | Same | PASS |
| 6 | Login form sends handle + PIN | Both submitted, handle normalised to lowercase | Both submitted; normalisation confirmed in code | PASS |
| 7 | Authentication query can locate the learner | Credential lookup finds the handle's account | No account to find → generic mismatch error returned | **FAIL (consequence of 3)** |
| 8 | PIN derivation and comparison | Handle → `handle@student.eduos.local`, PIN → `PIN#handle`, compared by the auth service's own password hashing | Logic correct and deterministic; re-verified by a live sign-in after the account was created | PASS |
| 9 | Role assignment after login | `student` role row present | No role row existed (no account); after creation, exactly `student` | PASS after fix |
| 10 | Root cause | — | Credential never created because the admin PIN tool is unpublished | Identified |

## Complete login path traced

1. Sign-in page, Student tab — collects the handle and the 6-digit PIN.
2. The handle is normalised (trimmed, lowercased, punctuation stripped) and
   mapped to the synthetic address `<handle>@student.eduos.local`; the PIN is
   mapped to the derived password `<pin>#<handle>`.
3. The browser calls the platform's email/password sign-in with that pair.
4. The auth service looks up the address. **Missing address → generic
   "invalid credentials" → the UI shows the handle/PIN mismatch message.** This
   is where the founder's attempt stopped.
5. On success the session is created, the role row is read, and a `student`
   role routes the user to `/home`.

Steps 1, 2, 3 and 5 all behave correctly. Step 4 failed solely because of the
missing account.

## Remediation applied

- The login for `earthpatel-e3ab7e1b` has been created with PIN `123456`, email
  pre-confirmed, `student_user_id` linked back to the learner, and the `student`
  role assigned.
- Verified by an actual sign-in call against the live auth service using the
  handle and PIN exactly as a student would type them: **access token issued**.

Earth Patel can now sign in at the Student tab with handle
`earthpatel-e3ab7e1b` and PIN `123456`.

## Required to prevent recurrence

1. **Publish the current build.** Until that happens, neither the admin
   "Student logins" card nor the parent-portal "Create login" button exists on
   www.eduos.global, so no one can create a student credential in production and
   this failure will repeat for every new student.
2. Recommended follow-up (not yet implemented, awaiting your go-ahead): when a
   handle has no login yet, show "This student has no login yet — ask your
   parent or centre admin to create one" instead of the mismatch message, so the
   state is diagnosable without a database query.
