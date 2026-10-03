# Object definition check (staging, read-only catalog queries, 2026-10-03)

| Object | Result |
|---|---|
| public.question_commercial_release | ABSENT (no pg_class entry in any schema) |
| public.production_release_pool | ABSENT (no pg_class entry in any schema) |
| public.founder_access_denials | ABSENT (no pg_class entry in any schema) |
| private.is_platform_owner() | PRESENT — SECURITY DEFINER, STABLE, search_path=public; EXECUTE: postgres, authenticated, service_role (no PUBLIC/anon) |
| sample_workspace_events | PRESENT, RLS on |
| centre_setup_progress | PRESENT, RLS on |
| is_sample columns | PRESENT on learners, assessments, assessment_sessions |

## is_platform_owner() definition (as stored)
```sql
CREATE OR REPLACE FUNCTION private.is_platform_owner()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.email, '')) = '<founder email — redacted>'
      AND u.email_confirmed_at IS NOT NULL);
$function$
```
Matches staging migration 20261002052550 (confirmed-email owner check).

## PR #5 policies present
- pilot_leads | "Platform owner reads pilot applications" | SELECT | authenticated | USING private.is_platform_owner()
- pilot_leads | "Platform owner updates pilot applications" | UPDATE | authenticated | USING/CHECK private.is_platform_owner()
- pilot_leads | "Anyone may submit a pilot application" | INSERT | anon, authenticated | CHECK length limits and status='new'
- sample_workspace_events | sample_workspace_events_org_admin_select | SELECT | authenticated | org match AND has_role admin
- centre_setup_progress | centre_setup_progress_org_staff_select | SELECT | authenticated | org match AND is_staff
- Old "Admins can read/update pilot applications" policies: absent.

## security_invoker (public views)
- automated_provisional_question_outcomes: security_invoker=true
- internal_automated_provisional_pool: security_invoker=true
- rls_policy_audit: security_invoker=on
- The three absent objects above have no setting to check.
