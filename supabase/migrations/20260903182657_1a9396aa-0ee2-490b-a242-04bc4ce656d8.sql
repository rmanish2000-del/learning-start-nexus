ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS verification_tier text;

ALTER TABLE public.question_bank
  DROP CONSTRAINT IF EXISTS question_bank_verification_tier_check;
ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_verification_tier_check
  CHECK (verification_tier IS NULL OR verification_tier = ANY (ARRAY['named_sme'::text, 'eduos_automated'::text]));

CREATE TABLE public.question_auto_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  run_id uuid NOT NULL,
  engine_version text NOT NULL,
  outcome text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.question_auto_verifications
  ADD CONSTRAINT question_auto_verifications_outcome_check
  CHECK (outcome = ANY (ARRAY['auto_approved'::text, 'quarantined'::text]));

CREATE INDEX question_auto_verifications_question_idx
  ON public.question_auto_verifications (question_id, created_at DESC);
CREATE INDEX question_auto_verifications_run_idx
  ON public.question_auto_verifications (run_id);

GRANT SELECT, INSERT ON public.question_auto_verifications TO authenticated;
GRANT ALL ON public.question_auto_verifications TO service_role;

ALTER TABLE public.question_auto_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auto_verifications_select"
  ON public.question_auto_verifications FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE POLICY "auto_verifications_insert"
  ON public.question_auto_verifications FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.auto_verifications_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Automated verification records are append-only';
END;
$$;

CREATE TRIGGER question_auto_verifications_no_update
  BEFORE UPDATE ON public.question_auto_verifications
  FOR EACH ROW EXECUTE FUNCTION public.auto_verifications_immutable();

CREATE TRIGGER question_auto_verifications_no_delete
  BEFORE DELETE ON public.question_auto_verifications
  FOR EACH ROW EXECUTE FUNCTION public.auto_verifications_immutable();

CREATE TABLE public.pyq_practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  subject text NOT NULL,
  chapter text,
  cohort text NOT NULL DEFAULT 'recent_2023_2026',
  mode text NOT NULL DEFAULT 'practice',
  duration_minutes integer,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'in_progress',
  score_pct integer,
  correct_count integer,
  total_count integer,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pyq_practice_sessions
  ADD CONSTRAINT pyq_practice_sessions_status_check
  CHECK (status = ANY (ARRAY['in_progress'::text, 'submitted'::text]));
ALTER TABLE public.pyq_practice_sessions
  ADD CONSTRAINT pyq_practice_sessions_mode_check
  CHECK (mode = ANY (ARRAY['practice'::text, 'timed_paper'::text]));
ALTER TABLE public.pyq_practice_sessions
  ADD CONSTRAINT pyq_practice_sessions_cohort_check
  CHECK (cohort = ANY (ARRAY['recent_2023_2026'::text, 'term_2022'::text]));

CREATE INDEX pyq_practice_sessions_learner_idx
  ON public.pyq_practice_sessions (learner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pyq_practice_sessions TO authenticated;
GRANT ALL ON public.pyq_practice_sessions TO service_role;

ALTER TABLE public.pyq_practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pyq_sessions_select"
  ON public.pyq_practice_sessions FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.can_view_learner(learner_id));

CREATE POLICY "pyq_sessions_parent_select"
  ON public.pyq_practice_sessions FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_parent_of(learner_id));

CREATE POLICY "pyq_sessions_insert"
  ON public.pyq_practice_sessions FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));

CREATE POLICY "pyq_sessions_update"
  ON public.pyq_practice_sessions FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.can_manage_learner(learner_id))
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));

CREATE POLICY "pyq_sessions_delete"
  ON public.pyq_practice_sessions FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_pyq_practice_sessions
  BEFORE UPDATE ON public.pyq_practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();