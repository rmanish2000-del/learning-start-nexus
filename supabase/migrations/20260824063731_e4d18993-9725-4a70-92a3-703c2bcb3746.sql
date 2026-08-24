-- Sprint 6C: Assessment Blueprint Engine

-- 1. Outcome catalog -------------------------------------------------------
CREATE TABLE public.assessment_outcomes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  book_id uuid not null references public.books(id) on delete cascade,
  unit_id uuid not null references public.curriculum_units(id) on delete cascade,
  code text not null,
  title text not null,
  category text not null,
  bloom_level text not null,
  difficulty integer not null default 1,
  diagnostic_weight integer not null default 0,
  question_types jsonb not null default '[]'::jsonb,
  intervention_strategy text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_outcomes TO authenticated;
GRANT ALL ON public.assessment_outcomes TO service_role;
ALTER TABLE public.assessment_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_outcomes_select" ON public.assessment_outcomes FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));
CREATE POLICY "assessment_outcomes_insert" ON public.assessment_outcomes FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "assessment_outcomes_update" ON public.assessment_outcomes FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff())
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "assessment_outcomes_delete" ON public.assessment_outcomes FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff());

-- 2. Curriculum mapping: curriculum outcome -> assessment outcome ----------
CREATE TABLE public.outcome_map (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  book_id uuid not null references public.books(id) on delete cascade,
  curriculum_outcome_id uuid not null references public.curriculum_outcomes(id) on delete cascade,
  assessment_outcome_id uuid not null references public.assessment_outcomes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (curriculum_outcome_id, assessment_outcome_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outcome_map TO authenticated;
GRANT ALL ON public.outcome_map TO service_role;
ALTER TABLE public.outcome_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outcome_map_select" ON public.outcome_map FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));
CREATE POLICY "outcome_map_insert" ON public.outcome_map FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "outcome_map_update" ON public.outcome_map FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff())
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "outcome_map_delete" ON public.outcome_map FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff());

-- 3. Intervention mapping: outcome -> failure pattern -> intervention ------
CREATE TABLE public.intervention_map (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  book_id uuid not null references public.books(id) on delete cascade,
  assessment_outcome_id uuid not null references public.assessment_outcomes(id) on delete cascade,
  failure_pattern text not null,
  recommended_intervention text not null,
  priority integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intervention_map TO authenticated;
GRANT ALL ON public.intervention_map TO service_role;
ALTER TABLE public.intervention_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intervention_map_select" ON public.intervention_map FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));
CREATE POLICY "intervention_map_insert" ON public.intervention_map FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "intervention_map_update" ON public.intervention_map FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff())
  WITH CHECK (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "intervention_map_delete" ON public.intervention_map FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff());

-- 4. Mastery framework (org-configurable score bands) ----------------------
CREATE TABLE public.mastery_levels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  label text not null,
  min_score integer not null,
  max_score integer not null,
  color text not null default 'primary',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastery_levels TO authenticated;
GRANT ALL ON public.mastery_levels TO service_role;
ALTER TABLE public.mastery_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mastery_levels_select" ON public.mastery_levels FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));
CREATE POLICY "mastery_levels_insert" ON public.mastery_levels FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "mastery_levels_update" ON public.mastery_levels FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "mastery_levels_delete" ON public.mastery_levels FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

-- updated_at triggers -------------------------------------------------------
CREATE TRIGGER touch_assessment_outcomes BEFORE UPDATE ON public.assessment_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_intervention_map BEFORE UPDATE ON public.intervention_map
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_mastery_levels BEFORE UPDATE ON public.mastery_levels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Extend the RLS policy audit view with the new tables -------------------
CREATE OR REPLACE VIEW public.rls_policy_audit AS
SELECT tablename, policyname, cmd, roles::text AS roles, qual AS using_expression, with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'::name AND tablename = ANY (ARRAY[
  'assessments'::name, 'assessment_sessions'::name, 'assessment_items'::name,
  'learner_assessments'::name, 'learner_evidence'::name,
  'books'::name, 'curriculum_units'::name, 'curriculum_chapters'::name,
  'curriculum_topics'::name, 'curriculum_outcomes'::name,
  'concept_nodes'::name, 'concept_edges'::name, 'book_events'::name,
  'assessment_outcomes'::name, 'outcome_map'::name, 'intervention_map'::name,
  'mastery_levels'::name
])
ORDER BY tablename, policyname;

