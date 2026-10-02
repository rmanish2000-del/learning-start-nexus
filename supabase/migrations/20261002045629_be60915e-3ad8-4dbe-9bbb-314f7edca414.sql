-- Net effect kept from the 2026-10-02 founder draft (its is_founder() function and
-- policies were removed later the same day; PR #5 owns pilot_leads policies).
ALTER TABLE public.pilot_leads ADD COLUMN IF NOT EXISTS owner_notified_at timestamptz;
ALTER TABLE public.pilot_leads ADD COLUMN IF NOT EXISTS owner_notification_error text;

CREATE TABLE IF NOT EXISTS public.founder_access_denials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  operation text NOT NULL CHECK (length(operation) <= 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.founder_access_denials TO service_role;
ALTER TABLE public.founder_access_denials ENABLE ROW LEVEL SECURITY;
