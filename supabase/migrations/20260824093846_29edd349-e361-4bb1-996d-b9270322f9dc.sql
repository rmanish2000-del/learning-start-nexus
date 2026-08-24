CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES public.assessment_outcomes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('mcq', 'true_false', 'fill_blank', 'short_answer')),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  prompt TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'retired')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('ai', 'manual')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX question_bank_outcome_idx ON public.question_bank (outcome_id);
CREATE INDEX question_bank_book_idx ON public.question_bank (book_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY question_bank_select ON public.question_bank
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE POLICY question_bank_insert ON public.question_bank
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());

CREATE POLICY question_bank_update ON public.question_bank
  FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff())
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());

CREATE POLICY question_bank_delete ON public.question_bank
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff());

CREATE TRIGGER touch_question_bank BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sprint 6D seed: 12 questions across 4 pilot outcomes (Class 3 GK).
-- Chain: Outcome → Question → Difficulty → Answer Key → Explanation.
INSERT INTO public.question_bank
  (id, org_id, book_id, outcome_id, kind, difficulty, prompt, options, correct_answer, explanation, status, source)
VALUES
  -- LO_GK3_NAT_01 · National symbols and identity of India
  ('66600000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000001',
   'mcq', 1, 'What is the national animal of India?',
   '["Bengal Tiger", "Asiatic Lion", "Indian Elephant", "Peacock"]', 'Bengal Tiger',
   'The Bengal Tiger is the national animal of India. It stands for strength, agility and grace.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000001',
   'mcq', 2, 'Which bird is the national bird of India?',
   '["Peacock", "Parrot", "Sparrow", "Eagle"]', 'Peacock',
   'The Indian Peacock is the national bird. Its colourful feathers make it easy to recognise.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000001',
   'true_false', 1, 'The national flag of India has four colours.',
   '["True", "False"]', 'False',
   'The flag has three colours — saffron, white and green — with a navy blue Ashoka Chakra (wheel) in the middle.', 'draft', 'manual'),
  -- LO_GK3_GLB_01 · Countries, capitals, currencies and languages
  ('66600000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000004',
   'mcq', 2, 'What is the capital city of Japan?',
   '["Tokyo", "Kyoto", "Osaka", "Beijing"]', 'Tokyo',
   'Tokyo is the capital of Japan. Beijing is the capital of China, and Kyoto and Osaka are other Japanese cities.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000004',
   'fill_blank', 3, 'The currency of the United States of America is the ______.',
   NULL, 'Dollar',
   'The United States uses the US Dollar. Different countries use different currencies — India uses the Rupee.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000004',
   'mcq', 3, 'Paris is the capital of which country?',
   '["France", "Italy", "Spain", "Germany"]', 'France',
   'Paris is the capital of France. Rome is the capital of Italy and Madrid is the capital of Spain.', 'draft', 'manual'),
  -- LO_GK3_ENV_01 · Plant life, trees and their uses
  ('66600000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000007',
   'mcq', 1, 'Which part of a plant makes food using sunlight?',
   '["Leaf", "Root", "Stem", "Flower"]', 'Leaf',
   'Leaves make food for the plant using sunlight, air and water. This process is called photosynthesis.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000007',
   'true_false', 2, 'Trees give us oxygen to breathe.',
   '["True", "False"]', 'True',
   'Trees take in carbon dioxide and release oxygen, which people and animals need to breathe.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000007',
   'short_answer', 3, 'Name one way in which trees help people.',
   NULL, 'Any one of: shade, fruits, wood, oxygen, clean air, homes for birds and animals',
   'Trees help people in many ways — they give shade, fruits, wood and oxygen, clean the air, and provide homes for birds and animals. Accept any one correct use.', 'draft', 'manual'),
  -- LO_GK3_SCI_02 · Space, planets and the solar system
  ('66600000-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-00000000000b',
   'mcq', 2, 'Which planet is known as the Red Planet?',
   '["Mars", "Venus", "Jupiter", "Saturn"]', 'Mars',
   'Mars looks red because its soil contains iron oxide — the same substance that makes rust red.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-00000000000b', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-00000000000b',
   'fill_blank', 3, 'The ______ is the star at the centre of our solar system.',
   NULL, 'Sun',
   'The Sun is a star. All eight planets, including Earth, travel around it.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-00000000000c', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-00000000000b',
   'mcq', 4, 'Which planet is famous for the beautiful rings around it?',
   '["Saturn", "Mercury", "Mars", "Earth"]', 'Saturn',
   'Saturn has wide, bright rings made of ice and rock pieces. Other giant planets have rings too, but Saturn''s are the easiest to see.', 'draft', 'manual');