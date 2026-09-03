---
# EduOS — Current Assignment

**Last verified:** 2026-09-02 (UTC)
**Evidence source:** the founder's active request in this Lovable thread.

This file holds **only** the active assignment. When it is complete, replace the contents with the next assignment — do not append history.

---

## Governing rules (permanent, inherited by every chat)

- **Founder Non-Execution Rule (mandatory).** Never assign execution work to the founder. Complete all
  possible work through the appropriate AI/tool assignment. Involve the founder only for an unavoidable
  manual action, an inaccessible credential, a payment, a legal/external approval, or a decision that
  cannot be performed by available tools. Any "founder retest/verify/configure" wording anywhere in the
  continuity set is superseded — the AI executes it and the founder only accepts.
- M365 Copilot is AI Program Director and continuity owner; verified results are handed back to it.
- Continue proactively until the objective is fully completed.
- Every delegated task has a separate copy-paste-ready assignment naming the exact tool and mode; every
  implementation or verification stage includes a separate Lovable assignment; every Figma assignment
  includes the complete downloadable implementation package.
- All assignments are written entirely in English. Normal EduOS responses are very short, relevant and in
  Devanagari Hindi, with technical and standard terms in English. Product copy stays English-only.
- Avoid duplicate work unless it is intentional independent verification.

Full text: `EDUOS_PROJECT_OPERATING_SYSTEM.md` §11, `PRODUCT_DECISIONS.md` D10–D16,
`EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md` §G1–G6.

---

## Active assignment

**Title:** Compliance evidence completion and draft-review preparation (Class 10, 2026-27)
**Received:** 2026-09-03
**Priority:** P0
**Status:** Complete. Local repository only — production untouched, nothing deployed, nothing promoted.

### Outcome

| Item | Result |
|---|---|
| Official source categories completed | 4 of 6 now `final`/`applicable`: CBSE curriculum, both subject syllabi, NCERT textbooks (27 chapter PDFs, composite checksum), NCERT rationalised-content booklet |
| Still missing | `sample_paper`, `marking_scheme` for 2026-27 — CBSE has not published them (index HTTP 404). No substitute used; 2025-26 equivalents recorded as `not_applicable` |
| Source registry | Regenerated, 14 records, 0 errors, 2 pending-confirmation warnings |
| 326-draft reconciliation | Register 326 = database 326, sorted `external_ref` MD5 identical, 0 orphans |
| Automated draft validation | **0 blockers**, 242 warnings; 0 exact duplicates, 1 near-duplicate pair, 4 NCERT verbatim flags |
| Pool allocation | 125 DIAGNOSTIC / 201 FRESH_REASSESSMENT, disjoint, never combined |
| SME queues | Mathematics 235 rows, Science 91 rows — separate files, six empty SME sign-off columns each |
| Promotions | **None.** All 326 remain `draft`/`unverified`; Science source book remains unapproved |
| Compliance verdict | `SOURCE_PENDING` — Mathematics and Science remain NOT_CERTIFIED |
| Tests · typecheck | 308 passing / 27 files · clean |
| Deployment | Not performed |

### Deliverables

`EDUOS_CLASS10_MISSING_OFFICIAL_SOURCES_REPORT.md`, `EDUOS_CLASS10_DRAFT_VALIDATION_REPORT.md`,
`EDUOS_CLASS10_DUPLICATE_REPORT.md`, `EDUOS_CLASS10_COPYRIGHT_CONTAMINATION_REPORT.md`,
`EDUOS_CLASS10_POOL_ALLOCATION_REPORT.md`, `EDUOS_CLASS10_MATHS_SME_REVIEW_QUEUE.csv`,
`EDUOS_CLASS10_SCIENCE_SME_REVIEW_QUEUE.csv`, `content/compliance/class-10-2026-27.{missing-sources,sha256-manifest,draft-db-snapshot,draft-validation}.json`,
regenerated `content/compliance/cbse-2026-27.sources.json` and `EDUOS_CLASS_10_GAP_REGISTER.md`.

New reproducible tooling: `scripts/compliance/retrieve-missing-sources.ts`,
`scripts/compliance/update-source-register.ts`, `scripts/class10/sme-review-prepare.ts`,
covered by `src/lib/__tests__/class10-sme-review-prepare.test.ts`.

### Rollback

Revert the commit for this assignment. It touches documentation, compliance evidence files and
new scripts only — no schema, no migration, no data mutation, no deployment.

### Next gate

Named Mathematics and Science SME sign-off on the two review queues (content governance, not software),
plus CBSE publication of the 2026-27 sample papers and marking schemes. No Class 9, 11 or 12 work, no
pricing expansion and no new features until Class 10 receives a compliance certificate.

---

## Assignment: Canonical Evidence Reconciliation — Class 10 Certification Review Package (2026-09-02)

**Mode:** Lovable, local repository + live database analysis. Read-only. No deployment.
**Status:** Complete.

| Item | Result |
|---|---|
| Deliverables | `EDUOS_CLASS10_CERTIFICATION_REVIEW_PACKAGE_CORRECTED.md`, `EDUOS_CLASS10_CONTRADICTION_RECONCILIATION_REGISTER.md` |
| Reconciliation base HEAD | `8b58bd61449c04236caed1f9a230eec72fbbbcaf` (assignment named `96615046…`; discrepancy disclosed) |
| Superseded evidence commit | `916614a399b8a2786cf26a93827d077120dd3bad` — not used |
| Contradictions | 2 VALID (C-09, C-11), 7 RESOLVED, 3 STALE, 0 UNSUPPORTED |
| Certification status | Mathematics NOT_CERTIFIED · Science NOT_CERTIFIED |
| Validation | 293/293 tests, typecheck clean, build clean, JSON↔CSV exact, source hashes re-verified live |
| Security | 0 critical / 0 error / 3 warn (advisory) |
| Deployment | None. Production remains `b559058753b9d0acc6a25438fdc0cf79122ce4af`, health 200 |

### Next gate

Named SME review and promotion of the 326 existing Class 10 draft items, Science book approval, and
retrieval of the five missing official source types. No new authoring is required — the deficit
(235 Mathematics + 91 Science) equals the existing draft corpus exactly.
