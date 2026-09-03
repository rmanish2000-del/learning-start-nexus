# EDUOS NEW-CHAT HANDOFF PACKAGE

**Prepared:** 2026-08-23  
**Purpose:** Start a new AI chat without losing project state, decisions, working style, release discipline, or the immediate acceptance position. **[SUPERSEDED 2026-09-02: see §G1 Founder Non-Execution Rule — the founder never executes verification work.]**

> Important: Repository and production facts below are based on the latest reports supplied in the prior chat. The new chat must re-read the canonical repository documents and treat live evidence as authoritative when it conflicts with this handoff.

**Committed to canonical repository `learning-start-nexus`: 2026-08-27 (UTC).**
Reviewed against `PROJECT_STATUS.md`, `PRODUCT_DECISIONS.md`, `TECHNICAL_STATE.md`, `ROADMAP.md`, `CURRENT_ASSIGNMENT.md`. No historical fact removed; only claims disproved by repository evidence are annotated inline as **[CORRECTED 2026-08-27]**.

### Release identity (authoritative)

| Item | Value |
|---|---|
| Canonical branch | `main` |
| Last functional commit | `92ac129d6e62b70bdd382db7a5aa8fdccadfe24c` |
| **Deployed HEAD (documentation-only, published)** | **`e73bbb047889fe3e8043be90e56e833f068a04dc`** |
| Intermediate doc commit | `db55f6fdf44d4368bca557a80d000cb639a751d4` (same `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` content) |
| Production URL | https://www.eduos.global |

---

## 1. New Chat Bootstrap Prompt

Paste the following message into the new chat and attach or provide the repository documents listed in Section 2.

```text
You are taking over the EduOS project from a previous long-running session.

Before proposing, assigning, implementing, or prioritizing anything, read all supplied handoff and repository continuity documents completely.

Source-of-truth order:

1. Verified production behavior
2. Canonical repository at current clean HEAD
3. PROJECT_STATUS.md / CURRENT TRUTH
4. CURRENT_ASSIGNMENT.md / NEXT ACTIONS
5. PRODUCT_DECISIONS.md
6. TECHNICAL_STATE.md
7. ROADMAP.md
8. EDUOS_PROJECT_OPERATING_SYSTEM.md
9. Historical audit and release reports
10. This bootstrap summary

If sources conflict, do not guess. Identify the conflict and request or perform evidence-based verification.

Current mission:
AI-executed verification of the consolidated production release, presented to the founder for acceptance only (§G1), followed by independent verification and a five-family controlled pilot only if acceptance passes.

Standing Lovable rule:
Every Lovable assignment must automatically include implementation, full verification, commit to the canonical repository, full commit SHA, clean-working-tree confirmation, publication/deployment when appropriate, production verification, production URL, tests/evidence, known limitations, and rollback notes. Do not wait for the founder to ask for commit or publish. High-risk or destructive changes require the appropriate safety gate before publication.

Do not assume that a Lovable output means the canonical repo or production is current. Require proof.

Do not create another roadmap unless evidence shows one is required. Prefer fixing the first failing founder step, then verify, commit, publish, and retest.
```

---

## 2. Documents the New Chat Must Receive

### Core continuity documents

Attach or provide the current canonical-repository versions of:

- `PROJECT_STATUS.md`
- `PRODUCT_DECISIONS.md`
- `TECHNICAL_STATE.md`
- `ROADMAP.md`
- `CURRENT_ASSIGNMENT.md`
- `EDUOS_PROJECT_OPERATING_SYSTEM.md`, if it was created in the repository — **[CORRECTED 2026-08-27]** this file does **not** exist in the canonical repository; its operating rules currently live in Sections 14–16 of this package and in `PRODUCT_DECISIONS.md`.

### Latest release evidence

- `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md`
- `EDUOS_PRODUCTION_TRUTH_REPORT.md`
- `EDUOS_PAYMENT_RECONCILIATION_REPORT.md`
- `EDUOS_PILOT_CONTENT_GATE_REPORT.md`
- `EDUOS_SECURITY_AND_DB_SCAN_REPORT.md`

