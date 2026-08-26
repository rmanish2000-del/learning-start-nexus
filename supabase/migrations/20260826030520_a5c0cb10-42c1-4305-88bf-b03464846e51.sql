-- ===========================================================================
-- M6: per-gap tutor logging + tutor evidence aggregates
-- ===========================================================================
ALTER TABLE public.tutor_sessions
  ADD COLUMN IF NOT EXISTS gap_id uuid REFERENCES public.learning_gaps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;

UPDATE public.tutor_sessions ts
SET gap_id = i.gap_id
FROM public.interventions i
WHERE ts.intervention_id = i.id
  AND ts.gap_id IS NULL
  AND i.gap_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tutor_sessions_gap_id_idx ON public.tutor_sessions(gap_id);
CREATE INDEX IF NOT EXISTS tutor_interactions_session_idx ON public.tutor_interactions(session_id, created_at);

-- Aggregate tutor evidence per gap. SECURITY DEFINER so staff/reviewers get
-- counts and minutes WITHOUT read access to the private conversation rows.
-- Minutes are deterministic: for each session, sum the gap between
-- consecutive interactions capped at 5 minutes, plus 1 minute for the first
-- interaction. Substantive = a graded practice/try answer, or an explanation
-- style reply of at least 200 characters (hints excluded).
CREATE OR REPLACE FUNCTION public.tutor_evidence_by_gap()
RETURNS TABLE (
  gap_id uuid,
  learner_id uuid,
  sessions integer,
  interactions integer,
  substantive_interactions integer,
  tutor_minutes integer,
  first_at timestamp with time zone,
  last_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
         COUNT(DISTINCT s.id)::int AS sessions,
         COUNT(scored.session_id)::int AS interactions,
         COALESCE(SUM(scored.substantive), 0)::int AS substantive_interactions,
         CEIL(COALESCE(SUM(scored.seconds), 0) / 60.0)::int AS tutor_minutes,
         MIN(scored.created_at) AS first_at,
         MAX(scored.created_at) AS last_at
  FROM s
  LEFT JOIN scored ON scored.session_id = s.id
  GROUP BY s.gap_id, s.learner_id;
$$;

REVOKE ALL ON FUNCTION public.tutor_evidence_by_gap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tutor_evidence_by_gap() TO authenticated;

-- ===========================================================================
-- M7: CBSE competency question types
-- ===========================================================================
ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS question_bank_kind_check;
ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_kind_check CHECK (
    kind IN (
      'mcq', 'true_false', 'fill_blank', 'short_answer',
      'case_study', 'assertion_reason', 'data_interpretation', 'applied_mcq'
    )
  );

ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS stimulus text,
  ADD COLUMN IF NOT EXISTS parent_question_id uuid REFERENCES public.question_bank(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS part_order integer;

CREATE INDEX IF NOT EXISTS question_bank_parent_idx ON public.question_bank(parent_question_id);

-- ===========================================================================
-- M8: reviewer verification + audit trail
-- ===========================================================================
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS verification_state text NOT NULL DEFAULT 'unverified';

ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS question_bank_verification_state_check;
ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_verification_state_check CHECK (
    verification_state IN ('unverified', 'verified', 'rejected')
  );

CREATE TABLE IF NOT EXISTS public.question_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('verified', 'rejected')),
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.question_verifications TO authenticated;
GRANT ALL ON public.question_verifications TO service_role;

ALTER TABLE public.question_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_verifications_select" ON public.question_verifications
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE POLICY "question_verifications_insert" ON public.question_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = private.current_org_id()
    AND reviewer_id = auth.uid()
    AND (private.is_reviewer() OR private.has_role(auth.uid(), 'admin'))
  );

CREATE INDEX IF NOT EXISTS question_verifications_question_idx
  ON public.question_verifications(question_id, created_at DESC);

-- Recording a verification stamps the question. SECURITY DEFINER because
-- reviewers deliberately have no UPDATE grant on question_bank.
CREATE OR REPLACE FUNCTION public.apply_question_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.question_bank
  SET verification_state = NEW.action,
      verified_by = NEW.reviewer_id,
      verified_at = NEW.created_at,
      verification_note = NEW.note
  WHERE id = NEW.question_id
    AND org_id = NEW.org_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_question_verification_trg ON public.question_verifications;
CREATE TRIGGER apply_question_verification_trg
  AFTER INSERT ON public.question_verifications
  FOR EACH ROW EXECUTE FUNCTION public.apply_question_verification();