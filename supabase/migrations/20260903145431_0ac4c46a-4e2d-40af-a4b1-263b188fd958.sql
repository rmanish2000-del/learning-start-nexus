-- Pilot readiness: only current-year CBSE Class 10 papers built from
-- approved AND expert-verified items may remain published.
UPDATE public.assessments a
SET status = 'archived'
WHERE a.status = 'published'
  AND (
    -- out-of-scope legacy/demo content
    a.grade IS DISTINCT FROM 10
    OR a.book_id IS NULL
    OR EXISTS (SELECT 1 FROM public.books b WHERE b.id = a.book_id AND (b.archived_at IS NOT NULL OR b.is_demo))
    -- or contains any item that is not approved+verified
    OR EXISTS (
      SELECT 1 FROM public.assessment_question_map m
      JOIN public.question_bank q ON q.id = m.question_id
      WHERE m.assessment_id = a.id
        AND (q.status <> 'approved' OR q.verification_state <> 'verified')
    )
    -- or has no items at all
    OR NOT EXISTS (SELECT 1 FROM public.assessment_question_map m WHERE m.assessment_id = a.id)
  );