-- 6. Seed: mastery bands for Brightpath Learning ----------------------------
INSERT INTO public.mastery_levels (id, org_id, label, min_score, max_score, color, sort_order) VALUES
  ('66530000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Beginning', 0, 49, 'destructive', 1),
  ('66530000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Developing', 50, 69, 'amber', 2),
  ('66530000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Proficient', 70, 84, 'primary', 3),
  ('66530000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Advanced', 85, 100, 'emerald', 4);

-- 7. Seed: assessment outcome catalog for the pilot book (18 outcomes) ------
INSERT INTO public.assessment_outcomes
  (id, org_id, book_id, unit_id, code, title, category, bloom_level, difficulty, diagnostic_weight, question_types, intervention_strategy) VALUES
  ('66500000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000001',
   'LO_GK3_NAT_01', 'National symbols and identity of India', 'National & Regional Awareness', 'Remember', 2, 34,
   '["mcq","true_false","match"]', 'Flashcard drills with spaced repetition; symbol-to-picture matching cards.'),
  ('66500000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000001',
   'LO_GK3_NAT_02', 'States, capitals and renamed cities', 'National & Regional Awareness', 'Remember', 3, 33,
   '["mcq","fill_blank","map_label"]', 'Map-label practice with mnemonic recall of state-capital pairs.'),
  ('66500000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000001',
   'LO_GK3_NAT_03', 'Landmarks, monuments and cultural heritage', 'National & Regional Awareness', 'Understand', 3, 33,
   '["mcq","image_match","short_answer"]', 'Visual gallery walk followed by monument-to-city matching.'),
  ('66500000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000002',
   'LO_GK3_GLB_01', 'Countries, capitals, currencies and languages', 'Global Awareness', 'Remember', 3, 34,
   '["mcq","match","fill_blank"]', 'Country-profile cards; currency and capital matching games.'),
  ('66500000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000002',
   'LO_GK3_GLB_02', 'World landmarks and geographic features', 'Global Awareness', 'Understand', 3, 33,
   '["mcq","image_match","true_false"]', 'Virtual tour worksheets mapping landmarks to their countries.'),
  ('66500000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000002',
   'LO_GK3_APT_01', 'Shape and number pattern reasoning', 'Aptitude & Reasoning', 'Analyze', 4, 33,
   '["mcq","sequence","fill_blank"]', 'Guided pattern ladders moving from two-step to three-step progressions.'),
  ('66500000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000003',
   'LO_GK3_ENV_01', 'Plant life, trees and their uses', 'Nature & Environment', 'Understand', 2, 34,
   '["mcq","match"]', 'Sort-and-classify card games linking plants to their uses.'),
  ('66500000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000003',
   'LO_GK3_ENV_02', 'Animals, habitats and adaptation', 'Nature & Environment', 'Understand', 3, 33,
   '["mcq","true_false","match"]', 'Habitat diorama activity pairing animals with their adaptations.'),
  ('66500000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000003',
   'LO_GK3_ENV_03', 'Conservation and caring for nature', 'Nature & Environment', 'Apply', 3, 33,
   '["mcq","short_answer"]', 'Scenario cards: choose the action that best helps the environment.'),
  ('66500000-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000004',
   'LO_GK3_SCI_01', 'Everyday science and famous inventions', 'Scientific Literacy', 'Remember', 3, 34,
   '["mcq","match"]', 'Invention timeline cards matched to inventors and their uses.'),
  ('66500000-0000-4000-8000-00000000000b', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000004',
   'LO_GK3_SCI_02', 'Space, planets and the solar system', 'Scientific Literacy', 'Understand', 3, 33,
   '["mcq","ordering","fill_blank"]', 'Planet-order songs and a scaled solar-system floor model.'),
  ('66500000-0000-4000-8000-00000000000c', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000004',
   'LO_GK3_SCI_03', 'Technology, computers and the digital world', 'Scientific Literacy', 'Apply', 4, 33,
   '["mcq","short_answer"]', 'Parts-of-a-computer labelling and safe-online scenario sorting.'),
  ('66500000-0000-4000-8000-00000000000d', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000005',
   'LO_GK3_SPT_01', 'Sports, games and famous athletes', 'Sports & Entertainment', 'Remember', 2, 40,
   '["mcq","match"]', 'Athlete-profile cards matched to sports and achievements.'),
  ('66500000-0000-4000-8000-00000000000e', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000005',
   'LO_GK3_SPT_02', 'Music, dance and art forms', 'Sports & Entertainment', 'Understand', 3, 30,
   '["mcq","image_match"]', 'Listen-and-identify clips for instruments and classical dance forms.'),
  ('66500000-0000-4000-8000-00000000000f', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000005',
   'LO_GK3_SPT_03', 'Movies, media and entertainment', 'Sports & Entertainment', 'Understand', 2, 30,
   '["mcq","true_false"]', 'Genre-sorting quiz with picture clues from famous films.'),
  ('66500000-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000006',
   'LO_GK3_LIT_01', 'Vocabulary, word origins and expressions', 'Language & Literature', 'Apply', 3, 34,
   '["mcq","fill_blank"]', 'Word-root trees and cloze passages using the new vocabulary.'),
  ('66500000-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000006',
   'LO_GK3_LIT_02', 'Books, authors and literary characters', 'Language & Literature', 'Remember', 3, 33,
   '["mcq","match"]', 'Bookshelf matching: characters, authors and their books.'),
  ('66500000-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000006',
   'LO_GK3_LIT_03', 'Proverbs, idioms and grammar in context', 'Language & Literature', 'Analyze', 4, 33,
   '["mcq","short_answer"]', 'Idiom charades followed by meaning-in-context sentence work.');

