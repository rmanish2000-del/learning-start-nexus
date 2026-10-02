
CREATE OR REPLACE FUNCTION private.is_founder()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(trim(u.email)) = 'rmanish2000@gmail.com'
      AND u.email_confirmed_at IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION private.is_founder() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_founder() TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can read pilot applications" ON public.pilot_leads;
DROP POLICY IF EXISTS "Admins can update pilot applications" ON public.pilot_leads;
CREATE POLICY "Founder reads pilot applications" ON public.pilot_leads FOR SELECT TO authenticated USING (private.is_founder());
CREATE POLICY "Founder updates pilot applications" ON public.pilot_leads FOR UPDATE TO authenticated USING (private.is_founder()) WITH CHECK (private.is_founder());

ALTER TABLE public.pilot_leads ADD COLUMN IF NOT EXISTS owner_notified_at timestamptz;
ALTER TABLE public.pilot_leads ADD COLUMN IF NOT EXISTS owner_notification_error text;

ALTER TABLE public.centre_onboarding ADD COLUMN IF NOT EXISTS catalogue jsonb NOT NULL DEFAULT '{"board":"CBSE","classes":[10],"subjects":["Mathematics","Science"]}'::jsonb;
ALTER TABLE public.centre_onboarding ADD COLUMN IF NOT EXISTS catalogue_confirmed_at timestamptz;

CREATE TABLE public.founder_access_denials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  operation text NOT NULL CHECK (length(operation) <= 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.founder_access_denials TO service_role;
ALTER TABLE public.founder_access_denials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder reads denials" ON public.founder_access_denials FOR SELECT TO authenticated USING (private.is_founder());
GRANT SELECT ON public.founder_access_denials TO authenticated;
