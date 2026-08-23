CREATE OR REPLACE VIEW public.rls_policy_audit AS
  SELECT tablename,
         policyname,
         cmd,
         roles::text AS roles,
         qual AS using_expression,
         with_check AS with_check_expression
  FROM pg_policies
  WHERE schemaname = 'public'::name
  ORDER BY tablename, policyname;