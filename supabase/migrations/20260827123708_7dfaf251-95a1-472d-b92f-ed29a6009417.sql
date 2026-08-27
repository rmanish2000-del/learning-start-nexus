CREATE TABLE public.free_learning_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id),
  unit_id uuid NOT NULL REFERENCES public.curriculum_units(id),
  unit_title text NOT NULL,
  question_ids uuid[] NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status = ANY (ARRAY['in_progress'::text, 'submitted'::text])),
  score_pct integer,
  correct_count integer,
  total_count integer,
  result jsonb,
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX free_learning_checks_learner_subject_key
  ON public.free_learning_checks (learner_id, subject);

GRANT SELECT ON public.free_learning_checks TO authenticated;
GRANT ALL ON public.free_learning_checks TO service_role;

ALTER TABLE public.free_learning_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents read their own free checks"
  ON public.free_learning_checks FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());

CREATE POLICY "Learners read their own free checks"
  ON public.free_learning_checks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = free_learning_checks.learner_id
      AND l.student_user_id = auth.uid()
  ));

CREATE TRIGGER free_learning_checks_touch
  BEFORE UPDATE ON public.free_learning_checks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();