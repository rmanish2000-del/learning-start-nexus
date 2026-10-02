
DROP POLICY IF EXISTS "Founder reads pilot applications" ON public.pilot_leads;
DROP POLICY IF EXISTS "Founder updates pilot applications" ON public.pilot_leads;
DROP POLICY IF EXISTS "Founder reads denials" ON public.founder_access_denials;
DROP FUNCTION IF EXISTS public.create_sample_workspace(uuid, uuid);
DROP FUNCTION IF EXISTS public.remove_sample_workspace(uuid, uuid);
DROP TABLE IF EXISTS public.sample_records;
DROP TABLE IF EXISTS public.sample_workspaces;
DROP TABLE IF EXISTS public.sample_workspace_events;
DROP TABLE IF EXISTS public.centre_onboarding;
DROP FUNCTION IF EXISTS private.is_founder();