### Latest feature and remediation reports

- `EDUOS_PARENT_LEARNER_DIAGNOSTIC_HANDOFF_REPORT.md`
- `EDUOS_COMPLETE_GAP_CLOSURE_LOOP_REPORT.md`
- `EDUOS_DIRECT_PARENT_CENTRE_SEPARATION_REPORT.md`
- `EDUOS_ASSESSMENT_CREATION_UX_REMEDIATION_REPORT.md`
- `EDUOS_GLOBAL_MODAL_AND_FORM_AUDIT.md`
- `EDUOS_PARENT_SIGNUP_PRODUCTION_FIX.md`
- `EDUOS_STUDENT_LOGIN_ROOT_CAUSE.md`
- `EDUOS_HINDI_PARENT_EXPERIENCE_REPORT.md`
- `EDUOS_PAYMENT_AUDIT_VERDICT.md`
- `EDUOS_PAYMENT_SETTINGS_SECURITY_AUDIT.md`

If a report does not exist under exactly that name, the new chat should use the repository search to locate the corresponding deliverable rather than assuming it is absent.

**[CORRECTED 2026-08-27]** Verified against the repository at the deployed HEAD, the following names in the two lists above do **not** exist as files: `EDUOS_PARENT_LEARNER_DIAGNOSTIC_HANDOFF_REPORT.md`, `EDUOS_COMPLETE_GAP_CLOSURE_LOOP_REPORT.md`, `EDUOS_DIRECT_PARENT_CENTRE_SEPARATION_REPORT.md`, `EDUOS_ASSESSMENT_CREATION_UX_REMEDIATION_REPORT.md`, `EDUOS_GLOBAL_MODAL_AND_FORM_AUDIT.md`, `EDUOS_PAYMENT_AUDIT_VERDICT.md`. The evidence for those three assignments is consolidated in `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` (sections 3–6). All five "latest release evidence" files and the remaining remediation reports do exist.

---

## 3. Product Definition

EduOS is an outcome and learning-intelligence system, not a general LMS, content platform, or quiz platform.

Core loop:

```text
Diagnostic
→ Gap Detection
→ Intervention
→ AI Tutor
→ Fresh-Item Reassessment
→ Evidence
```

Current commercial pilot scope:

```text
Board: CBSE
Class: 10 only
Subjects: Mathematics and Science only
Languages: English and Hindi
```

Current direct-parent funnel:

```text
Free five-question Learning Check
→ ₹199 full diagnostic
→ Outcome-level gap report
→ ₹2,999 annual plan
→ ₹199 credit applied
→ ₹2,800 upgrade payable
```

Core product law:

```text
Parent owns and purchases.
Learner answers and learns.
Parent receives progress and evidence.
```

No anonymous purchases.

---

## 4. Operating Modes

EduOS supports two explicit learner modes:

### DIRECT_PARENT

- Owned by a parent account.
- No tuition centre or educator required.
- Receives an automatically generated verified study plan after diagnostic completion.
- Excluded server-side from all centre totals, heatmaps, queues, assignments, and evidence aggregates.

### CENTRE_MANAGED

- Explicitly enrolled in a centre/tenant.
- May require educator assignment and plan approval.
- Included only in authorised centre metrics.

Never infer learner mode only from a missing educator value.

---

## 5. Identity and Role Rules

Supported roles:

- Parent
- Student
- Educator
- Admin
- Reviewer

Ownership chain:

```text
Parent account
→ Student profile
→ Order
→ Payment
→ Entitlement
→ Diagnostic run
→ Report
```

Student credential rule:

```text
Student created
→ Handle generated
→ PIN generated
→ Credential written atomically
→ Login immediately usable
```

A student must never exist without working credentials.

Earlier production incident:

- Parent signup produced no role row.
- Role resolution fell back to Student.
- A confirmed parent landed in `My Learning`.
- Fix moved role creation into the signup trigger, removed the Student fallback, and backfilled role-less profiles.

Founder experience overrides an audit report when the two conflict.

---

## 6. Parent and Learner Diagnostic Separation

