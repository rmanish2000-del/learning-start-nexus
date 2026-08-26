CREATE TABLE public.payment_credentials (
  id text PRIMARY KEY DEFAULT 'razorpay',
  key_id text NOT NULL,
  key_secret text NOT NULL,
  webhook_secret text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT payment_credentials_single_row CHECK (id = 'razorpay')
);

-- Secrets: no Data API access for anon or authenticated. Only trusted
-- server-side code (service role) may read or write these values.
REVOKE ALL ON public.payment_credentials FROM anon, authenticated;
GRANT ALL ON public.payment_credentials TO service_role;

ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: every non-service-role request is denied.

CREATE TRIGGER payment_credentials_touch
BEFORE UPDATE ON public.payment_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();