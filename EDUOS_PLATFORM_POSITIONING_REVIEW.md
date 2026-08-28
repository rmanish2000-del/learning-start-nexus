# EduOS — Platform Positioning & School Readiness Assessment

**Date:** 2026-08-28 (UTC) · **Repository:** `learning-start-nexus` · **Branch:** `main`
**Type:** Strategic audit only — no feature development, no redesign, no new workflows.
**Evidence rule:** every claim below is traced to implemented code or the live schema. Anything not traceable is listed under *Assumptions & unverified areas*.

---

## 1. Current platform capabilities (as implemented)

### 1.1 Identity & tenancy

| Capability | State | Evidence |
|---|---|---|
| Roles | 5: `admin`, `educator`, `student`, `reviewer`, `parent` (`app_role` enum) | `src/integrations/supabase/types.ts` |
| Roles storage | Separate `user_roles` table + `private` schema `SECURITY DEFINER` checks | schema, `src/lib/admin.server.ts` (`requireAnyRole`) |
| Tenant object | `organizations` (name, tagline, email, phone, website, timezone) | schema |
| Tenant isolation | `org_id` on learners, assessments, outcomes, profiles; RLS enforced and independently probed | `/rls-verification`, `src/lib/audit.server.ts` |
| Learner operating mode | `learners.learner_mode` = `direct_parent` \| `centre_managed`; direct learners excluded from all centre aggregates | `src/lib/learner-mode.ts`, `educator-board.server.ts`, `outcome-dashboard.server.ts` |

**Tenancy depth is one level: organization → learners.** There is no second structural level (campus, class, section, batch, cohort) anywhere in the schema. A repository-wide search for `cohort`, `section`, `class_id`, `attendance`, `timetable`, `term`, `semester`, `report card` returns no structural implementation.

### 1.2 Learner & educator management

- `learners`: org, educator assignment, handle, grade, board, subject, status, mastery score/lift, focus note, learner mode.
- Learner creation paths: parent-led (`parent-account.server.ts`), admin-led (`/admin`), CSV roster import (`centre-onboarding-shared.ts`, `learner-import-dialog.tsx`, 4 unit tests).
- Educator assignment: single `educator_id` per learner; assigned by centre admin.
- Credentials: handle + 6-digit PIN, provisioned atomically, resettable by owning parent and admin.

### 1.3 Curriculum & content

- Hierarchy: books → units → chapters → topics → outcomes (no subtopic level), plus `concept_nodes` / `concept_edges`.
- PDF book upload and extraction (`book-upload.server.ts`, storage-backed).
- `question_bank` with `question_verifications`; imported items land `draft` / `unverified` and need Verification Center sign-off.
- Pilot content gate is hard-coded: `PILOT_BOARD = "CBSE"`, `PILOT_CLASS = 10` (`src/lib/parent-account-shared.ts`).

### 1.4 Assessment → outcome loop (the strongest asset)

```text
Blueprint → Assessment (DRAFT → READY_FOR_REVIEW → PUBLISHED → ASSIGNED → IN_PROGRESS → COMPLETED)
        → Diagnostic session → Auto-scoring → Learning gaps (<70% mastery)
        → Recommendations → Interventions → AI Tutor (Socratic, scoped)
        → Reassessment → learner_outcomes (baseline, post, mastery_lift, confidence)
        → Evidence + Outcome Proof dashboards
```

Backed by `assessments`, `assessment_sessions`, `learning_gaps`, `interventions`, `tutor_sessions`, `tutor_interactions`, `learner_outcomes`, `learner_evidence`, `mastery_history`. Server-enforced ownership: only the learner may submit answers (`assertLearnerAnswerer`); parents cannot modify scores; the tutor cannot close gaps.

### 1.5 Commerce & consent

`parent_orders`, `parent_entitlements`, `parent_learner_links`, Razorpay live integration with signature-verified idempotent webhooks, encrypted credential storage, payment audit centre, `guardian_consents` for AI Tutor, cookie consent, Terms/Privacy, Hindi + English parent journey.

### 1.6 Onboarding & assurance

