-- Sprint 5: Outcome proof — reassessment engine, mastery index, learner outcomes.

ALTER TABLE public.assessments DROP CONSTRAINT assessments_kind_check;
ALTER TABLE public.assessments
  ADD CONSTRAINT assessments_kind_check CHECK (kind IN ('diagnostic', 'quiz', 'checkpoint', 'reassessment'));

ALTER TABLE public.assessment_sessions
  ADD COLUMN intervention_id uuid REFERENCES public.interventions(id) ON DELETE SET NULL;
CREATE INDEX assessment_sessions_intervention_idx ON public.assessment_sessions (intervention_id);

CREATE TABLE public.learner_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  intervention_id uuid NOT NULL UNIQUE REFERENCES public.interventions(id) ON DELETE CASCADE,
  gap_id uuid REFERENCES public.learning_gaps(id) ON DELETE SET NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  subtopic text NOT NULL,
  baseline_session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE SET NULL,
  baseline_score integer NOT NULL,
  reassessment_session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE SET NULL,
  post_score integer,
  mastery_lift integer,
  confidence integer,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learner_outcomes_status_check
    CHECK (status IN ('pending', 'improvement', 'no_improvement', 'low_confidence', 'requires_review')),
  CONSTRAINT learner_outcomes_confidence_check CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 100)),
  CONSTRAINT learner_outcomes_baseline_check CHECK (baseline_score BETWEEN 0 AND 100),
  CONSTRAINT learner_outcomes_post_check CHECK (post_score IS NULL OR (post_score BETWEEN 0 AND 100))
);
CREATE INDEX learner_outcomes_learner_idx ON public.learner_outcomes (learner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_outcomes TO authenticated;
GRANT ALL ON public.learner_outcomes TO service_role;
ALTER TABLE public.learner_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outcomes_select" ON public.learner_outcomes
  FOR SELECT TO authenticated
  USING (
    org_id = private.current_org_id()
    AND (private.can_view_learner(learner_id) OR private.is_own_learner(learner_id))
  );
CREATE POLICY "outcomes_insert" ON public.learner_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "outcomes_update" ON public.learner_outcomes
  FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.can_manage_learner(learner_id))
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));
CREATE POLICY "outcomes_delete" ON public.learner_outcomes
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_learner_outcomes BEFORE UPDATE ON public.learner_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE VIEW public.rls_policy_audit AS
SELECT tablename, policyname, cmd, (roles)::text AS roles,
       qual AS using_expression, with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = ANY (ARRAY[
    'assessments', 'assessment_sessions', 'assessment_items',
    'learner_assessments', 'learner_evidence',
    'learning_gaps', 'recommendations', 'interventions',
    'tutor_sessions', 'tutor_interactions',
    'learner_outcomes'
  ])
ORDER BY tablename, policyname;

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'eeeeeee1-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sarah.whitfield@eduos.dev', extensions.crypt('Teach#2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah Whitfield"}', now(), now());

INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT id, email, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
FROM auth.users
WHERE email = 'sarah.whitfield@eduos.dev';

INSERT INTO public.user_roles (user_id, role)
VALUES ('eeeeeee1-0000-4000-8000-000000000004', 'educator');

UPDATE public.learners
SET educator_id = 'eeeeeee1-0000-4000-8000-000000000004'
WHERE id = 'ccccccc1-0000-4000-8000-000000000001';

INSERT INTO public.assessment_items
  (id, org_id, created_by, grade, subject, topic, subtopic, difficulty, kind, prompt, options, correct_answer, explanation)