Current intended flow:

```text
Parent adds learner
→ Parent starts free check or purchases ₹199 diagnostic
→ Parent receives handoff page
→ Learner signs in using handle and PIN
→ Learner answers
→ Parent monitors progress
→ Parent receives report and upgrade offer
```

Server law:

- Parent cannot submit or change learner answers.
- Unrelated users and anonymous callers cannot submit.
- Learner owns the attempt.
- Parent owns the purchase and report access.

---

## 7. Complete Learning Loop

### Direct-parent learner

```text
Diagnostic completes
→ Outcome gaps created
→ Verified study plan generated automatically
→ Learner completes intervention
→ AI Tutor unlocks within entitlement, consent, and active plan scope
→ Fresh verified reassessment assigned
→ Reassessment determines closure
→ Evidence chain created
→ Parent sees outcome and next action
```

### Centre-managed learner

```text
Diagnostic completes
→ Gaps created
→ Recommended plan generated
→ Assigned educator reviews/approves
→ Intervention released
→ AI Tutor where eligible
→ Fresh reassessment
→ Evidence
```

Only reassessment can close a gap. The AI Tutor cannot modify scores or close gaps.

---

## 8. Assessment Lifecycle Law

Permanent state model:

```text
DRAFT
→ READY_FOR_REVIEW
→ PUBLISHED
→ ASSIGNED
→ IN_PROGRESS
→ COMPLETED
→ ARCHIVED
```

Permanent UX law:

```text
Create ≠ Publish
Publish ≠ Assign
```

Current intended behavior:

- New assessments save as Draft.
- Review is explicit.
- Publish is explicit and gated.
- Assignment requires a published assessment and selected learner/cohort.
- Grade 6 Fractions legacy content belongs only in a read-only archive, not active Class 10 workflows.

---

## 9. Payment and Security State

Reported current state:

- Razorpay uses a live key.
- Live webhook endpoint: `/api/public/razorpay-webhook`
- Events: `payment.captured`, `payment.failed`
- Checkout and webhook signatures are verified.
- Entitlement writing is idempotent.
- Credential settings are admin-only.
- Key secret and webhook secret are AES-256-GCM encrypted at rest.
- Credential changes and connection tests have an append-only audit log.
- Secrets are write-only and must never be pasted into AI chat, documents, logs, screenshots, or repository files.

A real signature-valid live capture was reported during production-truth verification. Founder still needs to complete the full live user journey.

Payment status must be evaluated end to end:

```text
Order
→ Gateway payment
→ Webhook
→ Entitlement
→ Learner handoff
→ Diagnostic
→ Report
→ Upgrade credit
```

---

## 10. Curriculum and Content Gates

Pilot-facing selectors must expose only:

```text
CBSE
Class 10
Mathematics
Science
```

All paid diagnostic questions must be:

```text
approved AND verified
```

Reported state:

- 210 imported questions were verified with reviewer identity, timestamp, and note.
- Paid diagnostic selectors enforce approved and verified status.
- Coordinate Geometry previously had only three verified items, below a five-item minimum, and should remain unavailable until the gate is satisfied.
- A superseded single-chapter Science book was archived, not deleted.

The new chat must verify the current repository/current-truth files before treating these counts as current.

---

## 11. Latest Consolidated Release

Reported functional commit:

```text
92ac129d6e62b70bdd382db7a5aa8fdccadfe24c
```

Reported branch:

```text
main
```

Reported verification:

- 70 tests passed across 8 files.
- Typecheck passed with zero errors.
- Production build passed.
- Working tree was clean.
- Direct-parent learners, including Hriday Patel, Earth Patel, Aarav, and Meera, were classified as `direct_parent` and excluded from centre aggregates.

Important release-identity caveat — **[RESOLVED 2026-08-27]**:

- The report file was committed above `92ac129...` in two documentation-only commits: `db55f6fdf44d4368bca557a80d000cb639a751d4` and then `e73bbb047889fe3e8043be90e56e833f068a04dc` ("Published verified canonical HEAD").
- **The full deployed HEAD is `e73bbb047889fe3e8043be90e56e833f068a04dc`.** It differs from `92ac129...` only by `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md`; there is no application-code difference.
- This package and `PROJECT_STATUS.md` now both record that SHA as authoritative.

