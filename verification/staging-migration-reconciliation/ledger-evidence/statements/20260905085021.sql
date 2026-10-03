REVOKE ALL ON public.feedback_submissions FROM anon, authenticated;
REVOKE ALL ON public.guidance_events FROM anon, authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;
GRANT ALL ON public.guidance_events TO service_role;