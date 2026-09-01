REVOKE ALL ON public.payment_credentials FROM anon, authenticated;
REVOKE ALL ON public.payment_credential_audit FROM anon, authenticated;

GRANT ALL ON public.payment_credentials TO service_role;
GRANT ALL ON public.payment_credential_audit TO service_role;

ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_credential_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_credentials_admin_select" ON public.payment_credentials;
CREATE POLICY "payment_credentials_admin_select"
  ON public.payment_credentials FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));