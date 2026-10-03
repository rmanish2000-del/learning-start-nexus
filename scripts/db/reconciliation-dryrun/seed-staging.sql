-- Synthetic staging-shaped data (counts from schema-state.txt): 10 feedback
-- rows, 1 remediation snapshot, 325 remediation actions, plus one quarantined
-- question so the exclusions insert has a row to act on.
INSERT INTO public.organizations (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Staging Org') ON CONFLICT DO NOTHING;
INSERT INTO public.feedback_submissions (category, message, route, device_class, client_hash, dedupe_hash)
SELECT 'bug', 'feedback ' || g, '/route/' || g, 'mobile', 'client' || g, 'dedupe' || g FROM generate_series(1, 10) g;
INSERT INTO public.remediation_snapshots (org_id, label, scope, checksum, location, payload)
VALUES ('11111111-1111-1111-1111-111111111111', 'pre-remediation', 'class10', 'abc', 'audit-data/x', '{"k": 1}');
INSERT INTO public.remediation_actions (org_id, run_id, action_type, reason, prior_value, new_value, evidence)
SELECT '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'quarantine', 'reason ' || g, jsonb_build_object('v', g), jsonb_build_object('v', g + 1), '{}'::jsonb
FROM generate_series(1, 325) g;
INSERT INTO public.question_bank (id, org_id, external_ref, subject) VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'C10-2627-MATH-REQ001-DIAG-001', 'Mathematics'),
  ('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', 'C10-2627-MATH-REQ001-DIAG-005', 'Mathematics');
INSERT INTO public.question_auto_verifications (org_id, question_id, outcome)
VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'quarantined');
INSERT INTO public.pilot_leads (email, contact_name) VALUES ('lead@example.test', 'Lead');
