# EduOS-AI Historical Usage and Repository-Authority Verification

**Type:** Read-only repository audit (documentation-only deliverable)
**Date:** 2026-08-28 (UTC)
**Priority:** P0 Pre-Wave-1 Governance Verification
**Target authorities:** PRODUCT and APPLICATION
**Deployment source:** `learning-start-nexus` only

---

## 1. Executive verdict

**No traceable evidence exists that `eduos-ai` has ever supplied, governed, generated, validated or
transferred any artifact used in `learning-start-nexus` or in the production EduOS application.**

Within the accessible workspace there is no repository or project named `eduos-ai`. The only
EduOS-adjacent second project accessible to this audit (`EduGrow Insights`,
id `d552b295-07b2-4702-9fd4-f43c8c1e17f0`) is an **untouched Lovable scaffold**: 75 files, all
shadcn/ui boilerplate plus a placeholder home route. It contains no curriculum, no content packs,
no questions, no provenance manifests, no validators, no import/export scripts and no reference to
the production application.

Every production artifact — curriculum hierarchy, Class 10 Mathematics and Science packs,
question bank, provenance (`question_bank.external_ref`), import scripts, validators, Wave 0
catalogue foundation and the pricing/entitlement model — originates and lives in
`learning-start-nexus`.

**Classification of anything in `eduos-ai`: EXISTING BUT NOT YET ADOPTED — not part of the
production lineage.**

**Recommendation: `learning-start-nexus` is the Wave 1 primary repository.** `eduos-ai` remains
inactive for Wave 1 unless the founder separately authorizes establishing a new Product Authority
workflow.

---

## 2. Repository identities and full current HEADs

| Repository | Status in this audit | HEAD |
|---|---|---|
| `learning-start-nexus` (this project) | Accessible, canonical branch `main` | `fdc2dfd80b4032fea32ed956b58c383bc16d9f8d` |
| `eduos-ai` | **Not accessible / not found** in this workspace | UNVERIFIED |
| `EduGrow Insights` (only other EduOS-named project) | Accessible read-only snapshot | `254267b4` (snapshot commit) |
| `eduos` (proposed Fleet Authority) | **Not accessible / not found** | UNVERIFIED |

Workspace enumeration returned exactly three accessible projects owned by the founder:
`EduGrow Insights`, `Mind Vault`, `Your Project Potential`. Name and topic searches for
"eduos-ai" and "eduos" returned only `EduGrow Insights`.

`learning-start-nexus` repository state: working tree clean, 874 commits across all refs,
branches `main`, `origin/main`, `origin/_agent-publish`, `origin/lovable-backup-main-1787766178`
and transient `edit/*` working branches.

---

## 3. Historical usage evidence

| # | Audit question | Answer | Evidence |
|---|---|---|---|
| 1 | Was `eduos-ai` used for any previous EduOS assignment? | **NO** (within accessible evidence) | Every assignment recorded in `CURRENT_ASSIGNMENT.md`, `PROJECT_STATUS.md`, `TECHNICAL_STATE.md`, `ROADMAP.md` and the 30+ `EDUOS_*.md` reports was executed inside this repository. No report names `eduos-ai` as a source, input or destination. |
| 2 | Did any previous agent commit to `eduos-ai`? | **UNVERIFIED** | No such repository is reachable, so its commit history cannot be inspected. No commit in `learning-start-nexus` (874 commits, all refs) mentions it: `git log --all --grep="eduos-ai"` returns zero results. |
| 3 | Did it supply Class 10 Mathematics or Science curriculum content? | **NO** | `EDUOS_CLASS10_IMPORT_EXECUTION_REPORT.md` records both packs (Maths: 7 units / 14 chapters / 15 outcomes / 45 atoms; Science: 5 units / 13 chapters / 55 outcomes / 165 atoms) as imported by scripts in this repository against NCERT source books uploaded to this project's storage. No external repository is cited as source. |
| 4 | Did it supply any existing content packs? | **NO** | Content packs are database rows in this project's backend, provenance-stamped via `question_bank.source = 'import'` and `question_bank.external_ref`. No pack file, manifest or lineage record references another repository. |
| 5 | Did it generate or validate any questions imported into `learning-start-nexus`? | **NO** | Generation used this repository's AI pipeline (`src/lib/question-bank.*`, Lovable AI Gateway via `src/lib/ai-gateway.server.ts`); validation was the four-check import validation described in `EDUOS_CLASS10_IMPORT_EXECUTION_REPORT.md` §2/§4 plus reviewer sign-off recorded in `EDUOS_PILOT_CONTENT_GATE_REPORT.md`. |
| 6 | Did it supply the curriculum hierarchy, outcomes, atoms or provenance used by the live application? | **NO** | The hierarchy (`books` → `curriculum_units` → `curriculum_chapters` → `assessment_outcomes` → `question_bank`) and the Wave 0 catalogue hierarchy (`catalogue_boards` → `catalogue_academic_years` → `catalogue_classes` → `catalogue_streams` → `catalogue_subjects` → `catalogue_subject_sources`) were defined by migrations committed in this repository (`20260828112426_*`, `20260828114401_*`). |
| 7 | Was any code copied, ported or generated from `eduos-ai`? | **NO** | The only accessible candidate project contains solely unmodified Lovable/shadcn scaffold files (`src/lib/` holds just `utils.ts` and Lovable error-reporting helpers; `src/routes/index.tsx` is the blank-page placeholder). No file in `learning-start-nexus` matches a non-boilerplate file there. |

