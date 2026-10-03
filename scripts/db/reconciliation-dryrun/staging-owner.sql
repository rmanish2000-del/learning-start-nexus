-- Staging's hardened PR #5 owner check (20261002052550 excerpt) so the
-- staging-shaped database carries the same is_platform_owner() and policies.
CREATE OR REPLACE FUNCTION private.is_platform_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
    AND lower(coalesce(u.email, '')) = 'rmanish2000@gmail.com' AND u.email_confirmed_at IS NOT NULL);
$$;
REVOKE EXECUTE ON FUNCTION private.is_platform_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_platform_owner() TO authenticated, service_role;
CREATE POLICY "Platform owner reads pilot applications" ON public.pilot_leads FOR SELECT TO authenticated USING (private.is_platform_owner());
CREATE POLICY "Platform owner updates pilot applications" ON public.pilot_leads FOR UPDATE TO authenticated USING (private.is_platform_owner()) WITH CHECK (private.is_platform_owner());
