REVOKE ALL ON public.question_verifications FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON public.question_verifications FROM authenticated;
GRANT SELECT, INSERT ON public.question_verifications TO authenticated;
GRANT ALL ON public.question_verifications TO service_role;