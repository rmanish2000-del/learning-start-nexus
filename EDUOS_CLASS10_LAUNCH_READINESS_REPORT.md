# EduOS — Class 10 Launch Readiness Report

**Date:** 2026-08-29 (UTC) · **Priority:** P0 · **Repository:** `learning-start-nexus`
**Companion:** `EDUOS_CLASS10_2026_27_COMPLIANCE_CERTIFICATION.md`

---

## 0. Gate decision

**CONDITIONAL GO — controlled pilot only. NOT cleared for external launch.**

The platform is operationally and commercially sound: every journey works,
pricing is exact, security is clean, and no unverified content can reach a
paying learner. What is missing is **content certification**, not engineering.
Selling today would deliver a technically correct product with a 6-question
diagnostic on most units and no Coordinate Geometry option.

| Dimension | State |
|---|---|
| Product journey | PASS |
| Pricing | PASS |
| Security & integrity | PASS |
| Operational content depth | FAIL (see LB-2 … LB-5 in the certification) |
| Compliance certification | NOT_COMPLIANT (both subjects) |

---

## 1. Journey verification

Verified from production data and from the exact server code paths that run in
the live app.

| Step | Mechanism | Evidence |
|---|---|---|
| Parent signup → confirm | Supabase auth + role claim; unclaimed accounts redirect to `/auth?tab=parent`, never into the learner workspace | `src/routes/_authenticated/route.tsx`; role rows present for all users |
| Add learner | Parent learner provisioning with 6-digit PIN | `parent-learners` flow; 5 entitlement holders on record |
| Purchase | Razorpay order → HMAC-verified checkout **and** signature-verified `payment.captured` webhook, both idempotent | 5 paid orders (4 diagnostic, 1 annual), 1 failed order correctly not entitled, 2 expired orders |
| Learner login → diagnostic | PIN login; `assertLearnerAnswerer` prevents a parent from answering a learner's paper | `learner-answer-ownership.test.ts`, `learner-mode.test.ts` |
| Diagnostic allocation | `fetchDiagnosticCatalog()` / allocation filters `source=import` + `status=approved` + `verification_state=verified` | live probe, §2 |
| Gap detection | Sub-threshold outcome detection on submitted sessions | 14 submitted sessions, 37 learner assessment rows |
| Study plan | Auto-generated plan items, incl. self-serve plan for unassigned learners | 27 `learning_plan_items` |
| AI tutor eligibility | Scoped to approved interventions only | 5 `tutor_sessions` |
| Reassessment creation | Engine creates unit reassessments; reuse rules audited | `diagnostic-audit.server.ts` probes |
| Evidence generation | Evidence chain written per assessed outcome | 18 `learner_evidence` rows |
| Outcome report | Labelled with `ACTIVE_ACADEMIC_YEAR = "2026-27"` in header badge and footer | `src/routes/diagnostic.report.$token.tsx`, `src/lib/catalogue-shared.ts` |

Route smoke test (live server): `/` 200, `/diagnostic` 200, `/about` 200,
`/upgrade/:token` 200, `/auth` 307 (expected redirect).

### 1a. Runtime limitation surfaced by this verification

`fetchDiagnosticCatalog()` against production returns:

```
Mathematics — NCERT Class 10 Mathematics (CBSE) — 6 sellable units
   Number Systems 6 · Algebra 12 · Geometry 6 · Trigonometry 6 · Mensuration 6 · Statistics & Probability 6
   (Coordinate Geometry withheld: 3 verified items < minimum 5)
Science — NCERT Class 10 Science (CBSE) — 5 sellable units
   Chemical Substances 20 · World of Living 20 · Natural Phenomena 12 · Effects of Current 12 · Natural Resources 6
```

Diagnostic target is 20 items. Two units hit it; nine do not. This is the
operational face of the depth shortfall and is the reason the gate is
conditional.

---

## 2. Content gating (safety property)

