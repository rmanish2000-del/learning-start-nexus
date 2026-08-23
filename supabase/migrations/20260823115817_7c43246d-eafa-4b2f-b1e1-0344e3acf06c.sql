CREATE SCHEMA IF NOT EXISTS private;
COMMENT ON SCHEMA private IS 'Internal database helpers; not exposed through the Data API.';
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Authenticated users can view the organization" ON public.organizations;
CREATE POLICY "Members can view their own organization"
  ON public.organizations
  FOR SELECT TO authenticated
  USING (id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()));