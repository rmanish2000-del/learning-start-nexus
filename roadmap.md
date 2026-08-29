# EduOS roadmap — Class 10 (2026-27) clean rebuild

Founder clarification (2026-08-29): all curriculum, outcome, atom, mapping and
question data is internal and replaceable. Prefer a clean rebuild from the
verified 2026-27 baseline over making weak legacy data compliant. Keep only the
safety gates for schema integrity, auth, payments/entitlements, security,
rollback and official curriculum correctness.

## Open

- [ ] Pre-rebuild snapshot of Class 10 Mathematics + Science academic data, with SHA-256 manifest, stored for rollback only.
- [ ] Replacement-boundary classification per table (SAFE_TO_REPLACE / REFERENCE_REQUIRES_REPOINTING / PLATFORM / PAYMENT / AUTH).
- [ ] Confirm the verified structure already satisfies the official shape (Maths 7 units / 14 chapters, Science 5 units / 13 chapters, 84 requirements) — rebuild only what deviates.
- [ ] Retire pilot-only units from active 2026-27 selectors (reversible, no hard delete).
- [ ] Revalidate the question specification against the clean structure; report original vs final count.
- [ ] Generate the original question bank (diagnostic + fresh-reassessment pools), answers computed in code.
- [ ] Automated validation: mapping, answers, numeric recomputation, duplicates/near-duplicates, exclusion leakage, originality, markup contamination.
- [ ] Review queues (Mathematics / Science), reviewer fields null, status REVIEW_PENDING.
- [ ] Science book: machine gates -> READY_FOR_EXPERT_REVIEW, never human-approved without a named reviewer.
- [ ] Full suite + typecheck + build + secret scan; one authoritative test total.
- [ ] Deliverables: EDUOS_CLASS_10_CLEAN_REBUILD_REPORT.md, EDUOS_CLASS_10_FINAL_CURRICULUM_MAP.json, EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json, EDUOS_CLASS_10_VALIDATION_RESULTS.json, EDUOS_CLASS_10_REVIEW_QUEUE.json.

## Standing constraints

- Class 9 on HOLD; Class 12 not started.
- No question becomes diagnostic- or reassessment-eligible without named expert approval.
- Do not touch auth, roles, payments, orders, payment events, secrets.
- Frustum, Euclid's division lemma and formative-only topics must never enter active 2026-27 diagnostics.
