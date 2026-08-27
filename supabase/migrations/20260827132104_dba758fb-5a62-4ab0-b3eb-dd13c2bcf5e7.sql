
DO $$ BEGIN
  CREATE TYPE public.learner_mode AS ENUM ('direct_parent', 'centre_managed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.learners
  ADD COLUMN IF NOT EXISTS learner_mode public.learner_mode NOT NULL DEFAULT 'centre_managed';

-- Backfill: parent-owned commercial learners with no educator and no genuine
-- centre enrollment become DIRECT_PARENT. Demo/centre-created rows are untouched.
UPDATE public.learners l
SET learner_mode = 'direct_parent'
WHERE l.is_demo = false
  AND l.educator_id IS NULL
  AND (
    EXISTS (SELECT 1 FROM public.parent_learner_links p WHERE p.learner_id = l.id)
    OR l.handle LIKE 'pd-%'
  );

CREATE TABLE IF NOT EXISTS public.learner_study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  source_session_id uuid REFERENCES public.assessment_sessions(id) ON DELETE SET NULL,
  mode public.learner_mode NOT NULL,
  rules_version text NOT NULL DEFAULT 'gap-closure-v1',
  status text NOT NULL DEFAULT 'active',
  intervention_ids uuid[] NOT NULL DEFAULT '{}',
  gap_ids uuid[] NOT NULL DEFAULT '{}',
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS learner_study_plans_learner_session_uidx
  ON public.learner_study_plans (learner_id, source_session_id);

GRANT SELECT ON public.learner_study_plans TO authenticated;
GRANT ALL ON public.learner_study_plans TO service_role;

ALTER TABLE public.learner_study_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study plans readable by authorised viewers" ON public.learner_study_plans;
CREATE POLICY "study plans readable by authorised viewers"
ON public.learner_study_plans
FOR SELECT
TO authenticated
USING (
  private.can_view_learner(learner_id)
  OR private.is_parent_of(learner_id)
  OR EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = learner_study_plans.learner_id AND l.student_user_id = auth.uid()
  )
);