---

## 4. Cross-repository reference evidence

**Question 8 — references to `eduos-ai` inside `learning-start-nexus`:**

| Surface | Result |
|---|---|
| Documentation | **2 hits, both forward-looking governance proposals only:** `EDUOS_PROJECT_OPERATING_SYSTEM.md:214` (`\| eduos-ai \| Product Authority \| product definition, strategy, canonical product truth \|`) and `EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md:697` (`eduos-ai = canonical Product Authority`). Both were written during the repository-authority review; neither records a transfer, import or dependency. |
| Scripts | none |
| Package configuration (`package.json`, `bunfig.toml`) | none |
| CI | none (no CI workflow references it) |
| Source comments (`src/**`) | none |
| Content manifests | none |
| Provenance fields (`question_bank.source`, `question_bank.external_ref`) | none |
| Import reports (`EDUOS_CLASS10_IMPORT_*`) | none |
| Commit messages (`git log --all --grep`) | none — zero of 874 commits |

**Question 9 — references inside `eduos-ai`:** **UNVERIFIED** — the repository is not reachable.
For the accessible `EduGrow Insights` snapshot, a case-insensitive search for
`learning-start-nexus`, `eduos.global`, `class 10`, `CBSE`, `question_bank` and `catalogue`
returned **zero matches** across all 75 files.

**Question 10 — operational synchronization or transfer process:** **NO.** No sync script, submodule,
remote, webhook, CI job, export pipeline or documented manual transfer procedure exists in
`learning-start-nexus`. Git remotes are limited to this project's own origin.

---

## 5. Matching-artifact comparison

Comparison performed by path, filename, stable identifier, relevant content and directory shape
between `learning-start-nexus` and the accessible `EduGrow Insights` snapshot.

| Artifact class | `learning-start-nexus` | Other project | Match |
|---|---|---|---|
| Curriculum spine files/migrations | Present (Wave 0 + pilot migrations) | Absent | No |
| Content-pack directories | Present (DB-resident, import-scripted) | Absent | No |
| Provenance manifests | `question_bank.external_ref` unique index | Absent | No |
| Validators | Import validation + `src/lib/__tests__/*` (135 tests, 13–14 files) | Absent (no tests) | No |
| Import/export scripts | Present | Absent | No |
| Domain-core logic (`catalogue-shared.ts`, `gap`, `outcomes`, `study-plan`, `blueprint`) | Present | Absent | No |
| Release/handoff documents | 40+ `EDUOS_*.md` | Absent | No |
| shadcn/ui component files | Present | Present | Common upstream scaffold only — not evidence of transfer |

The only overlap is generic Lovable/TanStack Start/shadcn scaffolding, which both projects received
independently from the platform template. Per the audit's own rule, conceptual or template
similarity is **not** treated as evidence of historical use.

---

## 6. Content-pipeline authority evidence

**Question 12 — authoritative implementation of the production content pipeline:
`learning-start-nexus`.**

Pipeline, all resident here: book upload → PDF extraction (`unpdf`) → curriculum spine
(`curriculum.server.ts`) → assessment outcomes → question generation/import (`question-bank`,
`ai-gateway.server.ts`) → verification (`/assessment-verification`, `/question-bank-audit`) →
blueprint and diagnostic allocation (`blueprint`, `diagnostic`) → gap analysis (`gap.server.ts`) →
study plan (`study-plan.server.ts`). Idempotency and provenance are enforced by the
`question_bank.external_ref` unique index and the `source` check constraint that admits `import`.

