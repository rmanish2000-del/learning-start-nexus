-- P0 security: payment gateway secrets must be reachable only by trusted
-- server-side (service_role) code. Remove all authenticated-admin policies so
-- that no signed-in admin of any organisation can read or modify the
-- platform-wide Razorpay credentials, even if a table GRANT is added later.

DROP POLICY IF EXISTS "payment_credentials_admin_select" ON public.payment_credentials;
DROP POLICY IF EXISTS "payment_credentials_admin_insert" ON public.payment_credentials;
DROP POLICY IF EXISTS "payment_credentials_admin_update" ON public.payment_credentials;
DROP POLICY IF EXISTS "payment_credentials_admin_delete" ON public.payment_credentials;
DROP POLICY IF EXISTS "Admins can read payment credential audit" ON public.payment_credential_audit;

REVOKE ALL ON public.payment_credentials FROM anon, authenticated;
REVOKE ALL ON public.payment_credential_audit FROM anon, authenticated;
GRANT ALL ON public.payment_credentials TO service_role;
GRANT SELECT, INSERT ON public.payment_credential_audit TO service_role;

ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_credential_audit ENABLE ROW LEVEL SECURITY;

-- Immutable audit trail: rows may be appended, never edited or deleted.
CREATE OR REPLACE FUNCTION public.payment_credential_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'payment_credential_audit is append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.payment_credential_audit_immutable() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS payment_credential_audit_no_update ON public.payment_credential_audit;
CREATE TRIGGER payment_credential_audit_no_update
BEFORE UPDATE OR DELETE ON public.payment_credential_audit
FOR EACH ROW EXECUTE FUNCTION public.payment_credential_audit_immutable();