REVOKE ALL ON public.automated_review_imports FROM anon;
REVOKE ALL ON public.automated_provisional_outcomes FROM anon;
REVOKE ALL ON public.automated_review_rollback_events FROM anon;
REVOKE ALL ON public.automated_provisional_question_outcomes FROM anon;
REVOKE ALL ON public.internal_automated_provisional_pool FROM anon;

REVOKE ALL ON public.automated_review_imports FROM authenticated;
REVOKE ALL ON public.automated_provisional_outcomes FROM authenticated;
REVOKE ALL ON public.automated_review_rollback_events FROM authenticated;
REVOKE ALL ON public.automated_provisional_question_outcomes FROM authenticated;
REVOKE ALL ON public.internal_automated_provisional_pool FROM authenticated;

GRANT SELECT ON public.automated_review_imports TO authenticated;
GRANT SELECT ON public.automated_provisional_outcomes TO authenticated;
GRANT SELECT ON public.automated_review_rollback_events TO authenticated;
GRANT SELECT ON public.automated_provisional_question_outcomes TO authenticated;
GRANT SELECT ON public.internal_automated_provisional_pool TO authenticated;

GRANT ALL ON public.automated_review_imports TO service_role;
GRANT ALL ON public.automated_provisional_outcomes TO service_role;
GRANT ALL ON public.automated_review_rollback_events TO service_role;
GRANT ALL ON public.automated_provisional_question_outcomes TO service_role;
GRANT ALL ON public.internal_automated_provisional_pool TO service_role;