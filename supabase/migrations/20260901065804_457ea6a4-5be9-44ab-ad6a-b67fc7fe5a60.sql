ALTER TABLE public.guardian_consents DROP CONSTRAINT guardian_consents_action_check;
ALTER TABLE public.guardian_consents ADD CONSTRAINT guardian_consents_action_check
  CHECK (action = ANY (ARRAY['granted'::text, 'withdrawn'::text, 'declined'::text]));