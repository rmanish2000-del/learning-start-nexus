---
# EduOS — Current Assignment

**Last verified:** 2026-08-27 (UTC)
**Evidence source:** the founder's active request in this Lovable thread.

This file holds **only** the active assignment. When it is complete, replace the contents with the next assignment — do not append history.

---

## Active assignment

**Title:** Founder Retest of the Consolidated Production Release
**Received:** 2026-08-27
**Priority:** P0 Release Acceptance
**Status:** Awaiting founder execution — no new development package until this retest returns a verdict.

### Release under test

| Item | Value |
|---|---|
| Canonical branch | `main` |
| Last functional commit | `92ac129d6e62b70bdd382db7a5aa8fdccadfe24c` |
| Deployed production HEAD | `e73bbb047889fe3e8043be90e56e833f068a04dc` |
| Production URL | https://www.eduos.global |
| Rollback | `54baba6d79f0f227b44ef3140d2720f026551b0c` (pre-consolidation `e03ce27`) |

### Objective

The founder executes the retest package end to end on production and returns a
single verdict. Development stays frozen until that verdict exists.

### Scope of the retest

A. Parent signup → Parent Portal → add learner → handle and PIN issued, copy/print/reset work.
B. Free Learning Check → handoff → learner signs in separately → answers → parent sees preview.
C. ₹199 live diagnostic → one entitlement → handoff → learner completes → parent report → ₹199 credit and ₹2,800 upgrade shown.
D. Gap opens → automatic direct-parent plan → intervention → AI Tutor actionable state → fresh reassessment → evidence chain.
E. Centre separation — direct-parent learners change no Brightpath centre total, heatmap, queue, assignment or evidence metric.
F. Assessment lifecycle — Create → Save Draft → Review → explicit Publish → explicit Assign; modals safe at 100/125/150/200% zoom and on mobile, tablet and desktop widths.

Detailed steps: `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` §9 (A–K) and
`EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` §12.

### Verdict format

`FOUNDER_RETEST: PASS` with production URL, deployed full SHA, parent and learner used,
order/entitlement references, diagnostic and report references, and non-blocking issues —
then independent read-only verification and the five-family controlled pilot.

`FOUNDER_RETEST: FAIL` with the **first** failing step only: role, route, expected, actual,
screenshot or error, related record IDs. Fix that step alone, then root cause → fix →
full regression → commit → full SHA → clean tree → publish → production verification → retest.

### Known open items (non-blocking)

- Human subject-matter review of the 210 verified questions during the pilot.
- Coordinate Geometry needs 2+ more verified questions to unlock (3 of 5).
- P1: `profiles.phone` readable org-wide by any member — product decision pending.
- No build-SHA endpoint yet; deployment identity still needs bundle probing.
- Apex `eduos.global` still awaiting DNS; `www.eduos.global` is live.

### Update protocol

The Lovable agent replaces this file at the start of each new assignment; the
founder confirms completion before it is replaced.
