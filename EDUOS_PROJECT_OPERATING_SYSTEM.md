# EduOS — Project Operating System

**Repository path:** `EDUOS_PROJECT_OPERATING_SYSTEM.md` (canonical repository root, `learning-start-nexus`)
**Created:** 2026-08-27 (UTC) · **Canonical branch:** `main`
**Source of rules:** `EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` §1, §3–§8, §14–§17
**Change policy:** operating rules only. Changes rarely. Never a place for status, sprint notes or release history.

---

## 0. Purpose

This file is the permanent rulebook for how EduOS is built, verified, shipped and
documented. Status lives in `PROJECT_STATUS.md`, decisions in `PRODUCT_DECISIONS.md`,
architecture in `TECHNICAL_STATE.md`, sequence in `ROADMAP.md`, the single active
mission in `CURRENT_ASSIGNMENT.md`.

---

## 1. Delivery law

```text
Build → Verify → Commit → Publish → Verify Production
```

No step may be skipped or reordered. "Done" without a commit is not done.
"Published" without production evidence is not published.

## 2. Evidence law

Founder production evidence overrides any unverified report, audit or agent claim.
When an audit conflicts with what the founder observes in production, the live
evidence wins and the audit is investigated. Never assume Lovable output means the
canonical repository or production is current — require proof. When sources
conflict, do not guess: name the conflict and verify.

Historical reports are marked **superseded**, never silently rewritten.

## 3. Pilot scope

CBSE **Class 10 Mathematics and Science** only. English and Hindi.
No new grade, board or subject is added until the current funnel is proven by the
pilot. Legacy Grade 6 Fractions content exists only in a read-only archive.

## 4. Core product law

```text
Parent owns and purchases.
Learner answers and learns.
Parent receives progress and evidence.
```

Server-enforced: a parent cannot submit or change learner answers; unrelated users
and anonymous callers cannot submit; the learner owns the attempt; the parent owns
the purchase and report access.

## 5. Learner modes

**DIRECT_PARENT** — owned by a parent account, no centre or educator required,
receives an automatically generated verified study plan after the diagnostic, and is
excluded server-side from every centre total, heatmap, queue, assignment and
evidence aggregate.

**CENTRE_MANAGED** — explicitly enrolled in a centre/tenant, may require educator
assignment and plan approval, and appears only in authorised centre metrics.

Learner mode is explicit. Never infer it from a missing educator value.

## 6. Assessment lifecycle law

```text
DRAFT → READY_FOR_REVIEW → PUBLISHED → ASSIGNED → IN_PROGRESS → COMPLETED → ARCHIVED
```

```text
Create ≠ Publish
Publish ≠ Assign
```

New assessments save as Draft. Review is explicit. Publish is explicit and
server-gated. Assignment requires a published assessment plus a selected learner or
cohort. Only a fresh reassessment can close a gap; the AI Tutor can never modify
scores or close gaps.

## 7. Purchase law

**No anonymous purchases.** Every order is bound to an authenticated parent account
along the ownership chain:

```text
Parent account → Student profile → Order → Payment → Entitlement → Diagnostic run → Report
```

## 8. Automatic student credential provisioning

```text
Student created → Handle generated → PIN generated → Credential written atomically → Login immediately usable
```

A student must never exist without working credentials. Handle and PIN are
recoverable and resettable by the owning parent and by an admin. Internal IDs are
never used as the primary learner or parent label.

## 9. Standing Lovable commit and publish requirements

Every assignment includes, without the founder asking:

1. Implement the requested scope.
2. Run the complete affected test suite.
3. Verify the full affected journey.
4. Commit to canonical repository `learning-start-nexus`.
5. Provide the **full** commit SHA.
6. Confirm the working tree is clean.
7. Confirm no required migrations or translations are untracked.
8. Publish/deploy the verified canonical HEAD when appropriate.
9. Verify production serves the intended behaviour.
10. Provide the production URL and deployment status.
11. Provide tests, screenshots and evidence.
12. Provide known limitations.
13. Provide the rollback commit and procedure.

Payments, destructive migrations, credential changes and irreversible data actions
require safety verification and rollback readiness **before** publication.

Failure handling:

```text
Root cause → Fix → Full regression tests → Commit → Full SHA → Clean worktree → Publish → Production verification → Founder acceptance (AI-executed evidence; see §11.1 — never a founder execution task)
```

Fix the first failing founder step. Do not author a new roadmap when a concrete
failing step exists.

## 10. Continuity maintenance rules

After every verified release, update in the same commit or an immediately following
documentation-only commit:

