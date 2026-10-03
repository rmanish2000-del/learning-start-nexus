CREATE OR REPLACE FUNCTION public.tutor_evidence_by_gap()
 RETURNS TABLE(gap_id uuid, learner_id uuid, sessions integer, interactions integer, substantive_interactions integer, tutor_minutes integer, first_at timestamp with time zone, last_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM private.tutor_evidence_by_gap();
$function$;

REVOKE ALL ON FUNCTION public.tutor_evidence_by_gap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tutor_evidence_by_gap() TO authenticated, service_role;