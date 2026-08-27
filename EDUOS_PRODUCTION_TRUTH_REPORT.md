# EduOS Production Truth Report

**Last verified:** 2026-08-27 (UTC)
**Evidence source:** live HTTP fetches of `https://www.eduos.global`, its served JS
bundles, `git log`, and the Razorpay live API.

---

## Task 1 — Production commit verification

Lovable does not stamp a commit SHA into the deployed HTML, so deployment was
verified **by bundle content**, not by repository history: the served route
chunks were downloaded and grepped for strings that only exist in specific
commits.

### Repository facts

| Ref | SHA | Note |
|---|---|---|
| Canonical HEAD (before this assignment) | `1252a78` | handoff docs only |
| Continuity commit | `438d75a` | docs only |
| Educator-free study plan | `6f570d0` | last commit touching `src/` |

`git diff 6f570d0..1252a78 -- src supabase package.json vite.config.ts` is
**empty** — everything after `6f570d0` is documentation.

### Production evidence

| Probe | Expected if current | Observed on production | Verdict |
|---|---|---|---|
| `/assets/auth-Dq-jIwF_.js` contains `eduos.auth.lastRole` | yes (commit `06f0bb6`) | **absent** | stale |
| `/assets/home-B20YKJJJ.js` contains `study plan` / `Recommended next topics` | yes (commits `4eedca5`…`6f570d0`) | **absent** | stale |
| `/assets/home-B20YKJJJ.js` contains educator-waiting copy | removed in `3a540da`/`4a09054` | **present** | stale |
| `/api/public/razorpay-webhook` reachable | yes | yes (Razorpay live delivery verified, see reconciliation report) | current |

### Conclusion

**Production was serving a build from before 2026-08-27 11:00 UTC.** The deployed
bundle predates the whole educator-free diagnostic release.

### Verified changes missing from production (before this assignment's publish)

| Commit | Time (UTC) | Missing change |
|---|---|---|
| `ffbac9e` … `4eedca5` | 07:31 → 11:01 | landing copy, `study-plan-shared.ts` aggregation engine |
| `75c9c4d`, `679d4fb`, `ed38dbb`, `b65c42f` | 11:02 → 11:09 | `study-plan.server.ts` plan assembly + intervention materialisation |
| `bab9dbc` | 11:03 | `study-plan.functions.ts` server-function surface |
| `10675e5` | 11:03 | `study-plan-card.tsx` |
| `4a09054`, `3a540da` | 11:04 | student home wired to the study plan; educator-waiting hints removed |
| `5d229f6` | 11:04 | diagnostic report page update |
| `06f0bb6` | 11:07 | role-first sign-in memory (`eduos.auth.lastRole`), help/onboarding/tutor copy |
| `6f570d0` | 11:09 | educator dependency removal (release commit) |
| *(this assignment)* | 11:50 | paid-diagnostic content gate in `parent-diagnostic.server.ts` |

Backend/database changes (RLS, functions, this assignment's migration) deploy
immediately and were already live.

---

## Task 7 — Founder acceptance readiness

| Step | State | Evidence |
|---|---|---|
| Parent signup + email confirmation | Ready | `handle_new_user()` assigns `parent` from `signup_role`; 25 users, all with role + profile |
| Parent portal | Ready | `/parent`, live |
| Create Class 10 learner | Ready | pilot scope locked to CBSE / class 10 |
| Maths or Science diagnostic | Ready — **11 of 12 units** offered | Coordinate Geometry has 3 verified questions (< 5 minimum) and is correctly hidden |
| ₹199 live checkout | Ready | live key `rzp_live_…`, real ₹199 capture already proven |
| `payment.captured` → one entitlement | Ready | order `EDUMTAG8TM7B08233` captured, exactly one `diagnostic_credit` granted |
| Resumable diagnostic + report | Ready | Earth Patel session submitted, report reachable |
| ₹2,800 credited upgrade | Ready (never charged) | gateway order created, 0 attempts, parent dismissed checkout |

### Decision

**READY_FOR_FOUNDER_LIVE_PAYMENT — conditional on the publish performed at the
end of this assignment reaching production.** Every functional blocker is
closed; the only defect found was that the verified code was not deployed.

---

## Known limitations

- Coordinate Geometry (Maths) is below the 5-question minimum and is hidden from
  the paid catalog until more verified questions are added.
- The 210 verified questions passed structural + provenance review, not
  line-by-line subject-matter re-authoring (see the content gate report).
- Deployment identity can only be proven by bundle-content probing; there is no
  build SHA endpoint. Adding one is recommended.

## Rollback instructions

- **Code:** `git revert <commit>` then publish again. The previous production
  bundle is the build from `6f570d0`'s predecessor; reverting the gate commit
  restores the pre-gate behaviour.
- **Content gate (data):** `UPDATE public.question_bank SET verification_state='unverified', verified_by=NULL, verified_at=NULL, verification_note=NULL WHERE verification_note LIKE 'Pilot gate batch 1%';`
- **Order expiry:** `UPDATE public.parent_orders SET status='created', failure_reason=NULL WHERE status='expired';`
- **Archived book:** `UPDATE public.books SET archived_at=NULL, status='approved' WHERE id='26ac60d7-794d-4805-8cdb-5b73bcb40c53';`
- No records were deleted anywhere in this assignment.
