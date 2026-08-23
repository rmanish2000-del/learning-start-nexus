-- Sprint 5A: reviewer role read access + parent/guardian consent

-- 1. Reviewer helper -------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_reviewer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT private.has_role(auth.uid(), 'reviewer'::app_role)
$$;

-- 2. Org-wide read for reviewers through the existing view helper -----------------
-- can_view_learner backs the SELECT policies on assessment_sessions,
-- learner_evidence, learner_assessments, learning_gaps, recommendations,
-- interventions, learning_plan_items, mastery_history, tutor_sessions and
-- (with is_own_learner) learner_outcomes — one change covers them all.
CREATE OR REPLACE FUNCTION private.can_view_learner(_learner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.id = _learner_id
      AND l.org_id = private.current_org_id()
      AND (
        private.has_role(auth.uid(), 'admin'::app_role)
        OR private.has_role(auth.uid(), 'reviewer'::app_role)
        OR l.educator_id = auth.uid()
        OR l.student_user_id = auth.uid()
      )
  );
$$;

-- 3. learners SELECT policy inlines its expression — recreate it with reviewer ---
DROP POLICY IF EXISTS "Org-scoped learner visibility" ON public.learners;
CREATE POLICY "Org-scoped learner visibility"
ON public.learners
FOR SELECT
TO authenticated
USING (
  org_id = private.current_org_id()
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'reviewer'::app_role)
    OR educator_id = auth.uid()
    OR student_user_id = auth.uid()
  )
);

-- 4. Item bank + map are staff-read; give reviewers their own read-only policies --
CREATE POLICY "items_reviewer_select"
ON public.assessment_items
FOR SELECT
TO authenticated
USING (org_id = private.current_org_id() AND private.is_reviewer());

CREATE POLICY "map_reviewer_select"
ON public.assessment_item_map
FOR SELECT
TO authenticated
USING (private.assessment_in_my_org(assessment_id) AND private.is_reviewer());

-- NOTE: tutor_interactions intentionally stays student-only — conversation
-- privacy holds for reviewers too. No INSERT/UPDATE/DELETE policy anywhere
-- references the reviewer role, so the role is read-only by construction.

-- 5. Parent/guardian consent (append-only history) --------------------------------
CREATE TABLE public.guardian_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  parent_name text NOT NULL,
  parent_email text NOT NULL,
  parent_mobile text NOT NULL,
  consent_date date NOT NULL,
  consent_version text NOT NULL,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guardian_consents_learner_idx ON public.guardian_consents (learner_id, consent_date DESC);

GRANT SELECT, INSERT ON public.guardian_consents TO authenticated;
GRANT ALL ON public.guardian_consents TO service_role;

ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;

-- Read: staff, reviewers, and the student themselves (their own learner row).
CREATE POLICY "consents_select"
ON public.guardian_consents
FOR SELECT
TO authenticated
USING (org_id = private.current_org_id() AND private.can_view_learner(learner_id));

-- Record: staff who manage the learner. Reviewers and students cannot write.
CREATE POLICY "consents_insert"
ON public.guardian_consents
FOR INSERT
TO authenticated
WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));

-- Deliberately no UPDATE or DELETE policies: consent history is append-only.