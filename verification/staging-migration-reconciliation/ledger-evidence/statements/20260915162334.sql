CREATE OR REPLACE FUNCTION public.auto_verifications_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' AND current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Automated verification records are append-only';
END;
$function$;