Production (`https://www.eduos.global`, deployed commit
`e6e34008bd264b1533707180428d860dda76a6f9`) is built and deployed exclusively from this repository.

---

## 7. Has `eduos-ai` been operationally used before?

**No — not within any accessible evidence.** Its name appears only in two governance tables written
during the recent repository-authority review, i.e. as a *proposal*, never as an executed step. No
assignment, report, migration, script, commit message, provenance field or database record connects
it to the product.

---

## 8. Adopting `eduos-ai` for Wave 1

**Introduction of a NEW workflow.** It would require: establishing a Product Authority repository,
defining specification and content-contract formats, building an export/import or synchronization
path into this application, adding provenance mapping to existing catalogue identifiers, and
creating a dual-authority change-control process. None of these exist today.

It would **not** be continuation of an established workflow, because no such workflow has ever run.

---

## 9. Recommended Wave 1 primary repository

**`learning-start-nexus`.**

Per the decision rule: `eduos-ai` could be recommended only if traceable evidence showed it already
governs the relevant curriculum/content contracts *and* its artifacts connect to the current
pipeline without duplication or conflicting authority. Neither condition is met — no evidence of
governance, and no artifacts at all in the accessible workspace.

`eduos-ai` remains **inactive for Wave 1** unless the founder separately authorizes establishing a
new Product Authority workflow as an explicit assignment.

---

## 10. Risks of the recommended choice

1. **Single-repository concentration** — product specification, application code and content
   pipeline continue to share one repository; product truth is not independently versioned.
   *Mitigation:* the continuity documents (`EDUOS_PROJECT_OPERATING_SYSTEM.md`,
   `PRODUCT_DECISIONS.md`, `CURRENT_ASSIGNMENT.md`) already act as the in-repo product record.
2. **Deferred Product Authority** — if a separate Product Authority is later adopted, Wave 1
   content contracts will need retro-registration there.
   *Mitigation:* Wave 1 content is catalogue-versioned (academic year, canonical codes), so it can
   be exported later without rework.
3. **Governance-document drift** — the operating-system and handoff documents still name `eduos-ai`
   as Product Authority while it holds nothing. *Mitigation:* this audit is the corrective record;
   the founder may choose to mark that row "proposed, not yet adopted" in a future documentation
   assignment (not changed here, per the no-implementation rule).

---

## 11. Unresolved evidence gaps

- `eduos-ai` as a distinct repository is **not reachable** from this workspace: no project of that
  name or ID exists among the three accessible projects, and topic search surfaced none. Its
  commit history, branches, tags, README/AI instruction files and any local-only or deleted history
  therefore **cannot be inspected**. Answers depending solely on its internal contents (Q2, Q9) are
  reported **UNVERIFIED**, not NO.
- The proposed Fleet Authority repository `eduos` is likewise not reachable.
- External agent records (chats or work performed outside this project's history) cannot be
  enumerated from here.
- If `eduos-ai` exists as a GitHub repository outside the Lovable workspace, a founder-side
  inspection would be required to close Q2 and Q9 definitively. Missing evidence has **not** been
  converted into a YES or NO conclusion.

---

## 12. Verification performed

- Repository consistency check: `git status --short` empty before the audit; HEAD
  `fdc2dfd80b4032fea32ed956b58c383bc16d9f8d`.
- Cross-reference searches: case-insensitive `eduos-ai` / `eduos_ai` across the entire tree
  (excluding `node_modules`) — 2 hits, both documentation governance tables.
- Commit-message search: `git log --all --grep="eduos-ai"` — 0 results across 874 commits.
- Branch and history inspection: all local and remote refs enumerated.
- Matching-artifact check: full file listing and content search of the
  `EduGrow Insights` read-only snapshot.
- Secrets scan on this report: contains no keys, tokens, credentials, project IDs or connection
  strings.
- No functional file, migration or translation was modified during this audit.

---

## 13. Rollback

Documentation-only. Previous documentation commit:
`fdc2dfd80b4032fea32ed956b58c383bc16d9f8d`. Revert procedure: delete
`EDUOS_AI_HISTORICAL_USAGE_AUDIT.md` (or revert the audit commit). No code, data, migration or
deployment rollback is needed; production remains at
`e6e34008bd264b1533707180428d860dda76a6f9` and was not touched.
