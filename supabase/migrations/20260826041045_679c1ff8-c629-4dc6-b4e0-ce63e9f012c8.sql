DROP POLICY IF EXISTS mastery_parent_select ON public.mastery_history;
CREATE POLICY mastery_parent_select ON public.mastery_history
FOR SELECT TO authenticated
USING (private.learner_in_my_org(learner_id) AND private.is_parent_of(learner_id));