VALUES
  ('ddddddd3-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Equivalence', 1, 'mcq',
   'Which fraction is equivalent to 3/4?',
   '["3/4", "6/8", "4/5", "5/6"]'::jsonb, '6/8',
   'Multiply numerator and denominator by 2: 3/4 = 6/8.'),
  ('ddddddd3-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Equivalence', 2, 'numeric',
   'What number makes this true?  3/7 = ?/28',
   NULL, '12',
   '28 is 4 times 7, so the numerator is 4 times 3 = 12.'),
  ('ddddddd3-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Compare & order', 2, 'mcq',
   'Which fraction is greater: 4/7 or 5/9?',
   '["4/7", "5/9", "They are equal", "Cannot tell"]'::jsonb, '4/7',
   'Common denominator 63: 4/7 = 36/63 and 5/9 = 35/63, so 4/7 is greater.'),
  ('ddddddd3-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Compare & order', 2, 'mcq',
   'Which fraction is closest to 0?',
   '["1/8", "1/4", "2/5", "1/2"]'::jsonb, '1/8',
   'The largest denominator makes the smallest piece: 1/8 is closest to 0.'),
  ('ddddddd3-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Add & subtract', 1, 'mcq',
   'What is 1/3 + 1/6?',
   '["1/2", "2/9", "1/9", "2/6"]'::jsonb, '1/2',
   '1/3 = 2/6, and 2/6 + 1/6 = 3/6 = 1/2.'),
  ('ddddddd3-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Add & subtract', 2, 'numeric',
   'What is 7/8 − 1/2? Write your answer as a decimal (e.g. 0.25).',
   NULL, '0.375',
   '1/2 = 4/8, and 7/8 − 4/8 = 3/8 = 0.375.'),
  ('ddddddd3-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Multiply & divide', 2, 'mcq',
   'What is 3/4 × 2/5?',
   '["3/10", "5/9", "6/9", "1/4"]'::jsonb, '3/10',
   'Multiply across: (3×2)/(4×5) = 6/20 = 3/10.'),
  ('ddddddd3-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Multiply & divide', 3, 'numeric',
   'How many 1/4-cup scoops of rice fill a 2-cup container?',
   NULL, '8',
   '2 ÷ 1/4 = 2 × 4 = 8 scoops.'),
  ('ddddddd3-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Fraction of a quantity', 1, 'mcq',
   'What is 2/5 of 35?',
   '["12", "14", "15", "16"]'::jsonb, '14',
   '1/5 of 35 is 7, so 2/5 of 35 is 2 × 7 = 14.'),
  ('ddddddd3-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Fraction of a quantity', 2, 'numeric',
   'A class has 28 students. 3/7 of them walk to school. How many students walk to school?',
   NULL, '12',
   '1/7 of 28 is 4, so 3/7 of 28 is 12 students.'),
  ('ddddddd3-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Decimals & mixed numbers', 1, 'mcq',
   'Which decimal is equal to 7/20?',
   '["0.35", "0.7", "0.27", "3.5"]'::jsonb, '0.35',
   '7/20 = 35/100 = 0.35.'),
  ('ddddddd3-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004', 6, 'Mathematics', 'Fractions', 'Decimals & mixed numbers', 2, 'mcq',
   'Write 9/4 as a mixed number.',
   '["2 1/4", "2 1/2", "1 3/4", "2 3/4"]'::jsonb, '2 1/4',
   '9/4 = 8/4 + 1/4 = 2 1/4.');

INSERT INTO public.assessments
  (id, org_id, created_by, title, description, subject, topic, grade, kind, status, time_limit_minutes)
VALUES
  ('a55e5502-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'eeeeeee1-0000-4000-8000-000000000004',
   'Fractions Mastery Reassessment',
   'Post-intervention reassessment across all six fraction subtopics. Fresh items — measures mastery lift after intervention.',
   'Mathematics', 'Fractions', 6, 'reassessment', 'published', 20);

