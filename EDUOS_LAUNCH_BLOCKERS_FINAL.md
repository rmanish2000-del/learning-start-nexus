# EduOS — Final Launch Blockers

Date: 2026-08-29 · Supersedes the blocker list in `EDUOS_CLASS10_2026_27_COMPLIANCE_CERTIFICATION.md` for runtime items only; the compliance verdicts there stand.

## Closed in this assignment

| Id | Severity | Defect | Resolution |
|---|---|---|---|
| DEF-1 | Launch blocker | Parent could not add a child: the parent-details form existed only in checkout, while `createStudentProfile` refuses without name + mobile | Details card now rendered in the parent portal's "Your children" card |
| DEF-2 | Launch blocker | A learner's diagnostic header showed another family's child name, because parent-order diagnostics embed the child name in the shared assessment title | Titles now use the order reference; existing titles scrubbed by migration |

## Open blockers (content/governance, not runtime)

| Id | Severity | Blocker | Owner |
|---|---|---|---|
| LB-1 | Blocking | 326 rebuilt Class 10 items are `draft`/`unverified`; a named subject expert must review and approve them | Founder / subject expert |
| LB-2 | Blocking | Coordinate Geometry has only 3 verified items (minimum 5) — unit is unsellable | Clears with LB-1 |
| LB-3 | Blocking | 9 of 11 sellable units serve short diagnostics (as few as 6 items) | Clears with LB-1 |
| LB-4 | Blocking | No fresh reassessment reserve | Clears with LB-1 |
| LB-5 | Blocking | Science source book is `processed`, not `approved` | Founder |
| LB-6 | Blocking | Three official source types (rationalised-content notice, sample paper, marking scheme) not retrieved | Founder |
| LB-7 | Blocking (external launch only) | Live-mode Razorpay credentials and live acceptance purchase | Founder |

## Gate position

- Internal pilot: **cleared** — full parent-to-evidence journey demonstrated end to end.
- Controlled external pilot: blocked by LB-1 (and consequently LB-2/3/4).
- External launch: blocked by LB-1, LB-5, LB-6, LB-7.

Six of the seven content blockers clear with a single act: a named subject
expert approving the 326 rebuilt items.
