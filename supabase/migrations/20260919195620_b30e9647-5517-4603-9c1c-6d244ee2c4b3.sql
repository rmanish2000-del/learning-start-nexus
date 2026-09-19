CREATE TABLE public.question_commercial_release (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  release_basis text NOT NULL DEFAULT 'FOUNDER_APPROVED_AUTOMATED_PRODUCTION',
  commercial_classification text NOT NULL,
  classification_basis text NOT NULL,
  content_sha256 text NOT NULL,
  engine_version text NOT NULL,
  activation_run_id uuid NOT NULL,
  paid_selection_eligible boolean NOT NULL DEFAULT false,
  production_export_eligible boolean NOT NULL DEFAULT false,
  human_sme_certified boolean NOT NULL DEFAULT false,
  official_cbse_ncert_certified boolean NOT NULL DEFAULT false,
  copyright_permission_claimed boolean NOT NULL DEFAULT false,
  automated_not_human boolean NOT NULL DEFAULT true,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  activated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qcr_basis_chk CHECK (release_basis = 'FOUNDER_APPROVED_AUTOMATED_PRODUCTION'),
  CONSTRAINT qcr_class_chk CHECK (commercial_classification = ANY (ARRAY[
    'ORIGINAL_EDUOS_CONTENT','FACT_OR_FORMULA_ONLY','EXPLICITLY_OPEN_LICENSED',
    'PERMISSION_DOCUMENTED','COMMERCIAL_USE_BLOCKED'])),
  CONSTRAINT qcr_no_human_cert_chk CHECK (human_sme_certified = false),
  CONSTRAINT qcr_no_official_cert_chk CHECK (official_cbse_ncert_certified = false),
  CONSTRAINT qcr_no_copyright_claim_chk CHECK (copyright_permission_claimed = false),
  CONSTRAINT qcr_not_human_chk CHECK (automated_not_human = true),
  CONSTRAINT qcr_blocked_not_eligible_chk CHECK (
    commercial_classification <> 'COMMERCIAL_USE_BLOCKED'
    OR (paid_selection_eligible = false AND production_export_eligible = false)),
  CONSTRAINT qcr_question_run_key UNIQUE (question_id, activation_run_id)
);

GRANT SELECT ON public.question_commercial_release TO authenticated;
GRANT ALL ON public.question_commercial_release TO service_role;

ALTER TABLE public.question_commercial_release ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qcr_select_staff" ON public.question_commercial_release
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE TRIGGER touch_question_commercial_release
  BEFORE UPDATE ON public.question_commercial_release
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_qcr_question ON public.question_commercial_release (question_id);
CREATE INDEX idx_qcr_active ON public.question_commercial_release (org_id) WHERE revoked_at IS NULL;

CREATE VIEW public.production_release_pool AS
  SELECT r.org_id,
         r.question_id,
         r.external_ref,
         r.subject,
         r.release_basis,
         r.commercial_classification,
         r.content_sha256,
         r.paid_selection_eligible,
         r.production_export_eligible
  FROM public.question_commercial_release r
  WHERE r.revoked_at IS NULL
    AND r.paid_selection_eligible = true
    AND NOT EXISTS (
      SELECT 1 FROM public.question_pool_exclusions e
      WHERE e.question_id = r.question_id AND e.active = true
    );

GRANT SELECT ON public.production_release_pool TO authenticated;
GRANT SELECT ON public.production_release_pool TO service_role;