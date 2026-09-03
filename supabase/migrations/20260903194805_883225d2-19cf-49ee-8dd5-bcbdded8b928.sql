CREATE POLICY pyq_sessions_learner_insert ON public.pyq_practice_sessions
FOR INSERT TO authenticated
WITH CHECK (
  org_id = private.current_org_id()
  AND EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = learner_id
      AND l.org_id = private.current_org_id()
      AND l.student_user_id = auth.uid()
  )
);

CREATE POLICY pyq_sessions_learner_update ON public.pyq_practice_sessions
FOR UPDATE TO authenticated
USING (
  org_id = private.current_org_id()
  AND EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = learner_id
      AND l.org_id = private.current_org_id()
      AND l.student_user_id = auth.uid()
  )
)
WITH CHECK (
  org_id = private.current_org_id()
  AND EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = learner_id
      AND l.org_id = private.current_org_id()
      AND l.student_user_id = auth.uid()
  )
);