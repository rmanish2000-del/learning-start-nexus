# EduOS roadmap — Class 10 (2026-27) clean rebuild

Founder clarification (2026-08-29): all curriculum, outcome, atom, mapping and
question data is internal and replaceable. Prefer a clean rebuild from the
verified 2026-27 baseline over making weak legacy data compliant. Keep only the
safety gates for schema integrity, auth, payments/entitlements, security,
rollback and official curriculum correctness.

## Done (2026-08-29)

- [x] Pre-rebuild snapshot with SHA-256 manifest — `audit-data/class10/rollback/`.
- [x] Confirmed the verified structure matches the official shape (Maths 7 units / 14 chapters, Science 5 units / 13 chapters, 84 requirements, 0 unmapped) — no structural rebuild needed.
- [x] Retired the pilot-only Mathematics book and its questions from active 2026-27 selectors (reversible, no hard delete).
- [x] Revalidated the question specification: 326 items (Maths 235, Science 91).
- [x] Generated the original question bank (125 diagnostic / 201 reassessment), answers computed in code, loaded as `draft` + `unverified`.
- [x] Automated validation: 0 errors, 0 duplicates/near-duplicates, 0 exclusion leakage, 192 numeric claims recomputed.
- [x] Review queues with reviewer fields null, status `REVIEW_PENDING`.
- [x] Science book machine gates pass -> READY_FOR_EXPERT_REVIEW (still not human-approved).
- [x] Full suite 256 tests + typecheck + build clean.
- [x] Deliverables: `EDUOS_CLASS_10_326_ITEM_BUILD_REPORT.md` (clean-rebuild report), `EDUOS_CLASS_10_PILOT_UNIT_DISPOSITION.md`, `EDUOS_CLASS_10_FINAL_CURRICULUM_MAP.json`, `EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json`, `EDUOS_CLASS_10_VALIDATION_RESULTS.json`, `EDUOS_CLASS_10_REVIEW_QUEUE.json`.

## Compliance certification gate (2026-08-29) — complete

- [x] Live snapshot re-exported; validator, report, audit bundle and Gemini bundle regenerated.
- [x] Source registry corrected: both CBSE subject syllabi now `final`/`applicable` with live SHA-256 evidence (0 errors, 3 warnings).
- [x] Verdicts issued — Mathematics **NOT_COMPLIANT** (7 checks), Science **NOT_COMPLIANT** (9 checks), overall `SOURCE_PENDING`.
- [x] Journey, pricing (₹199 / ₹2,999 / ₹199 credit / ₹2,800 upgrade) and security verified.
- [x] Deliverables: `EDUOS_CLASS10_2026_27_COMPLIANCE_CERTIFICATION.md`, `EDUOS_CLASS10_LAUNCH_READINESS_REPORT.md`.
- Launch gate: **controlled pilot only**; external launch withheld.

## Open

- [ ] Subject-expert approval of the 326 drafts (LB-1/LB-2 — blocks commercial readiness and clears LB-3, LB-4, LB-5).
- [ ] Set the Science source book to `approved` (LB-6).
- [ ] Retrieve the remaining official source documents (LB-7).
- [ ] Year-stamp new purchases into the Wave 0 `entitlements` table before the 2027-28 rollover (NB-2).

## Standing constraints

- Class 9 on HOLD; Class 12 not started.
- No question becomes diagnostic- or reassessment-eligible without named expert approval.
- Do not touch auth, roles, payments, orders, payment events, secrets.
- Frustum, Euclid's division lemma and formative-only topics must never enter active 2026-27 diagnostics.

## Internal pilot execution (2026-08-29)

- Full parent → learner → diagnostic → gap → evidence journey executed live: PASS.
- Fixed DEF-1 (parent details form missing from the parent portal) and DEF-2
  (another family's child name shown in a shared diagnostic title).
- Verdict: READY_FOR_INTERNAL_PILOT. See `EDUOS_INTERNAL_PILOT_EXECUTION_REPORT.md`
  and `EDUOS_LAUNCH_BLOCKERS_FINAL.md`.

## Staging / sandbox environment (2026-08-30)

- [x] Environment separation layer: `src/lib/environment.ts`, staging ribbon, non-production `noindex`, live-Razorpay-key rejection outside production.
- [x] Staging user seeder + reset: `scripts/staging/seed-staging-users.ts` (staging-only guard, `@staging.eduos.test` scope, git-ignored credential file).
- [x] Runbook, test-user inventory, Razorpay test-mode checklist and promotion flow: `STAGING_ENVIRONMENT.md`.
- [ ] Founder action: remix this project as `eduos-staging`, set `VITE_APP_ENV=staging`, add Razorpay test keys + test webhook, run the seeder, then execute staging UAT.

## CBSE Class 10 PYQ acquisition (added 2026-09-03)
- [ ] Parse https://www.cbse.gov.in/cbsenew/question-paper.html and follow real file links only (no guessed URLs)
- [ ] Download Mathematics Standard 041 + Science 086 main-exam papers 2022-2026; validate status/MIME/bytes/signature
- [ ] Double SHA-256 per binary; test ZIPs; inventory contained PDFs; verify year/subject/code/set/type
- [ ] Exclude Maths Basic 241, sample papers, marking schemes, compartment/Second Board
- [ ] Store binaries privately (never in public bundle); no question text imported
- [ ] Deliver source register (JSON/CSV), SHA256SUMS, extraction inventory, missing-files CSV, contamination + pattern alignment reports
