CREATE TABLE public.payment_credential_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('save','clear','test')),
  prev_mode text NOT NULL DEFAULT 'unknown',
  new_mode text NOT NULL DEFAULT 'unknown',
  prev_source text NOT NULL DEFAULT 'missing',
  new_source text NOT NULL DEFAULT 'missing',
  masked_key_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_credential_audit TO authenticated;
GRANT ALL ON public.payment_credential_audit TO service_role;

ALTER TABLE public.payment_credential_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read payment credential audit"
  ON public.payment_credential_audit FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_payment_credential_audit
  BEFORE UPDATE ON public.payment_credential_audit
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();