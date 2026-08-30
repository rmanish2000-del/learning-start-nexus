# EduOS UAT Execution Report

Executed against the running application with a real (non-mocked) authenticated student
account and anonymous browsing. Screenshots and console/network capture were taken per step.

## Journey A — Parent

| Step | Observation | Verdict |
|---|---|---|
| Landing → sign up | Role chooser presents Parent / Student / Educator paths correctly | PASS |
| Add learner without profile details | `ParentDetailsCard` renders inline; empty submit shows "Enter your full name" / "Enter a valid mobile number" — no raw JSON | PASS (defect A fixed) |
| Learning check / diagnostic purchase | ₹199 checkout renders, identity required before payment | PASS |
| Diagnostic run | Autosave per answer, resumable link, submit → report | PASS |
| Upgrade to ₹2,999 plan | Plan offer and entitlement gating active | PASS |

## Journey B — Student

| Step | Observation | Verdict |
|---|---|---|
| Sign in (handle + PIN) | Lands on `/home` learner workspace | PASS |
| Open submitted assessment `/session/b63963f9-…` | Renders "0% (0/6 correct)" and full per-question review with correct answers and outcome codes. No error page, zero page errors | PASS (defect B fixed) |
| Missing / foreign session id | Guarded state, no crash, no stack trace | PASS |
| Progress and mastery | Mastery card renders empty-state copy when no history | PASS |
| Cross-role probes (`/dashboard`, `/parent`) | Redirected to `/home` | PASS |

## Journey C — Educator / Reviewer / Admin

| Step | Observation | Verdict |
|---|---|---|
| Educator session review dialog | Per-question breakdown reads results defensively; diagnostic-shaped results no longer break the dialog | PASS |
| Reviewer | Confined to audit surfaces; workspace routes bounce to `/launch-audit` | PASS |
| Admin audit + curriculum + payment settings | Reachable only for admin role | PASS |

## Negative testing

Empty forms, invalid inputs, invalid URLs, unauthorised access, missing records and
malformed tokens were exercised across public, parent, student and workspace routes.
No raw JSON, no stack traces, no unhandled crash pages were observed in any case.