Centre application (`pilot_leads`) → admin approval → org + admin provisioning → CSV roster import. Role-based tours, checklists, Quick Start, Help Center. Fourteen audit/verification centres (`/rls-verification`, `/assessment-proof`, `/outcome-proof`, `/pilot-evidence`, sprint audits) producing independently reproducible evidence. 74/74 unit tests passing.

---

## 2. Parent fit analysis

**Fit: strong — this is the only fully monetized, fully self-serve journey.**

Supported end-to-end: free learning check → parent account → student profile → ₹199 diagnostic purchase → learner handoff (learner answers, not parent) → auto-scoring → gap report → auto-generated study plan with no educator dependency → AI Tutor → reassessment → outcome report → ₹2,999 annual upgrade.

Gaps: content limited to CBSE Class 10 Maths/Science; no sibling/multi-child dashboard beyond per-learner cards; no push/email progress digests; Board Success Plan fulfilment is manual.

**Verdict:** production-ready as a standalone paid product.

---

## 3. Coaching centre fit analysis

**Fit: strong for small-to-mid centres (verified end-to-end).**

Supported: centre application and approval, org + admin provisioning, CSV roster import, educator assignment, assessment authoring with draft-first publishing safety, diagnostic assignment, gap heatmap, prioritised intervention queue, cohort progress and outcome dashboards, centre-vs-direct metric isolation (verified with zero leakage for Pilot Learning Centre, Ahmedabad).

Gaps: no batch/class structure — learners are a flat roster per org; no billing for centres (only parent commerce); no educator-level performance reporting; no bulk assignment to a group; new centres start with an empty content library.

**Verdict:** operationally viable today (`OPTION_A_STATUS = VERIFIED`); scales awkwardly past a few hundred learners because of the flat roster.

---

## 4. School fit analysis

### 4.1 What already supports schools

| Need | Status |
|---|---|
| Multi-tenant org isolation with proven RLS | Ready |
| Teacher (educator) and admin roles with server-side gates | Ready |
| Curriculum ingestion from real textbooks | Ready |
| Blueprint-driven assessment authoring with review/publish gates | Ready |
| Auto-scoring, gap detection, remediation, reassessment, evidence | Ready — this is the differentiator |
| Parent visibility on their own child | Ready |
| Bulk learner onboarding by CSV | Ready |
| Compliance surface (consent, privacy, audit trails) | Ready |

### 4.2 What is missing for schools (blocking)

1. **Class/section/batch structure.** No `cohorts`/`sections` table; no learner→class membership; no timetable. Every school workflow (assign to 10-B, report by section) is impossible today.
2. **Group assignment.** Assessments are assigned per learner; no assign-to-class action.
3. **Multi-teacher per learner.** `learners.educator_id` is a single nullable column — a school learner has one teacher per subject, not one overall.
4. **Multi-subject learner record.** `learners.subject` is a single string; schools need a learner enrolled across 5–8 subjects.
5. **Academic calendar.** No terms, semesters, or academic-year scoping of outcomes; longitudinal reporting is unbounded time-series only.
6. **Attendance, homework, timetable, fee** — absent by design; schools often expect these from an "education platform".
7. **Report cards / consolidated progress reports** at class and school level; current dashboards are gap- and outcome-oriented, not scholastic.
8. **Hierarchy above org** — no district/trust/multi-campus grouping; a 3-campus school would need 3 disconnected orgs.
9. **SIS/LMS interoperability** — no SIS import, no Google Classroom/MS Teams sync, no SSO (Google Workspace for Education), no LTI, no OneRoster.
10. **Scale-grade content coverage** — the entire catalogue is hard-locked to CBSE Class 10 Maths/Science (`PILOT_BOARD`, `PILOT_CLASS`); a school needs Classes 6–12 across all subjects.
11. **Principal/leadership analytics** — `/outcome-proof` is centre-level; no school-wide, per-class, per-teacher comparative view.
12. **Procurement surface** — no institutional billing, contracts, POs, or seat licensing.

### 4.3 School-specific vs universal

**Universal (already built, reusable for every segment):** identity/roles, org isolation, curriculum model, question bank + verification, assessment lifecycle, diagnostics, scoring, gap detection, recommendations, interventions, AI Tutor, reassessment, mastery/outcomes, evidence, audit centres, consent/legal, i18n.

