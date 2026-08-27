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
Root cause → Fix → Full regression tests → Commit → Full SHA → Clean worktree → Publish → Production verification → Founder retest
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
