ALTER TABLE public.guardian_consents
  ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'granted';

ALTER TABLE public.guardian_consents
  DROP CONSTRAINT IF EXISTS guardian_consents_action_check;

ALTER TABLE public.guardian_consents
  ADD CONSTRAINT guardian_consents_action_check CHECK (action IN ('granted', 'withdrawn'));