**School-specific (not built):** class/section structure, timetable, attendance, terms, report cards, multi-teacher subject mapping, campus hierarchy, SIS/SSO/LTI interop, institutional billing, leadership analytics.

**Ratio:** the intelligence core — the hard, defensible part — is universal and complete. What is missing for schools is *institutional structure and administration*, which is commodity work but broad.

### 4.4 Estimated effort to support schools

| Tranche | Scope | Estimate |
|---|---|---|
| A — Structural minimum | `cohorts`/`sections` + membership, group assignment, multi-subject enrolment, multi-teacher subject mapping, class-level dashboards | 4–6 weeks |
| B — Academic operations | Academic year/terms, consolidated progress reports, leadership analytics across classes/teachers | 3–4 weeks |
| C — Content scale | Extend beyond CBSE Class 10 Maths/Science (remove the pilot lock, import + verify per grade/subject) | 6–10 weeks, content-bound not code-bound |
| D — Interoperability & procurement | Google Workspace SSO, SIS/roster import, institutional billing/seats | 4–6 weeks |
| E — Optional school-admin suite | Attendance, timetable, homework, fees | 8–12 weeks (recommend: do not build) |

**Minimum credible school pilot = A + B + a Class-10-only content scope: roughly 7–10 weeks.** Full school platform including E: 6+ months.

---

## 5. Recommended positioning

**Recommendation: (D) with a staged go-to-market — position EduOS as an *Outcome Intelligence Platform*, sold today to Parents and Coaching Centres, architected openly for Schools.**

Rationale grounded in the code:

- The defensible asset is not the roster or the admin console — it is the **verifiable diagnostic → gap → intervention → reassessment → outcome-proof chain**, complete with independent audit centres. No segment-specific code owns it; it is universal.
- Narrow positioning as (A) undersells a working multi-tenant centre platform that has been verified end-to-end.
- Positioning as (C) today would be dishonest against the code: no class structure, no group assignment, no SSO, no content beyond Class 10 Maths/Science.
- (B) alone leaves the only revenue-proven journey (parent ₹199 → ₹2,999) as a footnote.

**Practical wording:** *"EduOS — Outcome Intelligence for learning. We prove that a learning gap was found, closed and re-verified."* Segment pages: Parents (live), Coaching Centres (live), Schools (waitlist / design partner, explicitly forward-looking).

**Branding/positioning changes implied (not implemented in this audit):**
1. Homepage should lead with outcome proof, not "tutoring centre platform".
2. Add a segment selector: Parent / Centre / School (waitlist).
3. Replace remaining "pilot"/"tutoring centre" framing with segment-neutral "learning organisation" language in public copy.
4. Do not claim school support anywhere until Tranche A ships.

**What NOT to do:** do not chase the school ERP surface (attendance, fees, timetable). That market is crowded and commoditised, and it dilutes the one thing EduOS does that others do not — proving outcomes.

---

## 6. Assumptions & unverified areas

- Effort estimates are engineering judgement from schema and code size; they are not commitments and exclude content authoring capacity.
- Market/pricing claims for schools are **not** evidence-backed; no school customer data exists in this repository.
- Content coverage beyond CBSE Class 10 Maths/Science is unverified — the code hard-locks the catalogue.
- Scale behaviour (thousands of learners per org) is untested; no load testing exists in the repo.
- Accessibility (WCAG) conformance is unverified; schools frequently require it.
- Data-residency / DPDP Act obligations for institutional customers are not assessed here.
- Google Workspace SSO, LTI, OneRoster: confirmed absent by code search, not by product decision record.

## 7. Known limitations of this review

Static audit of code and schema at the current HEAD, plus prior verification reports. No new production probing, no user research, no interviews with schools. Historical pilot assumptions were deliberately excluded.

## 8. Change record

- Repository change: this documentation file only. No code, schema, migration or translation changes.
- Migrations: none required. Translations: none required.
- Rollback: revert the commit adding `EDUOS_PLATFORM_POSITIONING_REVIEW.md`; no runtime impact since the file is not referenced by the application.
