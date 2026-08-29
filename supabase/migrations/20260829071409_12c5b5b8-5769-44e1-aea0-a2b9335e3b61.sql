UPDATE public.assessments a
SET title = regexp_replace(a.title, ' — Parent Diagnostic \(.*\)$', ' — Parent Diagnostic')
WHERE a.title LIKE '%— Parent Diagnostic (%';