CREATE OR REPLACE VIEW public.rls_policy_audit
WITH (security_invoker = on) AS
SELECT tablename, policyname, cmd, (roles)::text AS roles,
       qual AS using_expression, with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = ANY (ARRAY[
    'assessments', 'assessment_sessions', 'assessment_items',
    'learner_assessments', 'learner_evidence',
    'learning_gaps', 'recommendations', 'interventions',
    'tutor_sessions', 'tutor_interactions'
  ])
ORDER BY tablename, policyname;