Production URL:

[Open EduOS production](https://www.eduos.global)

Rollback references previously reported:

- `54baba6`
- pre-consolidation `e03ce27`

The canonical rollback procedure is in `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md` or the production-truth report.

---

## 12. Immediate Current Mission

**[SUPERSEDED 2026-09-02 by the Founder Non-Execution Rule.]** The sequences below are an
**optional founder acceptance walkthrough**, never an execution task list assigned to the founder.
Every step in them must first be executed and evidenced by the responsible AI/tool (Lovable browser
automation, tests, production probes). The founder is involved only for acceptance judgement.

Acceptance walkthrough (AI-executed first, founder-optional afterwards):

### A. Parent and learner management

```text
Fresh parent signup
→ Email confirmation
→ Parent Portal
→ Add fresh learner
→ Verify automatic handle and PIN
→ Verify copy/print/reset abilities
```

### B. Free Learning Check

```text
Parent starts five-question check
→ Parent receives handoff
→ Learner signs in separately
→ Learner answers
→ Parent sees limited preview
```

### C. Paid diagnostic

```text
Parent purchases ₹199 diagnostic
→ Live checkout succeeds
→ One entitlement granted
→ Parent receives handoff
→ Learner completes diagnostic
→ Parent receives report
→ ₹199 credit preserved
→ ₹2,800 upgrade displayed
```

### D. Complete outcome loop

```text
Gap opens
→ Automatic direct-parent plan appears
→ Intervention works
→ AI Tutor state is actionable
→ Fresh reassessment works
→ Evidence appears
```

### E. Centre separation

Verify direct-parent learners do not change:

- centre learner count;
- centre gaps;
- centre closure rate;
- centre mastery/lift;
- centre heatmap;
- educator queues;
- centre assignments;
- centre evidence totals.

### F. Assessment lifecycle

```text
Create
→ Save Draft
→ Review
→ Explicit Publish
→ Explicit Assign
```

Test modal behavior at 100%, 125%, 150%, and 200% zoom and on representative mobile/tablet/desktop widths.

---

## 13. Founder Verdict Format

If all critical paths pass:

```text
FOUNDER_RETEST: PASS
Production URL:
Deployed full SHA:
Parent account used:
Learner used:
Payment/order evidence references:
Diagnostic run reference:
Report reference:
Known non-blocking issues:
NEXT: Independent read-only verification, then five-family controlled pilot.
```

If anything fails:

```text
FOUNDER_RETEST: FAIL
FIRST FAILING STEP:
ROLE:
ROUTE:
EXPECTED:
ACTUAL:
SCREENSHOT/ERROR:
RELATED RECORD IDs:
```

Fix only the first failing step. Then require:

```text
Root cause
→ Fix
→ Full regression tests
→ Commit
→ Full SHA
→ Clean worktree
→ Publish
→ Production verification
→ Founder acceptance (AI-executed evidence; §G1)
```

---

## 14. Standing Lovable Commit and Publish Rule

Every Lovable assignment must include, without waiting for the founder to ask:

1. Implement the requested scope.
2. Run the complete affected test suite.
3. Verify the full affected journey.
4. Commit approved changes to canonical repository `learning-start-nexus`.
5. Provide the full commit SHA.
6. Confirm the working tree is clean.
7. Confirm no required migrations/translations are untracked.
8. Publish/deploy the verified canonical HEAD when appropriate.
9. Verify production serves the intended behavior.
10. Provide production URL and deployment status.
11. Provide tests, screenshots, and evidence.
12. Provide known limitations.
13. Provide rollback commit and procedure.

Do not accept:

- “done” without a commit;
- “published” without production evidence;
- reports that silently edit history;
- completed work left only inside Lovable or staging.

For payments, destructive migrations, credential changes, or irreversible data actions, require safety verification and rollback readiness before publication.

---

## 15. Working Style

- Treat founder production observations as high-value evidence.
- When an audit conflicts with live founder experience, investigate the live evidence.
- Avoid speculative roadmaps when a concrete failing step exists.
- Use assignments with objective, scope, product laws, acceptance tests, deliverables, commit rules, publish rules, and rollback rules.
- Keep direct-parent and centre-managed journeys explicitly separated.
- Prefer one coherent assignment over multiple overlapping assignments.
- Do not expand beyond Class 10 Mathematics and Science until the pilot proves the current funnel.
- Do not expose internal IDs as primary learner/parent labels.
- Build, verify, commit, publish, verify production, then founder-test.

---

## 16. Continuity Maintenance Rules

After every verified release, update these files in the same repository commit or in an immediately following documentation-only commit:

- `PROJECT_STATUS.md`: concise current state and release identity.
- `PRODUCT_DECISIONS.md`: durable decisions and rationale.
- `TECHNICAL_STATE.md`: architecture, schemas, integrations, security, migrations.
- `ROADMAP.md`: active sequence only, with completed work moved to history.
- `CURRENT_ASSIGNMENT.md`: one current mission, owner, scope, acceptance criteria, blockers.
- `EDUOS_PROJECT_OPERATING_SYSTEM.md`: operating rules only, changed rarely.

Every update must include:

- timestamp with timezone;
- canonical branch;
- full commit SHA;
- production deployed SHA;
- what changed;
- test evidence;
- unresolved questions;
- next gate;
- rollback reference.

Historical reports must be marked superseded rather than rewritten when facts change.

---

## 17. Preventing Continuity Loss

1. Store all continuity files in the canonical repository, not only in chat.
2. Keep `CURRENT_ASSIGNMENT.md` short and authoritative.
3. Stamp the deployed full SHA in production so future checks do not rely on bundle probing.
4. Record every release in `PROJECT_STATUS.md`.
5. Keep decisions separate from implementation details.
6. Put screenshots and evidence paths in the release report.
7. Never store secrets in handoff files.
8. Start every new AI session with the bootstrap prompt in Section 1.
9. Ask the new AI to summarize the state and contradictions before proposing work.
10. Do not close the old chat until the new chat correctly restates the current mission and standing publish rule.

---

## 18. New-Chat Acceptance Check

The new chat must correctly answer all of these before continuing:

1. What is EduOS?
2. What is the current pilot scope?
3. What is the direct-parent commercial funnel?
4. Who answers the diagnostic?
5. What is the difference between `DIRECT_PARENT` and `CENTRE_MANAGED`?
6. Who generates/approves each learner mode's study plan?
7. What alone can close a gap?
8. What is the assessment lifecycle?
9. What is the standing Lovable commit/publish rule?
10. What is the current acceptance gate awaiting the founder (decision only, never execution)?
11. What is the exact full deployed SHA?
12. What remains unverified?

If the new chat cannot answer these from the supplied files, provide the missing document or require repository evidence before proceeding.

---

## Appendix — Documentation HEAD stamp (2026-08-27)

- **Documentation HEAD full SHA: `18321a2dbc0b32b3eb55e6c8988740d8a0a07894`** — contains this package, `EDUOS_PROJECT_OPERATING_SYSTEM.md`, `EDUOS_CONSOLIDATED_RELEASE_VERIFICATION.md`, `PROJECT_STATUS.md`, and `CURRENT_ASSIGNMENT.md`.
- **Production application SHA (separate): `92ac129d6e62b70bdd382db7a5aa8fdccadfe24c`** (last code-bearing commit; everything above is documentation-only).
- Previously recorded deployed documentation HEAD: `e73bbb047889fe3e8043be90e56e833f068a04dc` (superseded by the stamp above).

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

## Handoff update — 2026-08-28 (Wave 0 complete)

- Wave 0 foundation shipped: catalogue, versioning, learner subject selections, entitlements, pricing config.
- Commercial scope: CBSE Class 10 Mathematics and Science only; ₹199 / ₹2,999 unchanged.
- Tests 135 passing; typecheck and build clean; no new security finding.
- Read first: `EDUOS_WAVE_0_FOUNDATION_IMPLEMENTATION_REPORT.md`, then `EDUOS_CLASSES_9_12_EXPANSION_ARCHITECTURE.md`.
- Next gate: Wave 1 — Class 9 Mathematics and Science content preparation.

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

## 2026-08-28 16:45 UTC — New-Chat Continuity Closeout (authoritative)

A new chat taking over EduOS must accept the following as current truth.

### Release identity

| Item | Value |
|---|---|
| Canonical branch | `main` |
| Wave 0 functional application commit | `e38a303b361ec1848c12ce7e490a8e0a7945f528` |
| **Deployed production commit** | **`e6e34008bd264b1533707180428d860dda76a6f9`** |
| Production URL | https://www.eduos.global (LIVE) |
| Rollback commit | `48548b420c601f8bcaf11a47c6853a55ebfb5526` |
| Verification | 135/135 tests (13 files) · typecheck PASS · build PASS · worktree CLEAN · Class 10 regression PASS · 0 critical security findings |

Do not describe `e38a303` as the deployed production HEAD.

### Repository authority

- `eduos-ai` = canonical **Product Authority**
- `learning-start-nexus` = canonical **Application Authority** and the only production deployment source
- `eduos` = **Fleet Authority** / EDUOS fleet seat

Select the repository by the authority being changed; ordinary live application work defaults to
`learning-start-nexus`.

### Production security correction (recorded)

The release includes a P0 `profiles` organisation-isolation correction: self-insert must leave `org_id` null,
self-update must preserve `org_id`, admins remain scoped to their own organisation. Post-fix scan: 0 critical.

### Standing rules

- **Founder communication rule:** every discussion of implementation, verification, remediation or deployment must
  be accompanied by a separate, self-contained, copy-paste-ready Lovable assignment covering target authority,
  target repository, objective, scope, tests, journey verification, commit + full SHA, clean worktree, migration
  and translation confirmation, publish/deploy, production verification, URL and status, evidence, known
  limitations, and rollback commit and procedure.
- **Delivery rule:** Build → Verify → Commit → Publish when appropriate → Verify Production.
- Never wait for the founder to ask for a commit or a publish.

### Known limitations

- legacy `parent_entitlements` remains the live write path;
- `catalogue_subject_id` NOT NULL tightening deferred;
- content volume is the binding constraint for future waves;
- academic-year rollover policy undecided;
- INR is the only supported currency;
- remaining security findings are accepted non-critical warnings.

### Current gate

Wave 1 — Class 9 Mathematics and Science content preparation. **NOT STARTED and not authorised.**
Do not begin Wave 1 without an explicit founder assignment.

---

## Wave 1 status update (2026-08-28)

Wave 1 (Class 9 Mathematics and Science content preparation) has **STARTED** under explicit founder
authorisation and returned **WAVE_1_CONTENT_PREPARATION: PARTIAL**.

- Authoritative record: `EDUOS_WAVE_1_CLASS_9_CONTENT_PREPARATION_REPORT.md`.
- Deliverables: deterministic inactive content packs under `content/class-9/`, pipeline contracts in
  `src/lib/class9-content-schema.ts`, generator/validator in `scripts/class9/`, and 18 new tests.
- Structure and provenance are complete; automated validation passes with 0 errors.
- Volume and human-review gates are incomplete by design: 400 verified questions required, 88 drafted,
  0 human-reviewed, 0 verified, 0 approved.
- Class 9 remains inactive, hidden, non-purchasable and excluded from paid diagnostics.
- No database writes, no migration, no runtime code change, no production deployment.
  Deployed production commit remains `e6e34008bd264b1533707180428d860dda76a6f9`.
- Test total is now **153 passing across 14 files** (Wave 0 baseline was 135/13).

### Current gate

Complete Class 9 authoring to the derived per-unit requirement, then a named subject-expert review cycle.
**Class 9 activation, pricing and commercial release remain unauthorised.**

---

## Wave 1 continuation status update (2026-08-29 IST)

**WAVE_1_QUESTION_BANK_COMPLETION: PASS · WAVE_1_COMMERCIAL_READINESS:
BLOCKED_PENDING_SUBJECT_EXPERT_REVIEW.** Supersedes the volume figures in the
2026-08-28 Wave 1 status update above.

- 400/400 original Class 9 questions prepared (Mathematics 240, Science 160); every unit holds
  the derived requirement of 40 with 100% outcome and atom coverage and no single-outcome padding.
- 0 human-reviewed, 0 verified, 0 approved — subject-expert review packages are ready but unused.
- `VALIDATION: PASS` (0 errors / 0 warnings / 0 duplicates); rebuilds are byte-identical.
- Class 9 stays inactive, hidden, non-purchasable and excluded from paid diagnostics;
  Class 10 pricing (₹199 / ₹2,999 / ₹199 credit / ₹2,800 upgrade) and journeys untouched.
- No database writes, no migration, no runtime change, no deployment. Deployed production commit
  remains `e6e34008bd264b1533707180428d860dda76a6f9`.
- Tests: 164 passing across 14 files. Typecheck and production build pass.
- Read next: `EDUOS_WAVE_1_CLASS_9_CONTENT_PREPARATION_REPORT.md` (Addendum A) and the five
  `EDUOS_CLASS_9_*` reports.

### Current gate

Named subject-expert review cycle. **Class 9 activation, pricing and commercial release remain unauthorised.**

---

## 2026-09-02 — Permanent Multi-AI Continuity Governance (inherited by every future chat)

These rules are permanent. They are inherited automatically by every new EduOS chat and must never be
re-requested by the founder.

### G1. Founder Non-Execution Rule (MANDATORY, overrides all earlier wording)

Never assign execution work to the founder. Complete all possible work through the appropriate AI/tool
assignment. Involve the founder **only** for:

1. an unavoidable manual action no available tool can perform;
2. an inaccessible credential or secret;
3. a payment;
4. a legal, contractual or external approval;
5. a decision that cannot be made by the available tools.

Any earlier instruction in this file, or in any continuity document, that asks the founder to test,
verify, run, retest, configure or execute anything is **superseded**: the AI executes it, and the founder
is asked only for acceptance or for one of the five exceptions above.

### G2. Continuity ownership

M365 Copilot is **AI Program Director and continuity owner**. Verified results are handed back to M365
Copilot at the end of every assignment.

### G3. Proactive completion

Continue proactively until the objective is fully completed. Do not stop at a partial result and wait for
a prompt when the remaining work is executable by an available tool.

### G4. Delegation format

Every delegated task ships as a separate, self-contained, copy-paste-ready assignment that names the exact
tool and mode (for example: "TOOL/MODE: Lovable, implementation mode"). Every implementation or
verification stage includes its own separate Lovable assignment. Every Figma assignment includes the
complete downloadable implementation package.

### G5. Language rules

- All assignments are written entirely in **English**.
- Normal EduOS conversational responses are very short, relevant and in **Devanagari Hindi**, while
  technical and standard terms remain in English.
- These are chat/communication rules only. The **product** remains English-only; no Hindi copy, dictionary
  or language toggle may be reintroduced into the application.

### G6. Duplication

Avoid duplicate work unless it is intentional independent verification, and say so explicitly when it is.

### G7. Business-Value-First prioritisation (MANDATORY, permanent)

Prioritise work in this order:

1. Security and serious production risks
2. Revenue, payment and conversion impact
3. Core parent and learner journeys
4. Compliance and commercial-release blockers
5. Production defects
6. Necessary UX improvements
7. Optional polish and nonessential features

Credit-efficiency rules:

- Every assignment must state expected business value and priority.
- Defer or bundle low-value polish, duplicate audits and unnecessary documentation.
- Avoid repeating completed verification without new evidence or risk.
- Do not implement optional features while a higher-value blocker is open.
- Prefer one bundled, independently verifiable assignment over multiple small assignments.
- Do not assign avoidable execution work to the founder (see G1).
- Continue proactively through appropriate AI/tool assignments until completion.
