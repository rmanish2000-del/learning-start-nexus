# Migration disposition matrix — every migration on branch `reconcile/staging-migrations` vs the verified staging ledger

Generated 2026-10-03 by `scripts/db/..` review (ASG-2026-10-03-006 line-by-line review). Disposition answers: *what happens if the Lovable platform replays this main file against the current staging database?* Staging facts come only from `ledger-evidence/` (ledger.json 35 rows, 31 byte-verified statements, table-check.csv, object-check.md) and `handoff/schema-state.txt`.

Legend: SAFE_NOOP = nothing to do; SAFE_CREATE = creates only objects verified absent (single run); SAFE_RERUN = idempotent, converges; UNSAFE_RERUN = plain replay fails or duplicates (object verified present on staging); UNKNOWN = unguarded DDL whose target has no staging evidence either way.

Main-only files (not in the ledger): 89. Summary: SAFE_CREATE 2, SAFE_NOOP 3, SAFE_RERUN 35, UNKNOWN 22, UNSAFE_RERUN 27

| Version | File | Stmts | In ledger | Disposition | Basis |
|---|---|---:|---|---|---|
| 20260823082320 | `20260823082320_4a4d5457-2b43-4a49-8b6d-60fea37de5ce.sql` | 84 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE organizations; CREATE TABLE profiles; CREATE TABLE user_roles … |
| 20260823082355 | `20260823082355_d05790f8-6f51-4110-87e7-ae21dcb51add.sql` | 3 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260823114056 | `20260823114056_2a969852-e546-4ca1-945d-481bc7596179.sql` | 1 | no | **SAFE_RERUN** | data UPDATE only; re-execution converges on the same values |
| 20260823115817 | `20260823115817_7c43246d-eafa-4b2f-b1e1-0344e3acf06c.sql` | 8 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "Members can view their own organization" |
| 20260823124545 | `20260823124545_fb70293f-3f7d-4f8a-883e-1ba6cd97b467.sql` | 66 | no | **UNSAFE_RERUN** | unguarded INSERT would duplicate rows or violate unique keys |
| 20260823142222 | `20260823142222_9baf2e66-9d89-472f-b7f6-702c4022b1ad.sql` | 50 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "assessments_select"; CREATE POLICY "assessments_insert"; CREATE POLICY "assessments_update" … |
| 20260823150115 | `20260823150115_3b5ec08d-3fd9-451e-96da-e922137080f2.sql` | 54 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE assessments; CREATE TABLE assessment_sessions |
| 20260823160423 | `20260823160423_d01f7d0f-b919-4f60-9f75-f06050175994.sql` | 2 | no | **UNSAFE_RERUN** | unguarded INSERT would duplicate rows or violate unique keys |
| 20260823161055 | `20260823161055_f7d6e926-1db7-4fc4-8401-3f8014d9a5c7.sql` | 3 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260823161119 | `20260823161119_8fee146f-efb5-43aa-9f3c-8118c42bf6c9.sql` | 4 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE VIEW public.rls_policy_audit |
| 20260823163207 | `20260823163207_50d42c10-e2e4-457f-a257-855bfc0e4745.sql` | 37 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE learning_gaps |
| 20260823171649 | `20260823171649_d3b993c2-2f40-439a-a14b-297459713592.sql` | 20 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE tutor_sessions |
| 20260823171721 | `20260823171721_9c038b27-7e97-4d8c-9a01-afcae21bb3ad.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260823180225 | `20260823180225_b5ce149b-a86f-4f9a-8819-948dfe75306e.sql` | 41 | no | **UNSAFE_RERUN** | unguarded INSERT would duplicate rows or violate unique keys |
| 20260823180254 | `20260823180254_4a215814-4ab5-4457-afc1-ffa4d8057684.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260823183347 | `20260823183347_5026efea-4562-472a-a772-37f43a5fa5f6.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260823183424 | `20260823183424_8471a245-fe77-4d76-8e4d-3fd81d036c84.sql` | 13 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE guardian_consents |
| 20260823185803 | `20260823185803_b9b09762-6ee9-460e-b224-79159ae787a4.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260823185830 | `20260823185830_cd05bbad-4d38-44ab-a690-c814b7c20d83.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260823192506 | `20260823192506_a2599a51-f354-4541-89d8-3579a10b68a3.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260823192739 | `20260823192739_af7e8d4a-6e40-47da-936d-bc211f81eecf.sql` | 24 | no | **UNSAFE_RERUN** | unguarded INSERT would duplicate rows or violate unique keys |
| 20260823194245 | `20260823194245_32903f84-4bf3-4486-9824-3729e268152d.sql` | 1 | no | **SAFE_RERUN** | data UPDATE only; re-execution converges on the same values |
| 20260824033716 | `20260824033716_e9dbd6f8-8d98-4879-b25f-044df3c50e30.sql` | 36 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE books |
| 20260824053556 | `20260824053556_ec5ea776-fc88-4b35-9ef6-7683aaeca2ca.sql` | 43 | no | **UNSAFE_RERUN** | unguarded INSERT would duplicate rows or violate unique keys |
| 20260824063731 | `20260824063731_e4d18993-9725-4a70-92a3-703c2bcb3746.sql` | 40 | no | **UNSAFE_RERUN** | unguarded INSERT would duplicate rows or violate unique keys |
| 20260824063804 | `20260824063804_5cc54864-07a6-422f-b3ed-7dec9706b7a5.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260824093846 | `20260824093846_29edd349-e361-4bb1-996d-b9270322f9dc.sql` | 12 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE question_bank |
| 20260824100542 | `20260824100542_9a813fd5-95f9-45ba-9d49-60bf4f405e0a.sql` | 11 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE assessment_question_map |
| 20260824105435 | `20260824105435_b2ea79ba-4638-487c-8ec1-6c19240cb602.sql` | 2 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded) |
| 20260824112131 | `20260824112131_bafdd507-d89e-421d-85be-e8d441fd94f4.sql` | 6 | no | **UNSAFE_RERUN** | unguarded INSERT would duplicate rows or violate unique keys |
| 20260824114642 | `20260824114642_1c30c1e7-38a0-4db5-8480-08fb3da91554.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260824121534 | `20260824121534_8612fb3a-2f75-491e-af7c-d75e5d64f0fc.sql` | 1 | no | **SAFE_RERUN** | data UPDATE only; re-execution converges on the same values |
| 20260826012348 | `20260826012348_02eff607-3369-4050-bd5f-43e7bdfa659c.sql` | 3 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded) |
| 20260826030520 | `20260826030520_a5c0cb10-42c1-4305-88bf-b03464846e51.sql` | 24 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded); ADD CONSTRAINT (unguarded); CREATE POLICY "question_verifications_select" … |
| 20260826030554 | `20260826030554_f4d2db16-4f85-460b-95cf-0831671540dd.sql` | 3 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260826041045 | `20260826041045_679c1ff8-c629-4dc6-b4e0-ce63e9f012c8.sql` | 2 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "mastery_parent_select" |
| 20260826105210 | `20260826105210_47db038e-4237-4b8c-a451-1d877f1f6745.sql` | 8 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE pilot_leads |
| 20260826113615 | `20260826113615_115f4f16-1e6b-43a5-b66c-b83ef1ad90b0.sql` | 13 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded) |
| 20260826113901 | `20260826113901_e87ec6a7-6f31-4765-98af-dcf309ace941.sql` | 3 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260826124258 | `20260826124258_4ade9a35-b841-4e5a-a832-89b0bf2acc72.sql` | 4 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded) |
| 20260826131142 | `20260826131142_37b39f84-d89a-474c-80cb-0c722ac764a7.sql` | 14 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE parent_orders; CREATE TABLE parent_entitlements |
| 20260826143724 | `20260826143724_13f0dac2-597d-4523-bb1a-31a6acd57bc7.sql` | 2 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260826151056 | `20260826151056_398d9e9c-c99f-47f8-81d7-720e0567f29a.sql` | 7 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE TABLE payment_webhook_events; CREATE INDEX payment_webhook_events_event_id_idx; CREATE INDEX payment_webhook_events_created_at_idx … |
| 20260826154231 | `20260826154231_ab268d26-cc2a-46b3-88ac-29b41ec3b6d8.sql` | 14 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "parent_orders_owner_select"; CREATE POLICY "parent_entitlements_owner_select" |
| 20260826170234 | `20260826170234_151339d0-4a7f-4851-ae5e-7128a1b3456b.sql` | 2 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "Admins can update their own organization" |
| 20260826174623 | `20260826174623_54300a89-b8cc-482b-807d-db3a7eed99a9.sql` | 5 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE payment_credentials |
| 20260826175554 | `20260826175554_0cbe8b82-56cb-4300-a16e-4bd8c4e12a79.sql` | 6 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE payment_credential_audit |
| 20260826175639 | `20260826175639_254be8d5-dfaa-4069-b5d0-121b63f8940b.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260826183935 | `20260826183935_438dce25-cad3-4651-9437-30ce16e02019.sql` | 2 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260827114814 | `20260827114814_79b9c648-715a-4c98-852a-5487e28a8630.sql` | 9 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded) |
| 20260827123708 | `20260827123708_7dfaf251-95a1-472d-b92f-ed29a6009417.sql` | 8 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE TABLE free_learning_checks; CREATE INDEX free_learning_checks_learner_subject_key; CREATE POLICY "Parents read their own free checks" … |
| 20260827132104 | `20260827132104_dba758fb-5a62-4ab0-b3eb-dd13c2bcf5e7.sql` | 10 | no | **SAFE_RERUN** | data UPDATE only; re-execution converges on the same values |
| 20260827161053 | `20260827161053_aa5868ad-764d-46dd-bd33-3086380a3c3e.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260828055655 | `20260828055655_7a81d073-1c92-4c94-ae8d-38b7af93d2e5.sql` | 2 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260828112426 | `20260828112426_6065a0ef-7865-4d69-b21c-3506e7dbdc68.sql` | 106 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE catalogue_subjects; CREATE POLICY "Anyone can read purchasable subjects"; CREATE TABLE catalogue_subject_sources |
| 20260828114401 | `20260828114401_7aae993f-198d-47cb-8189-1c36041496b5.sql` | 8 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "None" |
| 20260829051045 | `20260829051045_eede3494-ef19-45aa-8241-7e2616d95495.sql` | 2 | no | **SAFE_RERUN** | data UPDATE only; re-execution converges on the same values |
| 20260829071409 | `20260829071409_12c5b5b8-5769-44e1-aea0-a2b9335e3b61.sql` | 1 | no | **SAFE_RERUN** | data UPDATE only; re-execution converges on the same values |
| 20260829072416 | `20260829072416_d7d009f1-ff7d-416d-81fe-91dcf219736c.sql` | 1 | no | **SAFE_RERUN** | data UPDATE only; re-execution converges on the same values |
| 20260830041651 | `20260830041651_578b5a66-2470-47f2-9aac-6769992ce7e7.sql` | 15 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "Admins insert streams"; CREATE POLICY "Admins update streams"; CREATE POLICY "Admins delete streams" … |
| 20260901024448 | `20260901024448_0c360bc9-fa2b-4599-adb6-85bb23a29782.sql` | 8 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260901030208 | `20260901030208_1b95ef6b-1af7-49d3-94cb-a34b8406d1c5.sql` | 8 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260901054836 | `20260901054836_adb3051b-d81b-4622-869e-e76eccd8b251.sql` | 2 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260901054919 | `20260901054919_1c06b52b-8186-40a5-a6b9-711daa6aca69.sql` | 4 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260901054948 | `20260901054948_3bf46e3b-c4a5-4e0b-b93f-26ffa1b33e6c.sql` | 4 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260901061703 | `20260901061703_8e3392f7-87ae-4b18-a135-0d1b23531b9b.sql` | 3 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260901065804 | `20260901065804_457ea6a4-5be9-44ab-ad6a-b67fc7fe5a60.sql` | 2 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded) |
| 20260902062319 | `20260902062319_9cc6e9fd-975f-4176-8ec4-ed42c1af1253.sql` | 1 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260902062406 | `20260902062406_afad274e-861a-45f3-bd27-80a726821e23.sql` | 2 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260902063620 | `20260902063620_bace03ac-4de0-4209-85b2-8e1d2858206c.sql` | 1 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260902065859 | `20260902065859_5215820a-c1e5-4212-9e1b-639b6c0a1d7a.sql` | 3 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded) |
| 20260903045542 | `20260903045542_c9575a2f-747a-40b2-9f0e-2c94e1f15e2c.sql` | 15 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260903134259 | `20260903134259_5d042b7b-b3e6-457a-8f8a-0c64ec70af0a.sql` | 14 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260903142636 | `20260903142636_c52a8157-ad18-4f80-8e7b-bfc823a84a28.sql` | 7 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded); ADD CONSTRAINT (unguarded) |
| 20260903145431 | `20260903145431_0ac4c46a-4e2d-40af-a4b1-263b188fd958.sql` | 1 | no | **SAFE_RERUN** | data UPDATE only; re-execution converges on the same values |
| 20260903173600 | `20260903173600_11981384-1946-4200-9479-0e05c22b9e9d.sql` | 26 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE pilot_grants; CREATE INDEX pilot_grants_parent_idx; CREATE INDEX pilot_grants_learner_idx … |
| 20260903173640 | `20260903173640_4a50b89b-c406-41ae-bfdd-6a27daf2b8a5.sql` | 3 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260903182657 | `20260903182657_1a9396aa-0ee2-490b-a242-04bc4ce656d8.sql` | 29 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE question_auto_verifications; CREATE INDEX question_auto_verifications_question_idx; CREATE INDEX question_auto_verifications_run_idx … |
| 20260903182734 | `20260903182734_da3a6076-8bf8-4510-bda5-522302cc2aab.sql` | 4 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260903194001 | `20260903194001_aa2804d0-4430-4c9e-9c8a-de32a44436eb.sql` | 2 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: ADD CONSTRAINT (unguarded) |
| 20260903194805 | `20260903194805_883225d2-19cf-49ee-8dd5-bcbdded8b928.sql` | 2 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "pyq_sessions_learner_insert"; CREATE POLICY "pyq_sessions_learner_update" |
| 20260904071901 | `20260904071901_58f06467-9149-4926-942e-2e9029200c89.sql` | 2 | no | **UNKNOWN** | unguarded DDL on objects without staging evidence: CREATE POLICY "tutor_sessions_update" |
| 20260904180930 | `20260904180930_26f268f7-50b0-4ac5-9f37-56623725422c.sql` | 11 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260904191218 | `20260904191218_8acf9525-ce6b-4731-90b0-fa8207ef1782.sql` | 4 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260904202505 | `20260904202505_2442a34e-ebf8-4b2e-a808-bf3f7c12db16.sql` | 9 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260905074149 | `20260905074149_22b39441-baac-4847-b0a9-7bef6ec582a4.sql` | 13 | no | **UNSAFE_RERUN** | would fail on staging: CREATE TABLE feedback_submissions; CREATE INDEX feedback_submissions_created_idx; CREATE INDEX feedback_submissions_client_idx … |
| 20260905085021 | `20260905085021_45f26e1a-375d-47ff-9056-9651c4bb4b9e.sql` | 4 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260905094512 | `20260905094512_e751e25d-41fd-4add-b571-375a54df7229.sql` | 9 | no | **UNSAFE_RERUN** | would fail on staging: CREATE POLICY "Same-org staff read subject sources"; CREATE POLICY "Same-org admins manage subject sources" |
| 20260905094600 | `20260905094600_656c92f5-dd24-4ea0-8391-21ad2912ec4c.sql` | 5 | no | **UNSAFE_RERUN** | would fail on staging: CREATE POLICY "Anyone can read purchasable subjects" |
| 20260905094734 | `20260905094734_2e06710e-565b-44b8-a7e8-c9584ba9e369.sql` | 1 | no | **SAFE_RERUN** | guarded/idempotent statements only |
| 20260905104854 | `20260905104854_4f12d2e0-1ac1-40d4-beda-f293c836c3c2.sql` | 2 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260906041146 | `20260906041146_efc79894-86bd-4baa-b223-ddd0f143b83e.sql` | 1 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260915161655 | `20260915161655_88fec6b0-f152-48f5-a53c-bdaf5742fd49.sql` | 1 | yes | **SAFE_NOOP** | main placeholder is `SELECT 1`; ledger holds staging's full 49-statement version, every statement normalised-identical to a statement in main 20260919175712 (strict subset). Replay of the main file does nothing. |
| 20260915162231 | `20260915162231_37b0517c-1e74-4531-9701-30ef9cc71bf0.sql` | 2 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260915162334 | `20260915162334_0f230677-ab23-4051-99b4-8cca0946f55e.sql` | 1 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260915163014 | `20260915163014_eba5e15a-7d7a-4336-ba98-5c455f879471.sql` | 7 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260915180432 | `20260915180432_d05adeed-877d-48e2-aec0-e402bf41ddf4.sql` | 29 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260915180855 | `20260915180855_9032af5e-6b47-4aee-807d-b3402cec35af.sql` | 20 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260915181935 | `20260915181935_083a6c6c-16d3-41bc-a6c2-6ddbc15ef721.sql` | 29 | yes | **N/A (in ledger)** | shared name; applied on staging |
| 20260919175712 | `20260919175712_8a16e7d2-73e0-40d7-908e-d07bd538e2fa.sql` | 142 | no | **UNSAFE_RERUN** | 14 unguarded CREATE TABLE; all 14 exist on staging (table-check.csv). 7 of them, their policies, indexes and triggers also exist via staging 20260915161655; plain replay fails at the first CREATE TABLE. Covered by PR #9 via IF NOT EXISTS / DO guards. |
| 20260919175907 | `20260919175907_a6cec947-baea-4506-9661-db7cef48a32a.sql` | 3 | no | **SAFE_RERUN** | three INSERT … ON CONFLICT DO NOTHING; dependencies question_bank, question_auto_verifications, question_pool_exclusions, remediation_work_items all evidenced on staging. Included verbatim in PR #9; dry-run proves rows inserted once. |
| 20260919195620 | `20260919195620_b30e9647-5517-4603-9c1c-6d244ee2c4b3.sql` | 11 | no | **SAFE_CREATE** | question_commercial_release, its policy/trigger/indexes and view production_release_pool verified ABSENT on staging (object-check.md); first run creates, a second plain run would fail. PR #9 carries it guarded. |
| 20260919195651 | `20260919195651_fdde1774-86cb-44f5-9172-ac6398190072.sql` | 1 | no | **SAFE_RERUN** | ALTER VIEW … SET (security_invoker = on) is idempotent; requires the view from 20260919195620. PR #9 applies it only if the view exists. |
| 20261002045357 | `20261002045357_ee7fe78e-650f-4721-b9ae-c6b05cac1889.sql` | 1 | no | **SAFE_NOOP** | SELECT 1 placeholder |
| 20261002045439 | `20261002045439_140cacf6-95b8-4924-b3a1-e3f9fedb548a.sql` | 1 | no | **SAFE_NOOP** | SELECT 1 placeholder |
| 20261002045629 | `20261002045629_be60915e-3ad8-4dbe-9bbb-314f7edca414.sql` | 5 | no | **SAFE_CREATE** | all guarded (ADD COLUMN IF NOT EXISTS ×2, CREATE TABLE IF NOT EXISTS); founder_access_denials verified absent. Also SAFE_RERUN. |
| 20261002050000 | `20261002050000_centre_admin_first_login.sql` | 39 | no | **UNSAFE_RERUN** | unguarded CREATE POLICY "Platform owner reads/updates pilot applications" — both exist on staging (object-check.md) → plain replay fails; it would also transiently reinstall the JWT-email owner check. Staging 20261002052550 is a superset of this file (diff: hardened owner check + DROP POLICY IF EXISTS before create). Deliberately NOT in PR #9; its policies are DO-guarded there. |
| 20261002050123 | `20261002050123_4b519290-29d6-4d7b-a837-c369974aa40e.sql` | 1 | no | **SAFE_NOOP** | SELECT 1 placeholder |
| 20261002050331 | `20261002050331_7ac11e74-e65e-4d5e-9ab7-443ab74e82ce.sql` | 3 | no | **SAFE_RERUN** | CREATE OR REPLACE FUNCTION private.is_platform_owner() + grants; same confirmed-email semantics as staging (trim vs coalesce). Included in PR #9. |
| 20261003120000 | `20261003120000_staging_reconciliation_forward_only.sql` | 167 | no | **SAFE_RERUN** | PR #9 migration: every statement guarded; proven idempotent on bare/main/staging shapes (dryrun-results.json) |
