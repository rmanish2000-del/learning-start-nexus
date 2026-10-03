CREATE POLICY "gaps_parent_select" ON public.learning_gaps
FOR SELECT TO authenticated
USING (private.learner_in_my_org(learner_id) AND private.is_parent_of(learner_id));

CREATE POLICY "evidence_parent_select" ON public.learner_evidence
FOR SELECT TO authenticated
USING (private.learner_in_my_org(learner_id) AND private.is_parent_of(learner_id));