| File | Contains |
|---|---|
| `PROJECT_STATUS.md` | concise current state and release identity |
| `PRODUCT_DECISIONS.md` | durable decisions and rationale |
| `TECHNICAL_STATE.md` | architecture, schemas, integrations, security, migrations |
| `ROADMAP.md` | active sequence only; completed work moved to history |
| `CURRENT_ASSIGNMENT.md` | one current mission, owner, scope, acceptance criteria, blockers |
| `EDUOS_PROJECT_OPERATING_SYSTEM.md` | operating rules only, changed rarely |

Every update carries: timestamp with timezone, canonical branch, full commit SHA,
production deployed SHA, what changed, test evidence, unresolved questions, next
gate, rollback reference.

All continuity files live in the canonical repository, never only in chat.


---

## 2026-08-28 06:0x UTC — Assessment lifecycle regression closed (Issues 1 and 2)

- Canonical branch: `main`.
- Issue 1: new assessments no longer inherit hardcoded Grade 6 metadata; scope is derived from the selected CBSE Class 10 book and unit, so drafts stay active and can publish.
- Issue 2: title + two-minute-window deduplication removed. Assessment creation is now idempotent per `clientRequestId`, enforced by a partial unique index on `public.assessments (org_id, client_request_id)`. Two intentional creates with the same title are two separate drafts; a retry of one request returns the draft it already created. No staff content can be silently discarded.
- Migration: `20260828055655_*.sql` (additive nullable column + partial unique index).
- Tests: 97/97 Vitest passing; typecheck clean; production build clean.
- Public-experience release work preserved and unchanged.
- Reports: `EDUOS_ASSESSMENT_LIFECYCLE_REGRESSION_REPORT.md`, `EDUOS_FINAL_PUBLIC_EXPERIENCE_RELEASE_REPORT.md` (section 13).
- Rollback reference: `9e0e2b166d20b3c605dfcd32f733cb9aaa3d7829`.

---

## 2026-08-28 — Figma-Informed Public Visual Refinement (Direction B) — CURRENT

- Approved direction: Recommendation B (refine production toward verified Figma composition; evergreen + Geist retained; Option B dark identity NOT adopted).
- Refined: public navigation chrome (64px bar, padded nav, CTA elevation), hero composition and hierarchy, new dark illustrative product-preview card (marketing-only ink tokens), four-step process stat row (process facts only, no statistics), problem-section transition/elevation.
- Deliberately unchanged (no Figma evidence): How EduOS Works, Parents, Centres, Schools, Trust, Pricing, FAQ, Free Learning Check form, footer architecture, About and Contact bodies.
- Product truth unchanged: India/INR, CBSE Class 10 Mathematics and Science, Rs199 diagnostic, Rs2,999 annual plan, Rs199 credit / Rs2,800 upgrade, all routes and backend behaviour.
- Verification: 97/97 Vitest, typecheck clean, production build success, no console errors, no horizontal overflow at 390/768/1280/1440, single H1, dark theme verified.
- Report: EDUOS_FIGMA_REFINEMENT_RELEASE_REPORT.md
- Rollback reference (pre-release): 1fcae5f27ae75e73657e4f8affbd889ef94d9d1a (code-only; no schema changes).
- Known limitation: Figma source covers ~1.5 sections and is a Figma Make code instance, so exact token extraction and full-site parity are not possible.
- Next founder acceptance gate: visual acceptance of the refined public hero, product preview and problem section on https://www.eduos.global.

---

## Wave 0 operating note (2026-08-28)

Curriculum scope, entitlement and pricing are now data-driven. Any future class or subject becomes visible only
by passing `evaluateCommercialReadiness()` and being set to `commercial_status = 'purchasable'` by an admin with
named subject-expert evidence. Never hardcode a price or a class in a route component: resolve it through
`src/lib/catalogue.server.ts`.

---

## 2026-08-28 11:44 UTC — Wave 0 Production Closeout

