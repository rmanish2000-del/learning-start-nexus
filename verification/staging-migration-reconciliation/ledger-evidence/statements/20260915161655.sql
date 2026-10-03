-- Stage 3 staging remediation bookkeeping

CREATE TABLE public.remediation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  scope text NOT NULL,
  checksum text NOT NULL,
  location text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.remediation_snapshots TO authenticated;
GRANT ALL ON public.remediation_snapshots TO service_role;
ALTER TABLE public.remediation_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "remediation_snapshots_select" ON public.remediation_snapshots
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.remediation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL,
  action_type text NOT NULL,
  question_id uuid,
  external_ref text,
  subject text,
  prior_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX remediation_actions_run_idx ON public.remediation_actions (run_id, created_at);
CREATE INDEX remediation_actions_question_idx ON public.remediation_actions (question_id);
GRANT SELECT ON public.remediation_actions TO authenticated;
GRANT ALL ON public.remediation_actions TO service_role;
ALTER TABLE public.remediation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "remediation_actions_select" ON public.remediation_actions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE OR REPLACE FUNCTION public.remediation_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER remediation_actions_no_update BEFORE UPDATE ON public.remediation_actions
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();
CREATE TRIGGER remediation_actions_no_delete BEFORE DELETE ON public.remediation_actions
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();

CREATE TABLE public.remediation_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref text NOT NULL UNIQUE,
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'P0',
  status text NOT NULL DEFAULT 'open',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.remediation_work_items TO authenticated;
GRANT ALL ON public.remediation_work_items TO service_role;
ALTER TABLE public.remediation_work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "remediation_work_items_select" ON public.remediation_work_items
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));
CREATE TRIGGER touch_remediation_work_items BEFORE UPDATE ON public.remediation_work_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.question_pool_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  pool text NOT NULL,
  reason text NOT NULL,
  work_item_ref text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, pool)
);
CREATE INDEX question_pool_exclusions_pool_idx ON public.question_pool_exclusions (pool, active);
GRANT SELECT ON public.question_pool_exclusions TO authenticated;
GRANT ALL ON public.question_pool_exclusions TO service_role;
ALTER TABLE public.question_pool_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_pool_exclusions_select" ON public.question_pool_exclusions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));
CREATE TRIGGER touch_question_pool_exclusions BEFORE UPDATE ON public.question_pool_exclusions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sme_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject text NOT NULL,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  routing_reason text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  queued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, routing_reason),
  CONSTRAINT sme_review_queue_subject_check CHECK (subject IN ('Mathematics', 'Science'))
);
CREATE INDEX sme_review_queue_subject_idx ON public.sme_review_queue (subject, priority, queued_at);
GRANT SELECT ON public.sme_review_queue TO authenticated;
GRANT ALL ON public.sme_review_queue TO service_role;
ALTER TABLE public.sme_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sme_review_queue_select" ON public.sme_review_queue
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE TABLE public.legacy_verification_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legacy_database_id uuid NOT NULL,
  external_ref text,
  subject text NOT NULL,
  legacy_status text NOT NULL,
  legacy_verified_at timestamptz,
  legacy_verification_note text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  quarantined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legacy_database_id)
);
GRANT SELECT ON public.legacy_verification_quarantine TO authenticated;
GRANT ALL ON public.legacy_verification_quarantine TO service_role;
ALTER TABLE public.legacy_verification_quarantine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy_verification_quarantine_select" ON public.legacy_verification_quarantine
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));
CREATE TRIGGER legacy_quarantine_no_update BEFORE UPDATE ON public.legacy_verification_quarantine
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();
CREATE TRIGGER legacy_quarantine_no_delete BEFORE DELETE ON public.legacy_verification_quarantine
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();

CREATE TABLE public.engine_rerun_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL,
  engine_version text NOT NULL,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  outcome text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  strong_signals integer NOT NULL DEFAULT 0,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, question_id),
  CONSTRAINT engine_rerun_results_outcome_check CHECK (outcome IN ('auto_approved', 'quarantined'))
);
CREATE INDEX engine_rerun_results_run_idx ON public.engine_rerun_results (run_id);
GRANT SELECT ON public.engine_rerun_results TO authenticated;
GRANT ALL ON public.engine_rerun_results TO service_role;
ALTER TABLE public.engine_rerun_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "engine_rerun_results_select" ON public.engine_rerun_results
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));
CREATE TRIGGER engine_rerun_results_no_update BEFORE UPDATE ON public.engine_rerun_results
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();
CREATE TRIGGER engine_rerun_results_no_delete BEFORE DELETE ON public.engine_rerun_results
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();