-- 8. Seed: map every curriculum learning outcome to an assessment outcome ---
-- Round-robin within each unit so all 55 imported outcomes are covered and
-- the mapping is deterministic (same curriculum -> same mapping).
INSERT INTO public.outcome_map (org_id, book_id, curriculum_outcome_id, assessment_outcome_id)
WITH co AS (
  SELECT o.id, u.id AS unit_id,
         row_number() OVER (PARTITION BY u.id ORDER BY c.position, t.position, o.position) - 1 AS rn
  FROM public.curriculum_outcomes o
  JOIN public.curriculum_topics t ON t.id = o.topic_id
  JOIN public.curriculum_chapters c ON c.id = t.chapter_id
  JOIN public.curriculum_units u ON u.id = c.unit_id
  WHERE o.book_id = '66000000-0000-4000-8000-000000000003'
),
ao AS (
  SELECT id, unit_id, org_id, book_id,
         row_number() OVER (PARTITION BY unit_id ORDER BY code) - 1 AS rn,
         count(*) OVER (PARTITION BY unit_id) AS n
  FROM public.assessment_outcomes
  WHERE book_id = '66000000-0000-4000-8000-000000000003'
)
SELECT ao.org_id, ao.book_id, co.id, ao.id
FROM co
JOIN ao ON ao.unit_id = co.unit_id AND ao.rn = co.rn % ao.n;

