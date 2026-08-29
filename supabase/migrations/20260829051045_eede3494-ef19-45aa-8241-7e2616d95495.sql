-- Retire pilot-only Class 10 Mathematics content from the active 2026-27 scope.
-- Reversible: no rows are deleted, learner evidence is untouched.
UPDATE public.books
SET status = 'archived',
    archived_at = COALESCE(archived_at, now())
WHERE id = 'ad8318f3-c41d-4846-8173-c84e5cde20ad'
  AND title = 'CBSE Class 10 Mathematics — Meridian Pilot';

-- Pilot-unit questions must not be selectable in current-session diagnostics.
UPDATE public.question_bank q
SET status = 'retired',
    updated_at = now()
FROM public.books b
WHERE b.id = q.book_id
  AND b.id = 'ad8318f3-c41d-4846-8173-c84e5cde20ad'
  AND q.status <> 'retired';