- Canonical branch: `main` (working branch `edit/edt-09c92cdc`, canonical tree).
- Wave 0 application commit: `e38a303b361ec1848c12ce7e490a8e0a7945f528` — "Implemented Wave 0 foundation".
- Deployed production commit: `e6e34008bd264b1533707180428d860dda76a6f9` (Wave 0 + P0 profile-org RLS hardening migration `20260828114401_*.sql`).
- Deployment: https://www.eduos.global — LIVE, HTTP 200, verified 2026-08-28 ~11:47 UTC.
- Tests 135/135 (13 files) · typecheck clean · production build clean · worktree clean.
- Migrations committed: `20260828112426_*` (Wave 0 additive) and `20260828114401_*` (profiles org_id self-assignment fix). Translations: none required (English-only).
- Security: the critical finding "any user can join any organization" (pre-existing profiles INSERT/UPDATE policy allowing self-assigned `org_id`) was found during the closeout scan and fixed: self-insert must have `org_id IS NULL`, self-update must keep `org_id` unchanged, admins remain scoped to their own org. Rescan: 0 critical, warnings only.
- Database: Wave 0 migration applied; 2 purchasable subjects; 1 active class (Class 10); 0 active streams; 0 orphan catalogue links; 0 duplicate canonical codes; 5 legacy entitlements grandfathered; RLS active on every new table; order amounts unchanged (19 900 / 280 000 paise); active plans 19 900 / 299 900 paise.
- Production verification: ₹199, ₹2,999, ₹2,800, CBSE Class 10 Mathematics and Science all present; Classes 9/11/12, Commerce, Humanities and all streams absent from public surfaces; English-only copy intact.
- Rollback: code `48548b420c601f8bcaf11a47c6853a55ebfb5526`; both migrations are additive/policy-only and require no data rollback.
- Next gate: Wave 1 — Class 9 Mathematics and Science content preparation (not started).

---

## 2026-08-28 16:45 UTC — Wave 0 Continuity and New-Chat Handoff Closeout (documentation-only)

### Repository authority rule (permanent)

| Repository | Authority | Use |
|---|---|---|
| `eduos-ai` | Product Authority | product definition, strategy, canonical product truth |
| `learning-start-nexus` | Application Authority | **only** production deployment source; all live application work |
| `eduos` | Fleet Authority | EDUOS fleet seat / fleet-level configuration |

Agents must select the repository according to the authority being changed. Ordinary live application work
defaults to `learning-start-nexus`.

### Standing founder communication rule (permanent)

Whenever implementation, verification, remediation or deployment work is discussed, the coordinating AI must
provide a separate, self-contained, copy-paste-ready Lovable assignment that automatically includes: target
authority; target repository; objective; implementation scope; complete affected tests; journey verification;
canonical repository commit; full 40-character commit SHA; clean-working-tree confirmation; confirmation of no
missing migrations or translations; publish/deploy when appropriate; production verification; production URL and
deployment status; evidence; known limitations; rollback commit and procedure.

Never wait for the founder to request committing or publishing separately.

### Standing delivery rule (permanent)

```text
Build → Verify → Commit → Publish when appropriate → Verify Production
```

### Authoritative release identity (unchanged by this assignment)

- Canonical branch: `main`
- Wave 0 **functional application** commit: `e38a303b361ec1848c12ce7e490a8e0a7945f528`
- **Deployed production** commit: `e6e34008bd264b1533707180428d860dda76a6f9` (Wave 0 + P0 profiles org_id RLS correction)
- Production URL: https://www.eduos.global — LIVE
- Rollback commit: `48548b420c601f8bcaf11a47c6853a55ebfb5526`
- Tests 135/135 across 13 files · typecheck PASS · build PASS · worktree CLEAN · 0 critical security findings

`e38a303` is **not** the deployed production HEAD; `e6e3400` is.

### P0 security correction recorded

Original `profiles` INSERT/UPDATE policies allowed a user to self-assign an arbitrary `org_id`
(cross-organisation access). Corrected policies enforce: self-insert must leave `org_id` null; self-update must
preserve `org_id`; organisation administrators remain restricted to their own organisation. Post-fix scan: 0 critical.

### Known limitations preserved

- legacy `parent_entitlements` remains the live write path;
- `catalogue_subject_id` NOT NULL tightening is deferred;
- content volume is the binding constraint for future waves;
- academic-year rollover policy is undecided;
- INR is the only supported currency;
- remaining security findings are non-critical warnings, accepted and recorded in the security memory.

### Current gate

Wave 1 — Class 9 Mathematics and Science content preparation. **NOT STARTED.**

---

## Wave 1 — Class 9 content preparation (2026-08-28)

**Status: IN PREPARATION — WAVE_1_CONTENT_PREPARATION: PARTIAL.** Authorised as content preparation only;
Class 9 activation, pricing and commercial release remain unauthorised.

- Authoritative record: `EDUOS_WAVE_1_CLASS_9_CONTENT_PREPARATION_REPORT.md`.
- Prepared inactive packs: `content/class-9/{mathematics,science}.{curriculum,questions}.json`
  (Mathematics 6 units / 12 chapters / 20 topics / 20 outcomes / 40 questions;
  Science 4 units / 12 chapters / 24 topics / 24 outcomes / 48 questions).
