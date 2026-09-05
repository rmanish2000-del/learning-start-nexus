CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  message text NOT NULL,
  contact_email text,
  screenshot_path text,
  route text NOT NULL,
  device_class text NOT NULL,
  viewport text,
  browser_family text,
  app_version text,
  guidance_context text,
  cta_context text,
  is_authenticated boolean NOT NULL DEFAULT false,
  submitter_user_id uuid,
  client_hash text NOT NULL,
  dedupe_hash text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',
  reproduction text NOT NULL DEFAULT 'unknown',
  product_area text NOT NULL DEFAULT 'unclassified',
  duplicate_of uuid REFERENCES public.feedback_submissions(id) ON DELETE SET NULL,
  business_impact text,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_submissions_created_idx ON public.feedback_submissions (created_at DESC);
CREATE INDEX feedback_submissions_client_idx ON public.feedback_submissions (client_hash, created_at DESC);
CREATE INDEX feedback_submissions_dedupe_idx ON public.feedback_submissions (dedupe_hash, created_at DESC);

GRANT ALL ON public.feedback_submissions TO service_role;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER feedback_submissions_updated_at
  BEFORE UPDATE ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TABLE public.guidance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  route text NOT NULL,
  cta text,
  device_class text,
  viewport text,
  browser_family text,
  app_version text,
  session_hash text,
  is_authenticated boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guidance_events_name_idx ON public.guidance_events (name, occurred_at DESC);
CREATE INDEX guidance_events_occurred_idx ON public.guidance_events (occurred_at DESC);

GRANT ALL ON public.guidance_events TO service_role;
ALTER TABLE public.guidance_events ENABLE ROW LEVEL SECURITY;