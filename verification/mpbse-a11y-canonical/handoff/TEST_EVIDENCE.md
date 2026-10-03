# Live staging UAT — https://eduos-staging.lovable.app (styles-CEoXcQt9.css), 2026-10-03
Learner: stg-sc-asmt@student.eduos.local
| Check | Desktop | Mobile |
|---|---|---|
| Signed-out cold load /exam-pattern -> /auth?next=%2Fexam-pattern | PASS | - |
| Signed-in cold load /exam-pattern stays on page | PASS | PASS |
| next=//evil.com kept as inert param on /auth (open redirect rejected on sign-in, preview-verified) | PASS | - |
| Founder-only routes (/admin/payment-settings, /admin/pilot-access, /admin/feedback) redirect learner to /home | PASS | PASS |
| 9/9 official mpbse.nic.in links | PASS | PASS |
| MPBSE practice disabled (9/9 "coming soon") | PASS | PASS |
| Hindi + English lang attributes | PASS | PASS |
| axe WCAG 2 A/AA | 0 (after sidebar fix; first run found 3 contrast issues) | 0 |
| No horizontal scroll, no page errors | PASS | PASS |
| CBSE regression (CBSE page renders) | PASS | PASS |
| Timed attempt: answer, reload restores, submit, score, history | - | PASS |
| Saved answers removed after submit | - | PASS |
| Shared device: other owner's saved attempt wiped on load | - | PASS |
| Sign-out clears all eduos.pyq.* keys | PASS | - |
Automated: vitest 505/505.
