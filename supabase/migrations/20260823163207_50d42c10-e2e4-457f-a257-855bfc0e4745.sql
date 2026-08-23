-- Sprint 3: Gap detection, deterministic recommendation engine, intervention workflow.

CREATE TABLE public.learning_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE SET NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  subtopic text NOT NULL,
  items_total integer NOT NULL,
  items_correct integer NOT NULL,
  gap_score_pct integer NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolved_session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE SET NULL,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_gaps_severity_check CHECK (severity IN ('high', 'medium')),
  CONSTRAINT learning_gaps_status_check CHECK (status IN ('open', 'addressed', 'dismissed')),
  CONSTRAINT learning_gaps_learner_subtopic_unique UNIQUE (learner_id, subtopic)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_gaps TO authenticated;
GRANT ALL ON public.learning_gaps TO service_role;
ALTER TABLE public.learning_gaps ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  gap_id uuid NOT NULL UNIQUE REFERENCES public.learning_gaps(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  priority integer NOT NULL,
  title text NOT NULL,
  activity text NOT NULL,
  rationale text NOT NULL,
  status text NOT NULL DEFAULT 'suggested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendations_status_check CHECK (status IN ('suggested', 'accepted', 'dismissed')),
  CONSTRAINT recommendations_priority_check CHECK (priority IN (1, 2))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL,
  gap_id uuid REFERENCES public.learning_gaps(id) ON DELETE SET NULL,
  educator_id uuid,
  title text NOT NULL,
  activity text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  target_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT interventions_status_check CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interventions TO authenticated;
GRANT ALL ON public.interventions TO service_role;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gaps_select" ON public.learning_gaps
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.can_view_learner(learner_id));
CREATE POLICY "gaps_insert" ON public.learning_gaps
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "gaps_update" ON public.learning_gaps
  FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.can_manage_learner(learner_id))
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "gaps_delete" ON public.learning_gaps
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "recs_select" ON public.recommendations
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.can_view_learner(learner_id));
CREATE POLICY "recs_insert" ON public.recommendations
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "recs_update" ON public.recommendations
  FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.can_manage_learner(learner_id))
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "recs_delete" ON public.recommendations
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "interventions_select" ON public.interventions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.can_view_learner(learner_id));
CREATE POLICY "interventions_insert" ON public.interventions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "interventions_update" ON public.interventions
  FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.can_manage_learner(learner_id))
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "interventions_delete" ON public.interventions
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_learning_gaps BEFORE UPDATE ON public.learning_gaps
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_recommendations BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_interventions BEFORE UPDATE ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP VIEW IF EXISTS public.rls_policy_audit;
CREATE VIEW public.rls_policy_audit
WITH (security_invoker = true) AS
SELECT
  tablename,
  policyname,
  cmd,
  roles::text AS roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'assessments',
    'assessment_sessions',
    'assessment_items',
    'learner_assessments',
    'learner_evidence',
    'learning_gaps',
    'recommendations',
    'interventions'
  )
ORDER BY tablename, policyname;
GRANT SELECT ON public.rls_policy_audit TO authenticated;
GRANT SELECT ON public.rls_policy_audit TO service_role;

INSERT INTO public.learning_gaps
  (id, org_id, learner_id, session_id, subject, topic, subtopic, items_total, items_correct, gap_score_pct, severity, status, first_detected_at, detected_at)
VALUES
  ('fa6e0001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000006', '5e551001-0000-4000-8000-000000000003',
   'Mathematics', 'Fractions', 'Compare & order', 2, 1, 50, 'medium', 'open',
   now() - interval '1 day', now() - interval '1 day'),
  ('fa6e0001-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000006', '5e551001-0000-4000-8000-000000000003',
   'Mathematics', 'Fractions', 'Multiply & divide', 1, 0, 0, 'high', 'open',
   now() - interval '1 day', now() - interval '1 day');

INSERT INTO public.recommendations
  (id, org_id, learner_id, gap_id, rule_id, priority, title, activity, rationale, status)
VALUES
  ('9ec00001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000006', 'fa6e0001-0000-4000-8000-000000000001',
   'CMP-MED', 2,
   'Guided practice: comparing fractions',
   '10-item guided practice set on comparing and ordering fractions with immediate feedback.',
   'Gap detected: 1/2 correct (50%) on Compare & order; threshold is 70%.',
   'suggested'),
  ('9ec00001-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000006', 'fa6e0001-0000-4000-8000-000000000002',
   'MUL-HIGH', 1,
   'Reteach: multiplying & dividing fractions',
   'One-on-one reteach of fraction multiplication and division using area models, followed by 6 guided problems.',
   'Gap detected: 0/1 correct (0%) on Multiply & divide; threshold is 70%.',
   'accepted');

INSERT INTO public.interventions
  (id, org_id, learner_id, recommendation_id, gap_id, educator_id, title, activity, status, notes, target_date, started_at)
VALUES
  ('17a60001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000006',
   '9ec00001-0000-4000-8000-000000000002', 'fa6e0001-0000-4000-8000-000000000002',
   'eeeeeee1-0000-4000-8000-000000000002',
   'Reteach: multiplying & dividing fractions',
   'One-on-one reteach of fraction multiplication and division using area models, followed by 6 guided problems.',
   'in_progress',
   'Seeded demo: started after reviewing the Fractions Foundations Diagnostic.',
   (CURRENT_DATE + 7)::date, now() - interval '20 hours');

INSERT INTO public.learning_gaps
  (id, org_id, learner_id, session_id, subject, topic, subtopic, items_total, items_correct, gap_score_pct, severity, status)
VALUES
  ('fa6e0002-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'ccccccc2-0000-4000-8000-000000000001', NULL,
   'Mathematics', 'Fractions', 'Equivalence', 3, 1, 33, 'high', 'open');

INSERT INTO public.recommendations
  (id, org_id, learner_id, gap_id, rule_id, priority, title, activity, rationale, status)
VALUES
  ('9ec00002-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'ccccccc2-0000-4000-8000-000000000001', 'fa6e0002-0000-4000-8000-000000000001',
   'EQV-HIGH', 1,
   'Reteach: equivalent fractions',
   'One-on-one reteach of equivalent fractions using area models and number lines, followed by 6 guided simplification problems.',
   'Gap detected: 1/3 correct (33%) on Equivalence; threshold is 70%.',
   'suggested');

INSERT INTO public.interventions
  (id, org_id, learner_id, recommendation_id, gap_id, educator_id, title, activity, status, target_date)
VALUES
  ('17a60002-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'ccccccc2-0000-4000-8000-000000000001',
   '9ec00002-0000-4000-8000-000000000001', 'fa6e0002-0000-4000-8000-000000000001',
   'eeeeeee2-0000-4000-8000-000000000001',
   'Reteach: equivalent fractions',
   'One-on-one reteach of equivalent fractions using area models and number lines, followed by 6 guided simplification problems.',
   'planned', (CURRENT_DATE + 7)::date);