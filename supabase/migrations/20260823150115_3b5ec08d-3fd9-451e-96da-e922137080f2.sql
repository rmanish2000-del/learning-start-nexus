ALTER TABLE public.learner_evidence DROP CONSTRAINT learner_evidence_kind_check;
ALTER TABLE public.learner_evidence ADD CONSTRAINT learner_evidence_kind_check CHECK (kind IN ('worksheet', 'quiz', 'observation', 'assessment'));

CREATE TABLE public.assessment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid,
  grade integer NOT NULL DEFAULT 6,
  subject text NOT NULL DEFAULT 'Mathematics',
  topic text NOT NULL DEFAULT 'Fractions',
  subtopic text NOT NULL,
  difficulty integer NOT NULL DEFAULT 1,
  kind text NOT NULL DEFAULT 'mcq',
  prompt text NOT NULL,
  options jsonb,
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_items_difficulty_check CHECK (difficulty BETWEEN 1 AND 3),
  CONSTRAINT assessment_items_kind_check CHECK (kind IN ('mcq', 'numeric'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_items TO authenticated;
GRANT ALL ON public.assessment_items TO service_role;
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid,
  title text NOT NULL,
  description text,
  subject text NOT NULL DEFAULT 'Mathematics',
  topic text NOT NULL DEFAULT 'Fractions',
  grade integer NOT NULL DEFAULT 6,
  kind text NOT NULL DEFAULT 'diagnostic',
  status text NOT NULL DEFAULT 'draft',
  time_limit_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessments_kind_check CHECK (kind IN ('diagnostic', 'quiz', 'checkpoint')),
  CONSTRAINT assessments_status_check CHECK (status IN ('draft', 'published', 'archived'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.assessment_item_map (
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.assessment_items(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 1,
  PRIMARY KEY (assessment_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_item_map TO authenticated;
GRANT ALL ON public.assessment_item_map TO service_role;
ALTER TABLE public.assessment_item_map ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  assigned_by uuid,
  status text NOT NULL DEFAULT 'assigned',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_position integer NOT NULL DEFAULT 0,
  score_pct integer,
  correct_count integer,
  total_count integer,
  result jsonb,
  due date,
  started_at timestamptz,
  last_activity_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_sessions_status_check CHECK (status IN ('assigned', 'in_progress', 'submitted')),
  CONSTRAINT assessment_sessions_unique UNIQUE (assessment_id, learner_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_sessions TO authenticated;
GRANT ALL ON public.assessment_sessions TO service_role;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'educator'::app_role)
$$;

CREATE OR REPLACE FUNCTION private.assessment_in_my_org(_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assessments a
    WHERE a.id = _assessment_id
      AND a.org_id = private.current_org_id()
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.assessment_in_my_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.assessment_in_my_org(uuid) TO authenticated, service_role;

CREATE POLICY "items_select" ON public.assessment_items
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "items_insert" ON public.assessment_items
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "items_update" ON public.assessment_items
  FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff())
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "items_delete" ON public.assessment_items
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "assessments_select" ON public.assessments
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id());
CREATE POLICY "assessments_insert" ON public.assessments
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "assessments_update" ON public.assessments
  FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff())
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "assessments_delete" ON public.assessments
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "map_select" ON public.assessment_item_map
  FOR SELECT TO authenticated
  USING (private.assessment_in_my_org(assessment_id) AND private.is_staff());
CREATE POLICY "map_insert" ON public.assessment_item_map
  FOR INSERT TO authenticated
  WITH CHECK (private.assessment_in_my_org(assessment_id) AND private.is_staff());
CREATE POLICY "map_update" ON public.assessment_item_map
  FOR UPDATE TO authenticated
  USING (private.assessment_in_my_org(assessment_id) AND private.is_staff())
  WITH CHECK (private.assessment_in_my_org(assessment_id) AND private.is_staff());
CREATE POLICY "map_delete" ON public.assessment_item_map
  FOR DELETE TO authenticated
  USING (private.assessment_in_my_org(assessment_id) AND private.is_staff());

CREATE POLICY "sessions_select" ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.can_view_learner(learner_id));
CREATE POLICY "sessions_insert" ON public.assessment_sessions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "sessions_update" ON public.assessment_sessions
  FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.can_manage_learner(learner_id))
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "sessions_delete" ON public.assessment_sessions
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_assessment_items BEFORE UPDATE ON public.assessment_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_assessments BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_assessment_sessions BEFORE UPDATE ON public.assessment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.assessment_items
  (id, org_id, created_by, grade, subject, topic, subtopic, difficulty, kind, prompt, options, correct_answer, explanation)
VALUES
  ('ddddddd1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Equivalence', 1, 'mcq',
   'Which fraction is equivalent to 2/3?',
   '["3/4", "4/6", "6/8", "5/6"]'::jsonb, '4/6',
   'Multiply numerator and denominator by 2: 2/3 = 4/6.'),
  ('ddddddd1-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Equivalence', 1, 'mcq',
   'Write 12/18 in simplest form.',
   '["3/4", "2/3", "6/9", "4/6"]'::jsonb, '2/3',
   'Divide numerator and denominator by 6: 12/18 = 2/3. 6/9 and 4/6 are equal but not in simplest form.'),
  ('ddddddd1-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Equivalence', 2, 'numeric',
   'What number makes this true?  2/5 = ?/20',
   NULL, '8',
   '20 is 4 times 5, so the numerator is 4 times 2 = 8.'),
  ('ddddddd1-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Equivalence', 2, 'mcq',
   'Which of these fractions is in simplest form?',
   '["6/8", "4/12", "5/9", "9/15"]'::jsonb, '5/9',
   '5 and 9 share no common factor. The others can all be reduced.'),
  ('ddddddd1-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Compare & order', 2, 'mcq',
   'Which fraction is greater: 3/5 or 5/8?',
   '["3/5", "5/8", "They are equal", "Cannot tell"]'::jsonb, '5/8',
   'Common denominator 40: 3/5 = 24/40 and 5/8 = 25/40, so 5/8 is greater.'),
  ('ddddddd1-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Compare & order', 2, 'mcq',
   'Which fraction is closest to 1?',
   '["3/4", "5/6", "7/8", "2/3"]'::jsonb, '7/8',
   '7/8 is only 1/8 away from 1 — the smallest gap of the four.'),
  ('ddddddd1-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Compare & order', 3, 'mcq',
   'Which list orders 1/2, 2/3, 3/5 from least to greatest?',
   '["1/2, 3/5, 2/3", "2/3, 3/5, 1/2", "3/5, 1/2, 2/3", "1/2, 2/3, 3/5"]'::jsonb, '1/2, 3/5, 2/3',
   'As thirtieths: 15/30, 20/30, 18/30 — so 1/2 < 3/5 < 2/3.'),
  ('ddddddd1-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Add & subtract', 1, 'mcq',
   'What is 1/2 + 1/4?',
   '["2/6", "3/4", "1/6", "2/4"]'::jsonb, '3/4',
   '1/2 = 2/4, and 2/4 + 1/4 = 3/4.'),
  ('ddddddd1-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Add & subtract', 2, 'mcq',
   'What is 5/6 − 1/3?',
   '["1/2", "2/3", "5/9", "1/6"]'::jsonb, '1/2',
   '1/3 = 2/6, and 5/6 − 2/6 = 3/6 = 1/2.'),
  ('ddddddd1-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Add & subtract', 2, 'numeric',
   'A recipe needs 3/4 cup of flour per batch. Riya doubles the recipe. How many cups of flour does she need in total? (Write a decimal, e.g. 1.5)',
   NULL, '1.5',
   '3/4 + 3/4 = 6/4 = 1.5 cups.'),
  ('ddddddd1-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Multiply & divide', 2, 'mcq',
   'What is 2/5 × 3/4?',
   '["3/10", "5/9", "8/15", "1/2"]'::jsonb, '3/10',
   'Multiply across: (2×3)/(5×4) = 6/20 = 3/10.'),
  ('ddddddd1-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Multiply & divide', 3, 'mcq',
   'What is 1/2 ÷ 1/4?',
   '["2", "1/8", "1/2", "4"]'::jsonb, '2',
   'How many quarters fit in a half? 1/2 ÷ 1/4 = 1/2 × 4 = 2.'),
  ('ddddddd1-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Fraction of a quantity', 1, 'mcq',
   'What is 3/4 of 24?',
   '["16", "18", "20", "12"]'::jsonb, '18',
   '1/4 of 24 is 6, so 3/4 of 24 is 3 × 6 = 18.'),
  ('ddddddd1-0000-4000-8000-000000000014', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Fraction of a quantity', 2, 'numeric',
   'A 30-metre ribbon is cut so that 3/5 of it is used for decorations. How many metres are used?',
   NULL, '18',
   '1/5 of 30 is 6, so 3/5 of 30 is 18 metres.'),
  ('ddddddd1-0000-4000-8000-000000000015', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Decimals & mixed numbers', 1, 'mcq',
   'Which decimal is equal to 3/10?',
   '["0.03", "0.3", "3.1", "0.13"]'::jsonb, '0.3',
   '3/10 means 3 tenths, which is 0.3.'),
  ('ddddddd1-0000-4000-8000-000000000016', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001', 6, 'Mathematics', 'Fractions', 'Decimals & mixed numbers', 2, 'mcq',
   'Write 7/4 as a mixed number.',
   '["1 1/4", "1 3/4", "2 1/4", "1 2/4"]'::jsonb, '1 3/4',
   '7/4 = 4/4 + 3/4 = 1 3/4.');

INSERT INTO public.assessments
  (id, org_id, created_by, title, description, subject, topic, grade, kind, status, time_limit_minutes)
VALUES
  ('a55e5501-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001',
   'Fractions Foundations Diagnostic',
   'Baseline check across equivalence, comparison, and addition of fractions. Use before starting the fractions unit.',
   'Mathematics', 'Fractions', 6, 'diagnostic', 'published', 20),
  ('a55e5501-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000001',
   'Fraction Operations Check',
   'Harder follow-up: ordering, multiplication, division, and fractions of quantities.',
   'Mathematics', 'Fractions', 6, 'diagnostic', 'published', 15);

INSERT INTO public.assessment_item_map (assessment_id, item_id, sort_order, points)
VALUES
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000001', 1, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000002', 2, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000003', 3, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000005', 4, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000006', 5, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000008', 6, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000009', 7, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000011', 8, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000013', 9, 1),
  ('a55e5501-0000-4000-8000-000000000001', 'ddddddd1-0000-4000-8000-000000000015', 10, 1),
  ('a55e5501-0000-4000-8000-000000000002', 'ddddddd1-0000-4000-8000-000000000004', 1, 1),
  ('a55e5501-0000-4000-8000-000000000002', 'ddddddd1-0000-4000-8000-000000000007', 2, 1),
  ('a55e5501-0000-4000-8000-000000000002', 'ddddddd1-0000-4000-8000-000000000010', 3, 1),
  ('a55e5501-0000-4000-8000-000000000002', 'ddddddd1-0000-4000-8000-000000000012', 4, 1),
  ('a55e5501-0000-4000-8000-000000000002', 'ddddddd1-0000-4000-8000-000000000014', 5, 1),
  ('a55e5501-0000-4000-8000-000000000002', 'ddddddd1-0000-4000-8000-000000000016', 6, 1);

INSERT INTO public.assessment_sessions
  (id, org_id, assessment_id, learner_id, assigned_by, status, answers, current_position, due, started_at, last_activity_at)
VALUES
  ('5e551001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'a55e5501-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000001', 'eeeeeee1-0000-4000-8000-000000000001',
   'in_progress',
   '{"ddddddd1-0000-4000-8000-000000000001": "4/6", "ddddddd1-0000-4000-8000-000000000002": "6/9", "ddddddd1-0000-4000-8000-000000000003": "8", "ddddddd1-0000-4000-8000-000000000005": "3/5"}'::jsonb,
   4, (CURRENT_DATE + 3)::date, now() - interval '1 day', now() - interval '2 hours'),
  ('5e551001-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'a55e5501-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000002', 'eeeeeee1-0000-4000-8000-000000000001',
   'assigned', '{}'::jsonb, 0, (CURRENT_DATE + 5)::date, NULL, NULL);

INSERT INTO public.assessment_sessions
  (id, org_id, assessment_id, learner_id, assigned_by, status, answers, current_position,
   score_pct, correct_count, total_count, result, due, started_at, last_activity_at, submitted_at)
VALUES
  ('5e551001-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'a55e5501-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000006', 'eeeeeee1-0000-4000-8000-000000000002',
   'submitted',
   '{"ddddddd1-0000-4000-8000-000000000001": "4/6", "ddddddd1-0000-4000-8000-000000000002": "2/3", "ddddddd1-0000-4000-8000-000000000003": "8", "ddddddd1-0000-4000-8000-000000000005": "3/5", "ddddddd1-0000-4000-8000-000000000006": "7/8", "ddddddd1-0000-4000-8000-000000000008": "3/4", "ddddddd1-0000-4000-8000-000000000009": "1/2", "ddddddd1-0000-4000-8000-000000000011": "5/9", "ddddddd1-0000-4000-8000-000000000013": "18", "ddddddd1-0000-4000-8000-000000000015": "0.3"}'::jsonb,
   9, 80, 8, 10,
   '[{"item_id": "ddddddd1-0000-4000-8000-000000000001", "subtopic": "Equivalence", "given": "4/6", "correct_answer": "4/6", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000002", "subtopic": "Equivalence", "given": "2/3", "correct_answer": "2/3", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000003", "subtopic": "Equivalence", "given": "8", "correct_answer": "8", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000005", "subtopic": "Compare & order", "given": "3/5", "correct_answer": "5/8", "correct": false}, {"item_id": "ddddddd1-0000-4000-8000-000000000006", "subtopic": "Compare & order", "given": "7/8", "correct_answer": "7/8", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000008", "subtopic": "Add & subtract", "given": "3/4", "correct_answer": "3/4", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000009", "subtopic": "Add & subtract", "given": "1/2", "correct_answer": "1/2", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000011", "subtopic": "Multiply & divide", "given": "5/9", "correct_answer": "3/10", "correct": false}, {"item_id": "ddddddd1-0000-4000-8000-000000000013", "subtopic": "Fraction of a quantity", "given": "18", "correct_answer": "18", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000015", "subtopic": "Decimals & mixed numbers", "given": "0.3", "correct_answer": "0.3", "correct": true}]'::jsonb,
   (CURRENT_DATE - 1)::date, now() - interval '1 day 40 minutes', now() - interval '1 day', now() - interval '1 day');

INSERT INTO public.learner_assessments (learner_id, title, subject, taken_on, score, status)
VALUES
  ('ccccccc1-0000-4000-8000-000000000006', 'Fractions Foundations Diagnostic', 'Mathematics', (CURRENT_DATE - 1)::date, 80, 'completed');

INSERT INTO public.learner_evidence (learner_id, title, kind, note, recorded_on)
VALUES
  ('ccccccc1-0000-4000-8000-000000000006', 'Fractions Foundations Diagnostic — auto-scored', 'assessment',
   'Scored 80% (8/10). Strong: Equivalence, Add & subtract, Fraction of a quantity, Decimals & mixed numbers. Needs work: Compare & order, Multiply & divide.',
   (CURRENT_DATE - 1)::date);

INSERT INTO public.assessment_items
  (id, org_id, created_by, grade, subject, topic, subtopic, difficulty, kind, prompt, options, correct_answer, explanation)
SELECT replace(id::text, 'ddddddd1', 'ddddddd2')::uuid,
       '22222222-2222-4222-8222-222222222222',
       'eeeeeee2-0000-4000-8000-000000000001',
       grade, subject, topic, subtopic, difficulty, kind, prompt, options, correct_answer, explanation
FROM public.assessment_items
WHERE org_id = '11111111-1111-4111-8111-111111111111';

INSERT INTO public.assessments
  (id, org_id, created_by, title, description, subject, topic, grade, kind, status, time_limit_minutes)
VALUES
  ('a55e5511-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'eeeeeee2-0000-4000-8000-000000000001',
   'Fractions Foundations Diagnostic',
   'Baseline check across equivalence, comparison, and addition of fractions.',
   'Mathematics', 'Fractions', 6, 'diagnostic', 'published', 20);

INSERT INTO public.assessment_item_map (assessment_id, item_id, sort_order, points)
SELECT 'a55e5511-0000-4000-8000-000000000001',
       replace(item_id::text, 'ddddddd1', 'ddddddd2')::uuid,
       sort_order, points
FROM public.assessment_item_map
WHERE assessment_id = 'a55e5501-0000-4000-8000-000000000001';

INSERT INTO public.assessment_sessions
  (id, org_id, assessment_id, learner_id, assigned_by, status, due)
VALUES
  ('5e551011-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'a55e5511-0000-4000-8000-000000000001', 'ccccccc2-0000-4000-8000-000000000001', 'eeeeeee2-0000-4000-8000-000000000001',
   'assigned', (CURRENT_DATE + 7)::date);