-- 9. Seed: intervention mappings (failure pattern -> intervention) ----------
INSERT INTO public.intervention_map (org_id, book_id, assessment_outcome_id, failure_pattern, recommended_intervention, priority)
SELECT ao.org_id, ao.book_id, ao.id, v.failure_pattern, v.intervention, v.priority
FROM (VALUES
  ('LO_GK3_NAT_01', 'Confuses national symbols (bird, animal, flower, tree)', 'Flashcard drills with spaced repetition and symbol-to-picture matching.', 1),
  ('LO_GK3_NAT_01', 'Cannot name the national anthem, song or their authors', 'Listen-and-echo anthem practice with author profile cards.', 2),
  ('LO_GK3_NAT_02', 'Mixes up states and their capitals', 'Map-label practice with mnemonic recall of state-capital pairs.', 1),
  ('LO_GK3_NAT_02', 'Unaware of renamed cities (old vs new names)', 'Then-and-now timeline cards for renamed cities.', 2),
  ('LO_GK3_NAT_03', 'Cannot place monuments in the correct city or state', 'Visual gallery walk followed by monument-to-city matching.', 1),
  ('LO_GK3_GLB_01', 'Mismatches countries, capitals and currencies', 'Country-profile cards; currency and capital matching games.', 1),
  ('LO_GK3_GLB_01', 'Confuses country nicknames and sobriquets', 'Sobriquet bingo with clue-based recall rounds.', 2),
  ('LO_GK3_GLB_02', 'Cannot locate world landmarks on a map', 'Virtual tour worksheets mapping landmarks to their countries.', 1),
  ('LO_GK3_APT_01', 'Cannot extend shape or number sequences', 'Guided pattern ladders from two-step to three-step progressions.', 1),
  ('LO_GK3_APT_01', 'Guesses the next term without identifying the rule', 'Think-aloud protocol: state the rule before answering.', 2),
  ('LO_GK3_ENV_01', 'Cannot group plants by type or use', 'Sort-and-classify card games linking plants to their uses.', 1),
  ('LO_GK3_ENV_02', 'Mismatches animals to habitats or adaptations', 'Habitat diorama activity pairing animals with their adaptations.', 1),
  ('LO_GK3_ENV_03', 'Cannot choose environment-friendly actions in scenarios', 'Scenario cards: choose the action that best helps the environment.', 1),
  ('LO_GK3_SCI_01', 'Cannot match inventions to inventors', 'Invention timeline cards matched to inventors and their uses.', 1),
  ('LO_GK3_SCI_02', 'Orders the planets incorrectly', 'Planet-order songs and a scaled solar-system floor model.', 1),
  ('LO_GK3_SCI_02', 'Confuses planets, stars and satellites', 'Compare-and-contrast chart of planets vs stars vs satellites.', 2),
  ('LO_GK3_SCI_03', 'Cannot identify basic computer parts or safe online behaviour', 'Parts-of-a-computer labelling and safe-online scenario sorting.', 1),
  ('LO_GK3_SPT_01', 'Mismatches athletes to their sports', 'Athlete-profile cards matched to sports and achievements.', 1),
  ('LO_GK3_SPT_02', 'Cannot identify instruments or classical dance forms', 'Listen-and-identify clips for instruments and dance forms.', 1),
  ('LO_GK3_SPT_03', 'Cannot sort films or shows by genre', 'Genre-sorting quiz with picture clues from famous films.', 1),
  ('LO_GK3_LIT_01', 'Limited vocabulary; cannot infer word meaning from context', 'Word-root trees and cloze passages using the new vocabulary.', 1),
  ('LO_GK3_LIT_02', 'Mismatches books, authors and characters', 'Bookshelf matching: characters, authors and their books.', 1),
  ('LO_GK3_LIT_03', 'Interprets proverbs and idioms literally', 'Idiom charades followed by meaning-in-context sentence work.', 1),
  ('LO_GK3_LIT_03', 'Cannot apply grammar rules in sentences', 'Sentence doctor activity: find and fix the grammar slip.', 2)
) AS v(code, failure_pattern, intervention, priority)
JOIN public.assessment_outcomes ao
  ON ao.code = v.code AND ao.book_id = '66000000-0000-4000-8000-000000000003';