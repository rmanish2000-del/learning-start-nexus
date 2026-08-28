# EduOS Annual Curriculum Rollover Runbook

One repeatable pass per board/class/subject, per academic session. Nothing in it is optional, and no step may be skipped because "the syllabus looks the same".

## Timeline (relative to session start, typically April)

| When | Step |
|---|---|
| T-16 weeks | 1. Watch for release of the session's CBSE curriculum and subject syllabi |
| T-14 | 2. Retrieve, hash and record every official document in the source registry |
| T-13 | 3. Build the new-session curriculum snapshot from the official spine |
| T-12 | 4. Run the change diff against the active session; resolve every `AMBIGUOUS` with a named reviewer |
| T-11 | 5. Run impact analysis; produce the work list per surface |
| T-10 | 6. Classify every existing question for rollover; retire, remap or re-review |
| T-8 | 7. Author replacement and new content to satisfy the depth law |
| T-5 | 8. Subject-expert review and sign-off (name, timestamp, decision) |
| T-4 | 9. Run the compliance gate; fix until all seven gates pass |
| T-3 | 10. Approve the curriculum version; supersede the previous one |
| T-2 | 11. Activate the session, update catalogue availability, selectors, entitlements and pricing |
| T-0 | 12. Publish; record the compliance verdict with validator version and report reference |
| T+anytime | 13. Mid-year circular/erratum → new source record, re-diff, re-gate |

## Commands

```bash
# 1. read-only export of live curriculum + question coverage
bun run scripts/compliance/export-snapshot.ts

# 2. deterministic gate evaluation (exits non-zero when not compliant)
bun run scripts/compliance/validate.ts

# 3. regenerate the coverage audit document
bun run scripts/compliance/report.ts

# 4. framework unit tests
bunx vitest run src/lib/__tests__/compliance-framework.test.ts
```

## Rules that never bend

- The previous session is superseded, never edited or deleted.
- Learner evidence and past reports are immutable.
- No question rolls forward without an explicit rollover classification.
- Sale of a subject-year is gated on a recorded compliant verdict for that session.
- Every verdict cites the validator version and the snapshot it was computed from.

## Adding a new class or subject

Same pass, plus: create the catalogue rows (board → academic year → class → subject) inactive, keep `commercial_status` non-purchasable, run the gate, and only then activate. Public selectors must never show a class or subject whose current session is not compliant.
