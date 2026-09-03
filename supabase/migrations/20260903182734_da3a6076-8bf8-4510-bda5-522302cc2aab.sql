REVOKE ALL ON FUNCTION public.auto_verifications_immutable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_verifications_immutable() FROM anon;
REVOKE ALL ON FUNCTION public.auto_verifications_immutable() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.auto_verifications_immutable() TO service_role;