INSERT INTO public.assessment_item_map (assessment_id, item_id, sort_order, points)
SELECT 'a55e5502-0000-4000-8000-000000000001', id, sort_order, 1
FROM (
  VALUES
    ('ddddddd3-0000-4000-8000-000000000001'::uuid, 1),
    ('ddddddd3-0000-4000-8000-000000000002'::uuid, 2),
    ('ddddddd3-0000-4000-8000-000000000003'::uuid, 3),
    ('ddddddd3-0000-4000-8000-000000000004'::uuid, 4),
    ('ddddddd3-0000-4000-8000-000000000005'::uuid, 5),
    ('ddddddd3-0000-4000-8000-000000000006'::uuid, 6),
    ('ddddddd3-0000-4000-8000-000000000007'::uuid, 7),
    ('ddddddd3-0000-4000-8000-000000000008'::uuid, 8),
    ('ddddddd3-0000-4000-8000-000000000009'::uuid, 9),
    ('ddddddd3-0000-4000-8000-000000000010'::uuid, 10),
    ('ddddddd3-0000-4000-8000-000000000011'::uuid, 11),
    ('ddddddd3-0000-4000-8000-000000000012'::uuid, 12)
) AS v(id, sort_order);

INSERT INTO public.assessment_items
  (id, org_id, created_by, grade, subject, topic, subtopic, difficulty, kind, prompt, options, correct_answer, explanation)
SELECT replace(id::text, 'ddddddd3', 'ddddddd4')::uuid,
       '22222222-2222-4222-8222-222222222222',
       'eeeeeee2-0000-4000-8000-000000000001',
       grade, subject, topic, subtopic, difficulty, kind, prompt, options, correct_answer, explanation
FROM public.assessment_items
WHERE org_id = '11111111-1111-4111-8111-111111111111'
  AND id::text LIKE 'ddddddd3-%';

INSERT INTO public.assessments
  (id, org_id, created_by, title, description, subject, topic, grade, kind, status, time_limit_minutes)
VALUES
  ('a55e5512-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'eeeeeee2-0000-4000-8000-000000000001',
   'Fractions Mastery Reassessment',
   'Post-intervention reassessment across all six fraction subtopics.',
   'Mathematics', 'Fractions', 6, 'reassessment', 'published', 20);

INSERT INTO public.assessment_item_map (assessment_id, item_id, sort_order, points)
SELECT 'a55e5512-0000-4000-8000-000000000001',
       replace(item_id::text, 'ddddddd3', 'ddddddd4')::uuid,
       sort_order, points
FROM public.assessment_item_map
WHERE assessment_id = 'a55e5502-0000-4000-8000-000000000001';

INSERT INTO public.assessment_sessions
  (id, org_id, assessment_id, learner_id, assigned_by, status, answers, current_position,
   score_pct, correct_count, total_count, result, due, started_at, last_activity_at, submitted_at)
VALUES
  ('5e551002-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'a55e5501-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000003', 'eeeeeee1-0000-4000-8000-000000000001',
   'submitted',
   '{"ddddddd1-0000-4000-8000-000000000001": "4/6", "ddddddd1-0000-4000-8000-000000000002": "6/9", "ddddddd1-0000-4000-8000-000000000003": "10", "ddddddd1-0000-4000-8000-000000000005": "3/5", "ddddddd1-0000-4000-8000-000000000006": "2/3", "ddddddd1-0000-4000-8000-000000000008": "3/4", "ddddddd1-0000-4000-8000-000000000009": "1/2", "ddddddd1-0000-4000-8000-000000000011": "5/9", "ddddddd1-0000-4000-8000-000000000013": "18", "ddddddd1-0000-4000-8000-000000000015": "0.3"}'::jsonb,
   10, 50, 5, 10,
   '[{"item_id": "ddddddd1-0000-4000-8000-000000000001", "subtopic": "Equivalence", "given": "4/6", "correct_answer": "4/6", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000002", "subtopic": "Equivalence", "given": "6/9", "correct_answer": "2/3", "correct": false}, {"item_id": "ddddddd1-0000-4000-8000-000000000003", "subtopic": "Equivalence", "given": "10", "correct_answer": "8", "correct": false}, {"item_id": "ddddddd1-0000-4000-8000-000000000005", "subtopic": "Compare & order", "given": "3/5", "correct_answer": "5/8", "correct": false}, {"item_id": "ddddddd1-0000-4000-8000-000000000006", "subtopic": "Compare & order", "given": "2/3", "correct_answer": "7/8", "correct": false}, {"item_id": "ddddddd1-0000-4000-8000-000000000008", "subtopic": "Add & subtract", "given": "3/4", "correct_answer": "3/4", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000009", "subtopic": "Add & subtract", "given": "1/2", "correct_answer": "1/2", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000011", "subtopic": "Multiply & divide", "given": "5/9", "correct_answer": "3/10", "correct": false}, {"item_id": "ddddddd1-0000-4000-8000-000000000013", "subtopic": "Fraction of a quantity", "given": "18", "correct_answer": "18", "correct": true}, {"item_id": "ddddddd1-0000-4000-8000-000000000015", "subtopic": "Decimals & mixed numbers", "given": "0.3", "correct_answer": "0.3", "correct": true}]'::jsonb,
   (CURRENT_DATE - 12)::date, now() - interval '12 days 30 minutes', now() - interval '12 days', now() - interval '12 days');

