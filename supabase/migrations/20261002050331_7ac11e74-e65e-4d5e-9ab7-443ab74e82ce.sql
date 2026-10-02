CREATE OR REPLACE FUNCTION private.is_platform_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(trim(u.email)) = 'rmanish2000@gmail.com'
      AND u.email_confirmed_at IS NOT NULL
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_platform_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_platform_owner() TO authenticated, service_role;
