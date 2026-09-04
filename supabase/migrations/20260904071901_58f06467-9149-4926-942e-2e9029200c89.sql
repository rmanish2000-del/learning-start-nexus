DROP POLICY IF EXISTS tutor_sessions_update ON public.tutor_sessions;
CREATE POLICY tutor_sessions_update ON public.tutor_sessions
FOR UPDATE TO authenticated
USING (
  student_user_id = auth.uid()
  AND org_id = private.current_org_id()
  AND private.is_own_learner(learner_id)
)
WITH CHECK (
  student_user_id = auth.uid()
  AND org_id = private.current_org_id()
  AND private.is_own_learner(learner_id)
);