INSERT INTO public.learning_gaps
  (id, org_id, learner_id, session_id, subject, topic, subtopic, items_total, items_correct, gap_score_pct, severity, status, resolved_session_id, first_detected_at, detected_at)
VALUES
  ('6a6b0001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000003', '5e551002-0000-4000-8000-000000000001',
   'Mathematics', 'Fractions', 'Compare & order', 2, 0, 0, 'high', 'addressed',
   NULL,
   now() - interval '12 days', now() - interval '12 days');

INSERT INTO public.recommendations
  (id, org_id, learner_id, gap_id, rule_id, priority, title, activity, rationale, status, created_at, updated_at)
VALUES
  ('9ec00003-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000003', '6a6b0001-0000-4000-8000-000000000001',
   'CMP-HIGH', 1,
   'Reteach: comparing fractions',
   'One-on-one reteach of comparing fractions with common denominators and number-line placement, followed by 6 guided comparison problems.',
   'Gap detected: 0/2 correct (0%) on Compare & order; threshold is 70%.',
   'accepted', now() - interval '12 days', now() - interval '11 days');

INSERT INTO public.interventions
  (id, org_id, learner_id, recommendation_id, gap_id, educator_id, title, activity, status, notes, target_date, started_at, completed_at, created_at, updated_at)
VALUES
  ('17a60003-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000003',
   '9ec00003-0000-4000-8000-000000000001', '6a6b0001-0000-4000-8000-000000000001',
   'eeeeeee1-0000-4000-8000-000000000001',
   'Reteach: comparing fractions',
   'One-on-one reteach of comparing fractions with common denominators and number-line placement, followed by 6 guided comparison problems.',
   'completed',
   'Seeded demo loop: reteach completed, student practised with the AI tutor, reassessment passed.',
   (CURRENT_DATE - 3)::date, now() - interval '11 days', now() - interval '4 days',
   now() - interval '11 days', now() - interval '4 days');

INSERT INTO public.tutor_sessions
  (id, org_id, learner_id, intervention_id, student_user_id, subject, topic, concept, objective, mastery_at_start, status, interaction_count, concepts_accessed, last_activity_at, created_at, updated_at)
VALUES
  ('c0ffee01-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000003', '17a60003-0000-4000-8000-000000000001', 'bbbbbbb1-0000-4000-8000-000000000003',
   'Mathematics', 'Fractions', 'Compare & order',
   'One-on-one reteach of comparing fractions with common denominators and number-line placement, followed by 6 guided comparison problems.',
   82, 'ended', 5, '{"Compare & order"}',
   now() - interval '5 days', now() - interval '6 days', now() - interval '5 days');

INSERT INTO public.tutor_interactions
  (id, org_id, session_id, learner_id, student_user_id, kind, request_text, response_text, ai_used, practice_correct, created_at)
