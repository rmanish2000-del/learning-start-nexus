# EduOS staging reconciliation — pre-change gate (STOPPED)

Canonical: rmanish2000-del/learning-start-nexus main @ 5bf25fb554067560ec3b7dd5aa09380f90f82888 (verified via GitHub API)
Staging: saved version d36eaef, assets index-oE0w6V3R.js / styles-CEoXcQt9.css (unchanged)

## Code drift (src/, excl. generated route tree)
```
Files main/src/components/app-shell.tsx and staging/src/components/app-shell.tsx differ
Files main/src/components/landing/marketing-page.tsx and staging/src/components/landing/marketing-page.tsx differ
Only in main/src/components: learner-status.tsx
Files main/src/components/mpbse-papers.tsx and staging/src/components/mpbse-papers.tsx differ
Files main/src/components/public-layout.tsx and staging/src/components/public-layout.tsx differ
Files main/src/components/share-row.tsx and staging/src/components/share-row.tsx differ
Files main/src/integrations/supabase/types.ts and staging/src/integrations/supabase/types.ts differ
Only in main/src/lib/__tests__: ai-governance.test.ts
Files main/src/lib/__tests__/english-only.test.ts and staging/src/lib/__tests__/english-only.test.ts differ
Only in main/src/lib/__tests__: env-secret-guard.test.ts
Only in main/src/lib/__tests__: no-platform-branding.test.ts
Files main/src/lib/__tests__/payment-credential-access.test.ts and staging/src/lib/__tests__/payment-credential-access.test.ts differ
Files main/src/lib/__tests__/pilot-invitations.test.ts and staging/src/lib/__tests__/pilot-invitations.test.ts differ
Files main/src/lib/__tests__/platform-owner-capability.test.ts and staging/src/lib/__tests__/platform-owner-capability.test.ts differ
Only in main/src/lib/__tests__: release-fingerprint.test.ts
Only in main/src/lib/__tests__: release-pool.test.ts
Only in main/src/lib/__tests__: return-path-route.test.ts
Files main/src/lib/__tests__/return-path.test.ts and staging/src/lib/__tests__/return-path.test.ts differ
Files main/src/lib/__tests__/sample-workspace.test.ts and staging/src/lib/__tests__/sample-workspace.test.ts differ
Only in staging/src/lib/__tests__: seo-staging-guards.test.ts
Only in staging/src/lib/__tests__: staging-scenario-matrix.test.ts
Only in main/src/lib/__tests__: unconfirmed-owner.test.ts
Files main/src/lib/__tests__/vendor-branding.test.ts and staging/src/lib/__tests__/vendor-branding.test.ts differ
Files main/src/lib/centre-setup.server.ts and staging/src/lib/centre-setup.server.ts differ
Files main/src/lib/diagnostic.server.ts and staging/src/lib/diagnostic.server.ts differ
Files main/src/lib/educator-board.server.ts and staging/src/lib/educator-board.server.ts differ
Only in main/src/lib: email-templates
Files main/src/lib/feedback.functions.ts and staging/src/lib/feedback.functions.ts differ
Files main/src/lib/free-check.server.ts and staging/src/lib/free-check.server.ts differ
Files main/src/lib/help-center.ts and staging/src/lib/help-center.ts differ
Files main/src/lib/landing-content.ts and staging/src/lib/landing-content.ts differ
Only in main/src/lib: nav-visibility.ts
Files main/src/lib/onboarding.ts and staging/src/lib/onboarding.ts differ
Files main/src/lib/outcome-dashboard.server.ts and staging/src/lib/outcome-dashboard.server.ts differ
Files main/src/lib/payment-settings.functions.ts and staging/src/lib/payment-settings.functions.ts differ
Files main/src/lib/platform-owner-shared.ts and staging/src/lib/platform-owner-shared.ts differ
Files main/src/lib/platform-owner.server.ts and staging/src/lib/platform-owner.server.ts differ
Files main/src/lib/pyq.server.ts and staging/src/lib/pyq.server.ts differ
Only in main/src/lib: release-pool.ts
Files main/src/lib/return-path.ts and staging/src/lib/return-path.ts differ
Files main/src/lib/seo.ts and staging/src/lib/seo.ts differ
Only in main/src/lib: workspace-context.ts
Files main/src/routes/__root.tsx and staging/src/routes/__root.tsx differ
Files main/src/routes/_authenticated/admin.tsx and staging/src/routes/_authenticated/admin.tsx differ
Files main/src/routes/_authenticated/auto-verification.tsx and staging/src/routes/_authenticated/auto-verification.tsx differ
Files main/src/routes/_authenticated/dashboard.tsx and staging/src/routes/_authenticated/dashboard.tsx differ
Files main/src/routes/_authenticated/feedback-review.tsx and staging/src/routes/_authenticated/feedback-review.tsx differ
Files 'main/src/routes/_authenticated/learners.$learnerId.tsx' and 'staging/src/routes/_authenticated/learners.$learnerId.tsx' differ
Files main/src/routes/_authenticated/learners.tsx and staging/src/routes/_authenticated/learners.tsx differ
Files main/src/routes/_authenticated/payment-settings.tsx and staging/src/routes/_authenticated/payment-settings.tsx differ
Files main/src/routes/_authenticated/quick-start.tsx and staging/src/routes/_authenticated/quick-start.tsx differ
Files main/src/routes/_authenticated/route.tsx and staging/src/routes/_authenticated/route.tsx differ
Files main/src/routes/_authenticated/settings.tsx and staging/src/routes/_authenticated/settings.tsx differ
Files main/src/routes/about.tsx and staging/src/routes/about.tsx differ
Only in main/src/routes/api/public: version.ts
Files main/src/routes/auth.tsx and staging/src/routes/auth.tsx differ
Files main/src/routes/cbse-class-10-learning-gap-diagnostic.tsx and staging/src/routes/cbse-class-10-learning-gap-diagnostic.tsx differ
Files main/src/routes/cbse-paper-practice.tsx and staging/src/routes/cbse-paper-practice.tsx differ
Files main/src/routes/class-10-maths-diagnostic.tsx and staging/src/routes/class-10-maths-diagnostic.tsx differ
Files main/src/routes/class-10-science-diagnostic.tsx and staging/src/routes/class-10-science-diagnostic.tsx differ
Files main/src/routes/contact.tsx and staging/src/routes/contact.tsx differ
Files main/src/routes/diagnostic.index.tsx and staging/src/routes/diagnostic.index.tsx differ
Files main/src/routes/free-learning-check.tsx and staging/src/routes/free-learning-check.tsx differ
Files main/src/routes/index.tsx and staging/src/routes/index.tsx differ
Only in main/src/routes: lovable
Files main/src/routes/parent-guide-learning-gaps.tsx and staging/src/routes/parent-guide-learning-gaps.tsx differ
Files main/src/routes/privacy.tsx and staging/src/routes/privacy.tsx differ
Files main/src/routes/reassessment-and-evidence.tsx and staging/src/routes/reassessment-and-evidence.tsx differ
Only in staging/src/routes: 'robots[.]txt.ts'
Files main/src/routes/terms.tsx and staging/src/routes/terms.tsx differ
Files main/src/start.ts and staging/src/start.ts differ
```