- Contracts and validators: `src/lib/class9-content-schema.ts`, `scripts/class9/*`.
- Everything is draft, unverified, inactive, hidden and excluded from paid diagnostics.
- **Zero database writes.** No migration. No production deployment. Deployed commit unchanged (`e6e3400`).
- Derived volume law (from live gates, not prose): required verified questions per unit =
  max(2 × diagnostic_target, 2 × outcomes × min_questions_per_outcome, 2 × diagnostic_minimum) = **40**.
  Wave 1 requirement: 240 (Mathematics) + 160 (Science) = **400**; drafted 88; verified 0.
- Conflict recorded: Wave 0 created no Class 9 `catalogue_subjects` rows — Class 9 is non-purchasable by absence.
- Blockers to activation: remaining 312 items, named subject-expert review, verification, catalogue rows,
  2026-27 syllabus confirmation, and a separate founder activation gate.
- Test baseline moved from 135/13 files to **153/14 files**, all passing.
- `eduos-ai` was not used; the `eduos` fleet repository was not modified.

### Current gate

Wave 1 content authoring and named subject-expert review. **Class 9 activation NOT AUTHORISED.**

---

## Wave 1 continuation — Class 9 question banks complete (2026-08-29 IST)

**Status: WAVE_1_QUESTION_BANK_COMPLETION: PASS · WAVE_1_COMMERCIAL_READINESS:
BLOCKED_PENDING_SUBJECT_EXPERT_REVIEW.** This supersedes the volume figures in the
2026-08-28 Wave 1 section above; every other constraint there still holds.

- Prepared volume: **400/400** original questions — Mathematics 240 (6 units / 12 chapters /
  38 topics / 38 outcomes / 76 atoms), Science 160 (4 units / 12 chapters / 30 topics /
  30 outcomes / 60 atoms). Every unit holds 40 with 100% outcome and atom coverage.
- Verified: **0.** Human-reviewed: **0.** Approved: **0.** Review packages exist but review has not happened.
- `VALIDATION: PASS` — 0 errors, 0 warnings, 0 duplicates, deterministic rebuilds.
- New deliverables: `EDUOS_CLASS_9_CONTENT_VOLUME_MATRIX.md`,
  `EDUOS_CLASS_9_VALIDATION_REPORT.md`, `EDUOS_CLASS_9_DUPLICATE_AND_INTEGRITY_REPORT.md`,
  `EDUOS_CLASS_9_IMPORT_DRY_RUN_REPORT.md`,
  `EDUOS_CLASS_9_{MATHEMATICS,SCIENCE}_SUBJECT_EXPERT_REVIEW_PACKAGE.md`,
  plus Addendum A in `EDUOS_WAVE_1_CLASS_9_CONTENT_PREPARATION_REPORT.md`.
- Catalogue decision: Class 9 `catalogue_subjects` rows **deferred** (live check: Class 9 inactive,
  0 subject rows; Class 10 the only active class). No migration.
- **Zero database writes.** No runtime code, schema, policy or price change. Deployed production
  commit remains `e6e34008bd264b1533707180428d860dda76a6f9`; no deployment performed.
- Tests: **164 passing across 14 files** (was 153/14). Typecheck and production build pass.
- `eduos-ai` not used; the `eduos` fleet repository not modified.

### Current gate

Named subject-expert review of the 400 prepared items, then verification, catalogue rows and a
separate founder activation gate. **Class 9 activation, pricing and commercial release remain unauthorised.**

---

## 11. Founder Non-Execution Rule and multi-AI continuity governance (2026-09-02, permanent)

### 11.1 Founder Non-Execution Rule (mandatory)

Never assign execution work to the founder. Complete all possible work through the appropriate AI/tool
assignment. Involve the founder only for an unavoidable manual action, an inaccessible credential, a
payment, a legal/external approval, or a decision that cannot be performed by available tools.

This rule overrides any earlier wording in this or any other continuity file that asks the founder to
test, verify, run, retest, configure or execute anything. Such steps are executed by the responsible AI
and presented to the founder as evidence for acceptance only.

### 11.2 Continuity ownership

M365 Copilot is AI Program Director and continuity owner. Every verified result is handed back to M365
Copilot.

### 11.3 Standing operating rules

| Rule | Statement |
|---|---|
| Proactive completion | Continue proactively until the objective is fully completed. |
| Delegation | Every delegated task has a separate copy-paste-ready assignment naming the exact tool and mode. |
| Stage assignments | Every implementation or verification stage includes a separate Lovable assignment. |
| Figma | Every Figma assignment includes the complete downloadable implementation package. |
| Assignment language | All assignments are written entirely in English. |
| Response language | Normal EduOS responses are very short, relevant, in Devanagari Hindi; technical and standard terms stay in English. Product copy remains English-only. |
| Duplication | Avoid duplicate work unless it is intentional independent verification. |

Section 9 ("Standing Lovable commit and publish requirements") stays in force and is read subject to
11.1: the AI performs every listed step itself.