VALUES
  ('c0ffee11-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'c0ffee01-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000003', 'bbbbbbb1-0000-4000-8000-000000000003',
   'explain', NULL, 'To compare fractions, give them the same denominator first. 3/5 becomes 24/40 and 5/8 becomes 25/40 — now you can see which is bigger.', true, NULL, now() - interval '6 days'),
  ('c0ffee11-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'c0ffee01-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000003', 'bbbbbbb1-0000-4000-8000-000000000003',
   'hint', 'Which is bigger, 2/3 or 3/5?', 'Think about fifteenths: how many fifteenths is 2/3? How many is 3/5?', true, NULL, now() - interval '6 days 1 minute'),
  ('c0ffee11-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'c0ffee01-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000003', 'bbbbbbb1-0000-4000-8000-000000000003',
   'practice_question', NULL, 'Which is greater: 5/6 or 7/9?', true, NULL, now() - interval '5 days 2 minutes'),
  ('c0ffee11-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'c0ffee01-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000003', 'bbbbbbb1-0000-4000-8000-000000000003',
   'practice_answer', '5/6', 'Correct! 5/6 = 15/18 and 7/9 = 14/18, so 5/6 is greater.', true, true, now() - interval '5 days 1 minute'),
  ('c0ffee11-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'c0ffee01-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000003', 'bbbbbbb1-0000-4000-8000-000000000003',
   'practice_answer', '7/8', 'Correct! 7/8 is only 1/8 away from 1, closer than 5/6.', true, true, now() - interval '5 days');

INSERT INTO public.assessment_sessions
  (id, org_id, assessment_id, learner_id, assigned_by, intervention_id, status, answers, current_position,
   score_pct, correct_count, total_count, result, due, started_at, last_activity_at, submitted_at)
VALUES
  ('5e551002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'a55e5502-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000003', 'eeeeeee1-0000-4000-8000-000000000001',
   '17a60003-0000-4000-8000-000000000001',
   'submitted',
   '{"ddddddd3-0000-4000-8000-000000000001": "6/8", "ddddddd3-0000-4000-8000-000000000002": "12", "ddddddd3-0000-4000-8000-000000000003": "4/7", "ddddddd3-0000-4000-8000-000000000004": "1/8", "ddddddd3-0000-4000-8000-000000000005": "1/2", "ddddddd3-0000-4000-8000-000000000006": "0.25", "ddddddd3-0000-4000-8000-000000000007": "3/10", "ddddddd3-0000-4000-8000-000000000008": "8", "ddddddd3-0000-4000-8000-000000000009": "14", "ddddddd3-0000-4000-8000-000000000010": "12", "ddddddd3-0000-4000-8000-000000000011": "0.35", "ddddddd3-0000-4000-8000-000000000012": "2 1/2"}'::jsonb,
   12, 83, 10, 12,
   '[{"item_id": "ddddddd3-0000-4000-8000-000000000001", "subtopic": "Equivalence", "given": "6/8", "correct_answer": "6/8", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000002", "subtopic": "Equivalence", "given": "12", "correct_answer": "12", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000003", "subtopic": "Compare & order", "given": "4/7", "correct_answer": "4/7", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000004", "subtopic": "Compare & order", "given": "1/8", "correct_answer": "1/8", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000005", "subtopic": "Add & subtract", "given": "1/2", "correct_answer": "1/2", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000006", "subtopic": "Add & subtract", "given": "0.25", "correct_answer": "0.375", "correct": false}, {"item_id": "ddddddd3-0000-4000-8000-000000000007", "subtopic": "Multiply & divide", "given": "3/10", "correct_answer": "3/10", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000008", "subtopic": "Multiply & divide", "given": "8", "correct_answer": "8", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000009", "subtopic": "Fraction of a quantity", "given": "14", "correct_answer": "14", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000010", "subtopic": "Fraction of a quantity", "given": "12", "correct_answer": "12", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000011", "subtopic": "Decimals & mixed numbers", "given": "0.35", "correct_answer": "0.35", "correct": true}, {"item_id": "ddddddd3-0000-4000-8000-000000000012", "subtopic": "Decimals & mixed numbers", "given": "2 1/2", "correct_answer": "2 1/4", "correct": false}]'::jsonb,
   (CURRENT_DATE - 1)::date, now() - interval '2 days 25 minutes', now() - interval '2 days', now() - interval '2 days');