## Migration drift
Main-only:
- 20260905094512_e751e25d-41fd-4add-b571-375a54df7229.sql
- 20260905094600_656c92f5-dd24-4ea0-8391-21ad2912ec4c.sql
- 20260905094734_2e06710e-565b-44b8-a7e8-c9584ba9e369.sql
- 20260919175712_8a16e7d2-73e0-40d7-908e-d07bd538e2fa.sql
- 20260919175907_a6cec947-baea-4506-9661-db7cef48a32a.sql
- 20260919195620_b30e9647-5517-4603-9c1c-6d244ee2c4b3.sql
- 20260919195651_fdde1774-86cb-44f5-9172-ac6398190072.sql
- 20261002045357_ee7fe78e-650f-4721-b9ae-c6b05cac1889.sql
- 20261002045439_140cacf6-95b8-4924-b3a1-e3f9fedb548a.sql
- 20261002045629_be60915e-3ad8-4dbe-9bbb-314f7edca414.sql
- 20261002050000_centre_admin_first_login.sql
- 20261002050123_4b519290-29d6-4d7b-a837-c369974aa40e.sql
- 20261002050331_7ac11e74-e65e-4d5e-9ab7-443ab74e82ce.sql

Staging-only:
- 20260904172759_ab478d85-b845-4cfc-a217-86a721dc950a.sql
- 20260905045134_835adc31-c4d4-4244-b691-4e79b40d1481.sql
- 20260905084252_0db76c42-15bd-4f09-ba70-ed49c830dc4c.sql
- 20260905100552_b81b51d9-d908-4772-8dc9-8f31ecbba362.sql
- 20260905100631_02e41e98-a756-47ba-8a2e-59d736c358e8.sql
- 20260905100711_04ffe976-54a0-43eb-bf35-15909973a015.sql
- 20261002052435_b60cb0a3-e7ae-46df-a541-37556d8089f1.sql
- 20261002052550_298225aa-0a38-4d50-95a1-067c08145078.sql

Same name, different content:
- 20260915161655_88fec6b0-f152-48f5-a53c-bdaf5742fd49.sql

Byte-identical pairs under different names (main -> staging):
- 20260905094512_e751e25d-41fd-4add-b571-375a54df7229.sql == 20260905100552_b81b51d9-d908-4772-8dc9-8f31ecbba362.sql
- 20260905094600_656c92f5-dd24-4ea0-8391-21ad2912ec4c.sql == 20260905100631_02e41e98-a756-47ba-8a2e-59d736c358e8.sql
- 20260905094734_2e06710e-565b-44b8-a7e8-c9584ba9e369.sql == 20260905100711_04ffe976-54a0-43eb-bf35-15909973a015.sql
