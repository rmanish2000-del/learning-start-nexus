-- Phone privacy: column-level access control on public.profiles.
-- Org members may still read colleagues' name/org, but never their phone.
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (id, org_id, full_name, created_at, updated_at)
  ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

-- Explicit, organisation-scoped read path for the few legitimate cases:
-- the user themselves, or an admin of the same organisation.
CREATE OR REPLACE FUNCTION public.profile_phone(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.phone
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (
      auth.uid() = _user_id
      OR (
        private.has_role(auth.uid(), 'admin'::app_role)
        AND p.org_id IS NOT NULL
        AND p.org_id = private.current_org_id()
      )
    )
$$;

REVOKE ALL ON FUNCTION public.profile_phone(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_phone(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.profile_phone(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_phone(uuid) TO service_role;