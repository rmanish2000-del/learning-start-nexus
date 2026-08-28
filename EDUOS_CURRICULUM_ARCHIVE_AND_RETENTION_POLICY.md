# EduOS Curriculum Retention and Archival Policy

**Status:** ACTIVE (v1) · **Owner:** Founder · **Applies to:** every board, class, subject and academic session EduOS operates · **Companion to:** `EDUOS_ANNUAL_CURRICULUM_COMPLIANCE_STANDARD.md`

This policy governs how curriculum versions, their evidence and their audit artefacts are retained, archived, restored and purged. It is a specification; it authorises no database, schema or production change on its own.

## 1. Operational data windows

| Window | State | Rules |
|---|---|---|
| Current academic session | ACTIVE | Serves all normal application queries. Exactly one ACTIVE version per board/class/subject. |
| Previous academic session | SUPERSEDED, read-only | Remains available for reference and historical reports. No writes, no re-labelling. |
| Next academic session | Hidden DRAFT | May exist for preparation. Never selectable, never purchasable, never surfaced. |
| Older sessions | ARCHIVED | Removed from operational tables; preserved as archive bundles in cold storage. |

Invariants:

- Normal application queries default to the active academic session; a session must be named explicitly to read any other.
- Archived versions must never enter diagnostics, reassessments, selectors, recommendations or commercial eligibility.
- Read-only previous-session data is served for display and history only.
- No historical version is ever overwritten; a correction is a new version.
- Learner-linked historical evidence is never deleted, regardless of curriculum-version state.

## 2. Archive bundle standard

One bundle per `board · class · subject · academicSession · curriculumVersion`. Files are exactly:

| File | Contents |
|---|---|
| `manifest.json` | Bundle identity: board, class, subject, session, curriculum-version id, validator version, creation timestamp, producing commit SHA, file inventory, compression map. |
| `source-register.json` | Official-source metadata: source id, type, publisher, title, source URL, retrieval timestamp, checksum, applicability decision, authority order. |
| `curriculum-snapshot.json` | Compact machine-readable curriculum: units, chapters, topics, outcomes, atoms, statuses, assessability flags. |
| `crosswalk.json` | Official element → platform node mapping, including unmapped and out-of-syllabus records. |
| `change-register.json` | Classified changes against the prior version, with impact analysis and ambiguity records. |
| `question-reference-snapshot.json` | Question-version references and relationships (ids, version lineage, verification state, rollover classification) — references, not full item bodies where item bodies are preserved elsewhere. |
| `subject-expert-review.json` | Reviewer name, role, timestamp, explicit decision, scope reviewed, accepted limitations. |
| `compliance-report.json` | Gate results, derived compliance status, gap register, validator version, declared limitations. |
| `integrity.sha256` | SHA-256 of every other file in the bundle, one per line. |

Rules:

- Every field that would carry a checksum but was not genuinely computed records the literal `CHECKSUM_NOT_COMPUTED`. Fabricated checksums are a policy violation.
- Bundles are immutable once written. A correction produces a new bundle with a new version identifier.
- Bundles carry no learner identities, no payment data, no credentials and no encryption keys.

## 3. Eligibility rules

**Active storage.** The current session's curriculum version. Full operational tables, fully queryable, fully writable through the normal lifecycle.

**Recent read-only.** The immediately previous session. Retained in operational tables in a read-only state so historical reports and learner history resolve without a restore. Excluded from all selectors and commercial eligibility.

**Hidden draft.** The next session, in `DRAFT` through `APPROVED`. Present but invisible: excluded from catalogue selectors, diagnostics, pricing and entitlements until activation.

**Cold archive.** Any session older than the previous one, once its bundle has been written and integrity-verified. Full copies are removed from active operational tables; the compact bundle plus the permanent compact evidence set (section 6) is what remains.

## 4. Archive security

- Encryption at rest is required for all archive storage.
- Encryption in transit (TLS) is required for every write, read and restore.
- Public access is prohibited; no anonymous or unauthenticated read path may exist.
- Least privilege: archive write is limited to the archival job identity; restore is limited to named operators.
- Every access and every restoration action is logged with identity, timestamp, bundle id and outcome.
- Encryption keys are held only in the managed key service. Keys must never appear in the archive, the repository, reports, manifests or application logs.

## 5. Archive efficiency

- Selectively compress text-shaped payloads: JSON, CSV, Markdown, SQL exports and text reports.
- Do not re-compress already compressed artefacts (PDF, PNG, JPEG, ZIP); store them as-is.
- Deduplicate duplicate source downloads and duplicate generated reports by content hash; keep one copy and reference it.
- Every bundle ships an integrity manifest with actual SHA-256 values, or `CHECKSUM_NOT_COMPUTED` where a value was not genuinely calculated.
- Lifecycle policies move eligible bundles from standard to cold/archive tiers on schedule; lifecycle rules never delete.

## 6. Permanent compact evidence

Retained indefinitely, outside any purge window:

- board, class, subject and academic session;
- curriculum-version identifier and lifecycle history;
- official-source metadata, including source URL and checksum;
- activation and supersession history;
- the change register;
- reviewer and approval evidence;
- question-version relationships;
- learner-assessment curriculum-version references;
- critical compliance decisions and accepted limitations.

## 7. Purge policy

Purge-eligible after the approved retention window and only when the safety checks in section 8 pass:

- temporary extraction files;
- reproducible caches;
- duplicate reports;
- failed staging records;
- unused previews;
- intermediate AI drafts;
- duplicate source downloads;
- unused, unapproved and never-delivered questions.

Never purged, under any circumstance:

- learner-linked evidence;
- payment or entitlement evidence (governed by separate retention rules);
- published or previously delivered question-version evidence;
- named reviewer decisions;
- activation and supersession history;
- unresolved dispute or legal-hold records.

## 8. Safety checks before any purge

1. The bundle covering the affected version exists and its `integrity.sha256` verifies.
2. No record proposed for purge is referenced by learner evidence, an assessment, an entitlement or a payment.
3. No legal hold or unresolved dispute touches the version.
4. The permanent compact evidence set (section 6) is present and complete.
5. The purge plan is recorded with a named approver and timestamp before execution, and the executed result is logged.

A failed check aborts the whole purge; partial purges are prohibited.

## 9. Restore procedure

1. Identify the bundle by `board · class · subject · session · curriculumVersion`.
2. Retrieve from cold storage using a named operator identity; the retrieval is logged.
3. Verify `integrity.sha256` against every file. Any mismatch aborts the restore and raises an incident.
4. Load into an isolated read-only inspection scope. A restore never writes into operational curriculum tables and never reactivates a version.
5. Reactivation, if ever required, is a new curriculum version created through the normal lifecycle, not a reversal.
6. Record the restore: who, when, which bundle, why, what was produced.

## 10. Integrity verification

- Verification recomputes SHA-256 per file and compares to `integrity.sha256`.
- Bundles are verified on write, on scheduled audit, and on every restore.
- Entries recorded as `CHECKSUM_NOT_COMPUTED` are reported as unverifiable, not as passing.
- A verification failure blocks restore, blocks purge and is treated as an incident.

## 11. Access control summary

| Action | Who |
|---|---|
| Write bundle | Archival job identity only |
| Read/list bundles | Named compliance operators |
| Restore | Named operators, logged, read-only scope |
| Approve purge | Founder or delegated compliance owner, recorded |
| Public | No access |

## 12. Relationship to the compliance standard

This policy implements the standard's laws of annual regeneration, immutable historical evidence, no silent rollover and determinism. Where this policy and the compliance standard appear to conflict, the compliance standard governs and the conflict is escalated as an ambiguity.
