-- 1. Move the tutor evidence aggregate out of the exposed API schema.
CREATE OR REPLACE FUNCTION private.tutor_evidence_by_gap()
RETURNS TABLE(gap_id uuid, learner_id uuid, sessions integer, interactions integer, substantive_interactions integer, tutor_minutes integer, first_at timestamp with time zone, last_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH allowed AS (
    SELECT private.current_org_id() AS org_id,
           (private.is_staff() OR private.is_reviewer()) AS ok
  ),
  s AS (
    SELECT ts.id, ts.gap_id, ts.learner_id
    FROM public.tutor_sessions ts, allowed a
    WHERE a.ok AND ts.org_id = a.org_id AND ts.gap_id IS NOT NULL
  ),
  i AS (
    SELECT ti.session_id,
           ti.created_at,
           ti.kind,
           ti.practice_correct,
           length(ti.response_text) AS len,
           LAG(ti.created_at) OVER (PARTITION BY ti.session_id ORDER BY ti.created_at) AS prev_at
    FROM public.tutor_interactions ti
    JOIN s ON s.id = ti.session_id
  ),
  scored AS (
    SELECT i.session_id,
           i.created_at,
           CASE
             WHEN i.prev_at IS NULL THEN 60
             ELSE LEAST(EXTRACT(EPOCH FROM (i.created_at - i.prev_at))::int, 300)
           END AS seconds,
           CASE
             WHEN i.practice_correct IS NOT NULL THEN 1
             WHEN i.kind <> 'hint' AND i.len >= 200 THEN 1
             ELSE 0
           END AS substantive
    FROM i
  )
  SELECT s.gap_id,
         s.learner_id,
         COUNT(DISTINCT s.id)::int,
         COUNT(scored.session_id)::int,
         COALESCE(SUM(scored.substantive), 0)::int,
         CEIL(COALESCE(SUM(scored.seconds), 0) / 60.0)::int,
         MIN(scored.created_at),
         MAX(scored.created_at)
  FROM s
  LEFT JOIN scored ON scored.session_id = s.id
  GROUP BY s.gap_id, s.learner_id;
$function$;

REVOKE ALL ON FUNCTION private.tutor_evidence_by_gap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.tutor_evidence_by_gap() TO authenticated, service_role;

-- Public entry point now runs with the caller's own rights.
CREATE OR REPLACE FUNCTION public.tutor_evidence_by_gap()
RETURNS TABLE(gap_id uuid, learner_id uuid, sessions integer, interactions integer, substantive_interactions integer, tutor_minutes integer, first_at timestamp with time zone, last_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT * FROM private.tutor_evidence_by_gap();
$function$;

REVOKE ALL ON FUNCTION public.tutor_evidence_by_gap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tutor_evidence_by_gap() TO authenticated, service_role;

-- 2. Explicit per-command admin write policies on catalogue_streams.
DROP POLICY IF EXISTS "Admins manage streams" ON public.catalogue_streams;
CREATE POLICY "Admins insert streams" ON public.catalogue_streams FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update streams" ON public.catalogue_streams FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete streams" ON public.catalogue_streams FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read all streams" ON public.catalogue_streams FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 3. Hide staff attribution / internal workflow columns from anonymous readers.
REVOKE SELECT ON public.catalogue_subjects FROM anon;
GRANT SELECT (id, board_id, academic_year_id, class_id, stream_id, code, subject_key,
  display_name, version, supersedes_id, is_active, commercial_status, diagnostic_eligible,
  reassessment_ready, min_questions_per_outcome, diagnostic_target, diagnostic_minimum,
  chapter_group_marks, archived_at, created_at, updated_at)
  ON public.catalogue_subjects TO anon;

-- 4. Re-check the educator role on learner updates by the assigned educator.
DROP POLICY IF EXISTS "Staff update learners in their org" ON public.learners;
CREATE POLICY "Staff update learners in their org" ON public.learners FOR UPDATE TO authenticated
  USING (
    org_id = private.current_org_id()
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR (educator_id = auth.uid() AND private.has_role(auth.uid(), 'educator'::app_role))
    )
  )
  WITH CHECK (
    org_id = private.current_org_id()
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR (educator_id = auth.uid() AND private.has_role(auth.uid(), 'educator'::app_role))
    )
  );