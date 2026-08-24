-- Sprint 6E: curriculum-driven assessment builder.
-- 1) Link assessments to the curriculum tree (nullable: Sprint 2 assessments remain valid).
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id),
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.curriculum_units(id);

-- 2) Question map: which question_bank questions make up a built assessment.
CREATE TABLE public.assessment_question_map (
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  sort_order integer NOT NULL,
  points integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_id, question_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_question_map TO authenticated;
GRANT ALL ON public.assessment_question_map TO service_role;

ALTER TABLE public.assessment_question_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff and reviewers read question maps in their org"
ON public.assessment_question_map FOR SELECT TO authenticated
USING (
  (private.is_staff() OR private.is_reviewer())
  AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND a.org_id = private.current_org_id()
  )
);

CREATE POLICY "staff insert question maps in their org"
ON public.assessment_question_map FOR INSERT TO authenticated
WITH CHECK (
  private.is_staff()
  AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND a.org_id = private.current_org_id()
  )
);

CREATE POLICY "staff update question maps in their org"
ON public.assessment_question_map FOR UPDATE TO authenticated
USING (
  private.is_staff()
  AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND a.org_id = private.current_org_id()
  )
)
WITH CHECK (
  private.is_staff()
  AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND a.org_id = private.current_org_id()
  )
);

CREATE POLICY "staff delete question maps in their org"
ON public.assessment_question_map FOR DELETE TO authenticated
USING (
  private.is_staff()
  AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND a.org_id = private.current_org_id()
  )
);

-- 3) Demo seed: one curriculum-built diagnostic for the pilot book's My Country unit.
INSERT INTO public.assessments (
  id, org_id, created_by, title, description, subject, topic, grade,
  kind, status, time_limit_minutes, book_id, unit_id
)
SELECT
  'bb000001-0000-4000-8000-000000000001',
  b.org_id,
  'aaaaaaa1-0000-4000-8000-000000000001',
  'My Country — Diagnostic Check',
  'Sprint 6E demo: curriculum-built diagnostic for the My Country unit, assembled from approved question-bank items.',
  b.subject,
  'My Country',
  b.grade,
  'diagnostic',
  'published',
  15,
  b.id,
  '66100000-0000-4000-8000-000000000001'
FROM public.books b
WHERE b.id = '66000000-0000-4000-8000-000000000003';

INSERT INTO public.assessment_question_map (assessment_id, question_id, sort_order, points)
SELECT
  'bb000001-0000-4000-8000-000000000001',
  q.id,
  ROW_NUMBER() OVER (ORDER BY q.difficulty, q.created_at)::int,
  1
FROM public.question_bank q
JOIN public.assessment_outcomes ao ON ao.id = q.outcome_id
WHERE ao.code = 'LO_GK3_NAT_01'
  AND q.book_id = '66000000-0000-4000-8000-000000000003'
  AND q.status = 'approved'
ORDER BY q.difficulty, q.created_at;