UPDATE public.learning_gaps
SET resolved_session_id = '5e551002-0000-4000-8000-000000000002'
WHERE id = '6a6b0001-0000-4000-8000-000000000001';

INSERT INTO public.learner_outcomes
  (id, org_id, learner_id, intervention_id, gap_id, subject, topic, subtopic,
   baseline_session_id, baseline_score, reassessment_session_id, post_score,
   mastery_lift, confidence, status, completed_at, created_at, updated_at)
VALUES
  ('0a7c0de2-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000003', '17a60003-0000-4000-8000-000000000001', '6a6b0001-0000-4000-8000-000000000001',
   'Mathematics', 'Fractions', 'Compare & order',
   '5e551002-0000-4000-8000-000000000001', 50,
   '5e551002-0000-4000-8000-000000000002', 83,
   33, 80, 'improvement', now() - interval '2 days', now() - interval '4 days', now() - interval '2 days');

INSERT INTO public.learner_assessments (learner_id, title, subject, taken_on, score, status)
VALUES
  ('ccccccc1-0000-4000-8000-000000000003', 'Fractions Foundations Diagnostic', 'Mathematics', (CURRENT_DATE - 12)::date, 50, 'completed'),
  ('ccccccc1-0000-4000-8000-000000000003', 'Fractions Mastery Reassessment', 'Mathematics', (CURRENT_DATE - 2)::date, 83, 'completed');

INSERT INTO public.learner_evidence (learner_id, title, kind, note, recorded_on)
VALUES
  ('ccccccc1-0000-4000-8000-000000000003', 'Fractions Foundations Diagnostic — auto-scored', 'assessment',
   'Scored 50% (5/10). Strong: Add & subtract, Fraction of a quantity, Decimals & mixed numbers. Needs work: Equivalence, Compare & order, Multiply & divide.',
   (CURRENT_DATE - 12)::date),
  ('ccccccc1-0000-4000-8000-000000000003', 'Fractions Mastery Reassessment — outcome', 'assessment',
   'Reassessment scored 83% (10/12) after intervention on Compare & order. Baseline 50% -> post 83% = +33 points mastery lift. Confidence 80/100. Outcome: improvement.',
   (CURRENT_DATE - 2)::date);

INSERT INTO public.mastery_history (learner_id, recorded_on, score)
VALUES ('ccccccc1-0000-4000-8000-000000000003', (CURRENT_DATE - 2)::date, 83);

UPDATE public.learners
SET mastery_score = 83, mastery_lift = 33
WHERE id = 'ccccccc1-0000-4000-8000-000000000003';

UPDATE public.interventions
SET status = 'completed',
    educator_id = 'eeeeeee1-0000-4000-8000-000000000004',
    started_at = COALESCE(started_at, now() - interval '3 days'),
    completed_at = now() - interval '1 day'
WHERE id = 'ef01c9c9-fb42-4626-acba-23f4765f329a';

INSERT INTO public.learner_outcomes
  (id, org_id, learner_id, intervention_id, gap_id, subject, topic, subtopic,
   baseline_session_id, baseline_score, status)
VALUES
  ('0a7c0de1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'ccccccc1-0000-4000-8000-000000000001', 'ef01c9c9-fb42-4626-acba-23f4765f329a', 'a989f24d-ae9b-4b50-8361-03533c4f7be0',
   'Mathematics', 'Fractions', 'Multiply & divide',
   '5e551001-0000-4000-8000-000000000001', 30, 'pending');

INSERT INTO public.assessment_sessions
  (id, org_id, assessment_id, learner_id, assigned_by, intervention_id, status, due)
VALUES
  ('5e551003-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'a55e5502-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000001', 'eeeeeee1-0000-4000-8000-000000000004',
   'ef01c9c9-fb42-4626-acba-23f4765f329a',
   'assigned', (CURRENT_DATE + 3)::date);