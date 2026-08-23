DROP VIEW IF EXISTS public.rls_policy_audit;

CREATE VIEW public.rls_policy_audit
WITH (security_invoker = true) AS
SELECT
  tablename,
  policyname,
  cmd,
  roles::text AS roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'assessments',
    'assessment_sessions',
    'assessment_items',
    'learner_assessments',
    'learner_evidence'
  )
ORDER BY tablename, policyname;

GRANT SELECT ON public.rls_policy_audit TO authenticated;
GRANT SELECT ON public.rls_policy_audit TO service_role;