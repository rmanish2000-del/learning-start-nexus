
REVOKE ALL ON FUNCTION public.has_active_pilot_access(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pilot_grant_events_append_only() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_pilot_access(uuid, text) TO service_role;