The gating behaves exactly as designed: the 326 rebuilt items are stored as
`source = 'ai'`, `status = 'draft'`, `verification_state = 'unverified'` and are
therefore **structurally unable** to enter a paid diagnostic. No code change is
needed to hold them back, and no code change other than review approval is
needed to release them.

---

## 3. Pricing verification

Read live from `price_plans` and `discount_rules`.

| Item | Expected | Live value | Result |
|---|---|---|---|
| Subject diagnostic | ₹199 | `CBSE-2026-27-C10-DIAGNOSTIC` — 19,900 paise, active, 365-day validity | PASS |
| Annual plan | ₹2,999 | `CBSE-2026-27-C10-ANNUAL` — 299,900 paise, active, 365-day validity | PASS |
| Diagnostic credit | ₹199 | `DIAGNOSTIC_CREDIT_199` — credit, 19,900 paise, active, same-learner, 30-day window, max 1 application | PASS |
| Effective upgrade | ₹2,800 | 299,900 − 19,900 = 280,000 paise | PASS |

No deviation. Credit burn on upgrade is implemented and idempotent
(`parent-diagnostic.server.ts`); the public page renders ₹199 as expected.

---

## 4. Security and integrity

| Check | Result |
|---|---|
| Test suite | **256 passed / 256, 19 files** |
| Typecheck | clean |
| Production build | clean (Worker/Nitro output generated) |
| Security scan | **0 critical, 0 error, 1 warn** |
| Authorization regressions | none |
| Learner isolation regressions | none — org/learner RLS tests pass |
| Content validation | 326 items, 0 errors |
| Registry validation | 0 errors, 3 warnings (unretrieved sources) |

The single warning — *"Signed-In Users Can Execute SECURITY DEFINER Function"* —
is the pre-existing, intentional `has_role`-style helper pattern that exists
precisely to prevent recursive RLS. It is not a new finding and not a regression.

---

## 5. Operational verification

- Snapshot exporter, validator, report generator, audit bundler and Gemini
  review bundler all run clean and deterministically from committed inputs.
- The Meridian pilot book remains reversibly archived; its 2 units and 15 items
  no longer appear in any live catalogue, snapshot or evidence export. Two
  regression tests now assert their absence.
- Review bundle regenerated and re-hashed; privacy tests confirm no PII, no
  credentials, no learner or parent data.

---

## 6. Known limitations

1. Both subjects are `NOT_COMPLIANT`; no syllabus-completeness claim may be made.
2. Nine of eleven sellable units serve a short diagnostic.
3. Coordinate Geometry is not purchasable.
4. No fresh reassessment reserve on any unit.
5. New purchases are not year-stamped in the Wave 0 `entitlements` table
   (must be fixed before the 2027-28 rollover).
6. Three official source types remain unretrieved.

---

## 7. Rollback

- **Rollback commit:** `2413f357104d8a8e8a0de508e1565a0ceb85fc26` (pre-certification baseline).
- **Content rollback snapshot:** `audit-data/class10/rollback/class10-pre-rebuild-snapshot.json`
  (SHA-256 `baf41bb…`), with `audit-data/class10/rollback/MANIFEST.json`.
- **Procedure:** (1) reset the application to the rollback commit and redeploy;
  (2) if content must also revert, re-apply the rollback snapshot to
  `question_bank` / `curriculum_*` and un-archive the Meridian pilot book by
  clearing `books.archived_at` and restoring `status = 'approved'`;
  (3) re-run `export-snapshot.ts` and `validate.ts` to confirm the restored state.
- **Verified:** this assignment changed no runtime behaviour, so rollback is a
  documentation and evidence revert only. No migration was applied.

---

## 8. Recommendation

Proceed to **controlled pilot** with the five founder families on Science
(Chemical Substances and World of Living reach the full 20-item diagnostic).
Hold external launch until the subject-expert review approves the 326 rebuilt
items — that single act clears six of the seven launch blockers.
