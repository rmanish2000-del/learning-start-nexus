INSERT INTO public.learner_assessments (learner_id, title, subject, taken_on, score, status)
SELECT id, 'Northstar Fractions Check', 'Mathematics', CURRENT_DATE - 2, 70, 'completed'
FROM public.learners
WHERE handle = 'tom'
  AND NOT EXISTS (
    SELECT 1 FROM public.learner_assessments la
    WHERE la.learner_id = learners.id AND la.title = 'Northstar Fractions Check'
  );

INSERT INTO public.learner_evidence (learner_id, title, kind, note, recorded_on)
SELECT id, 'Northstar Fractions Check — auto-scored', 'assessment',
       'Scored 70% (7/10) on Northstar Fractions Check. Strong: Equivalence. Needs work: Compare & order.',
       CURRENT_DATE - 2
FROM public.learners
WHERE handle = 'tom'
  AND NOT EXISTS (
    SELECT 1 FROM public.learner_evidence le
    WHERE le.learner_id = learners.id AND le.title = 'Northstar Fractions Check — auto-scored'
  );