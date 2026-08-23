-- Sprint 4: AI Tutor V1
-- tutor_sessions: one row per launched tutor session (staff see these aggregates).
-- tutor_interactions: append-only conversation log (student-only reads — staff
-- get session aggregates, never conversation detail).

CREATE TABLE public.tutor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  intervention_id uuid REFERENCES public.interventions(id) ON DELETE SET NULL,
  student_user_id uuid NOT NULL REFERENCES auth.users(id),
  subject text NOT NULL,
  topic text NOT NULL,
  concept text NOT NULL,
  objective text NOT NULL,
  mastery_at_start integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  interaction_count integer NOT NULL DEFAULT 0,
  concepts_accessed text[] NOT NULL DEFAULT '{}',
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tutor_sessions_learner_idx ON public.tutor_sessions (learner_id);
CREATE INDEX tutor_sessions_student_idx ON public.tutor_sessions (student_user_id);

CREATE TABLE public.tutor_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  session_id uuid NOT NULL REFERENCES public.tutor_sessions(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL CHECK (kind IN (
    'explain', 'hint', 'example', 'reframe',
    'try_question', 'try_answer',
    'socratic',
    'practice_question', 'practice_answer'
  )),
  request_text text,
  response_text text NOT NULL,
  ai_used boolean NOT NULL DEFAULT false,
  practice_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tutor_interactions_session_idx ON public.tutor_interactions (session_id);

GRANT SELECT, INSERT, UPDATE ON public.tutor_sessions TO authenticated;
GRANT ALL ON public.tutor_sessions TO service_role;
GRANT SELECT, INSERT ON public.tutor_interactions TO authenticated;
GRANT ALL ON public.tutor_interactions TO service_role;

ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_interactions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER touch_tutor_sessions BEFORE UPDATE ON public.tutor_sessions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Ownership helpers (security definer, no nested-policy dependency).
CREATE OR REPLACE FUNCTION private.is_own_learner(_learner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = _learner_id AND l.student_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.owns_tutor_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tutor_sessions s
    WHERE s.id = _session_id AND s.student_user_id = auth.uid()
  );
$$;

-- Sessions: student sees own; staff see learners they may view (org-scoped).
CREATE POLICY tutor_sessions_select ON public.tutor_sessions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.can_view_learner(learner_id));

-- Only the student launches (inserts) their own session.
CREATE POLICY tutor_sessions_insert ON public.tutor_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_user_id = auth.uid()
    AND org_id = private.current_org_id()
    AND private.is_own_learner(learner_id)
  );

-- Only the student updates their own session (counters, activity, status).
CREATE POLICY tutor_sessions_update ON public.tutor_sessions
  FOR UPDATE TO authenticated
  USING (student_user_id = auth.uid() AND org_id = private.current_org_id())
  WITH CHECK (student_user_id = auth.uid() AND org_id = private.current_org_id());

-- Interactions: student-only read. No staff SELECT policy on purpose —
-- educators see session aggregates, never conversation content.
CREATE POLICY tutor_interactions_select ON public.tutor_interactions
  FOR SELECT TO authenticated
  USING (student_user_id = auth.uid() AND org_id = private.current_org_id());

CREATE POLICY tutor_interactions_insert ON public.tutor_interactions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_user_id = auth.uid()
    AND org_id = private.current_org_id()
    AND private.is_own_learner(learner_id)
    AND private.owns_tutor_session(session_id)
  );

-- Extend the live policy audit view with the tutor tables.
CREATE OR REPLACE VIEW public.rls_policy_audit AS
SELECT tablename, policyname, cmd, (roles)::text AS roles,
       qual AS using_expression, with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = ANY (ARRAY[
    'assessments', 'assessment_sessions', 'assessment_items',
    'learner_assessments', 'learner_evidence',
    'learning_gaps', 'recommendations', 'interventions',
    'tutor_sessions', 'tutor_interactions'
  ])
ORDER BY tablename, policyname;