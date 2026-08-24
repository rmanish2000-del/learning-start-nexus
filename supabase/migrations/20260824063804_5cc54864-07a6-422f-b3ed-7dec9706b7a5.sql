-- Fix linter 0010: rls_policy_audit must not run as security definer.
-- The view only reads pg_policies metadata (world-readable system catalog),
-- so security_invoker keeps it working for every authenticated auditor.
ALTER VIEW public.rls_policy_audit SET (security_invoker = on);