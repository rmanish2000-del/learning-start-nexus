REVOKE ALL ON public.feedback_submissions FROM anon, authenticated;
REVOKE ALL ON public.guidance_events FROM anon, authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;
GRANT ALL ON public.guidance_events TO service_role;

REVOKE SELECT ON public.pilot_invitations FROM anon;

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

DROP TRIGGER IF EXISTS engine_rerun_results_no_delete ON public.engine_rerun_results;
DROP TRIGGER IF EXISTS legacy_quarantine_no_delete ON public.legacy_verification_quarantine;

CREATE OR REPLACE FUNCTION public.auto_verifications_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' AND current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Automated verification records are append-only';
END;
$function$;

REVOKE ALL ON public.remediation_actions FROM anon;
REVOKE ALL ON public.engine_rerun_results FROM anon;
REVOKE ALL ON public.sme_review_queue FROM anon;
REVOKE ALL ON public.question_pool_exclusions FROM anon;
REVOKE ALL ON public.legacy_verification_quarantine FROM anon;
REVOKE ALL ON public.remediation_work_items FROM anon;
REVOKE ALL ON public.remediation_snapshots FROM anon;

-- Import operations -----------------------------------------------------
CREATE TABLE public.automated_review_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_name text NOT NULL,
  package_sha256 text NOT NULL,
  package_bytes bigint NOT NULL,
  generator_run_hash text NOT NULL,
  validator_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_class text NOT NULL DEFAULT 'FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL',
  founder_authorized boolean NOT NULL DEFAULT true,
  is_human_sme_decision boolean NOT NULL DEFAULT false,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'active',
  rolled_back_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automated_review_imports_class_chk
    CHECK (decision_class = 'FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL'),
  CONSTRAINT automated_review_imports_not_human_chk CHECK (is_human_sme_decision = false),
  CONSTRAINT automated_review_imports_state_chk CHECK (state IN ('active','rolled_back'))
);

GRANT SELECT ON public.automated_review_imports TO authenticated;
GRANT ALL ON public.automated_review_imports TO service_role;
ALTER TABLE public.automated_review_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automated_review_imports_select" ON public.automated_review_imports
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

-- Queue-row advisory outcomes -------------------------------------------
CREATE TABLE public.automated_provisional_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.automated_review_imports(id) ON DELETE RESTRICT,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  queue_row_key text NOT NULL,
  queue_routing_id uuid REFERENCES public.sme_review_queue(id) ON DELETE SET NULL,
  queue_routing_reason text NOT NULL,
  item_version_updated_at timestamptz NOT NULL,
  content_sha256 text NOT NULL,
  provisional_outcome text NOT NULL,
  is_question_level_primary boolean NOT NULL DEFAULT true,
  pass_a_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  pass_b_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  pass_c_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  checks_executed jsonb NOT NULL DEFAULT '[]'::jsonb,
  checks_not_executed jsonb NOT NULL DEFAULT '[]'::jsonb,
  engine_outcome text,
  engine_version text,
  package_sha256 text NOT NULL,
  generator_run_hash text NOT NULL,
  validator_passed boolean NOT NULL,
  decision_class text NOT NULL DEFAULT 'FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL',
  founder_authorized boolean NOT NULL DEFAULT true,
  automated_not_human boolean NOT NULL DEFAULT true,
  reviewer_identity text,
  reviewer_qualification text,
  human_signature text,
  advisory_note text,
  import_operation_id text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apo_subject_chk CHECK (subject IN ('Mathematics','Science')),
  CONSTRAINT apo_outcome_chk CHECK (provisional_outcome IN (
    'AUTOMATED_PROVISIONAL_PASS',
    'AUTOMATED_PROVISIONAL_PASS_WITH_METADATA_FIX',
    'AUTOMATED_PROVISIONAL_CONTENT_FIX',
    'AUTOMATED_PROVISIONAL_REPLACEMENT',
    'AUTOMATED_PROVISIONAL_REJECT',
    'AUTOMATED_UNRESOLVED')),
  CONSTRAINT apo_class_chk CHECK (decision_class = 'FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL'),
  CONSTRAINT apo_not_human_chk CHECK (
    automated_not_human = true
    AND reviewer_identity IS NULL
    AND reviewer_qualification IS NULL
    AND human_signature IS NULL)
);

CREATE UNIQUE INDEX apo_active_queue_row_uniq
  ON public.automated_provisional_outcomes (queue_row_key, package_sha256)
  WHERE superseded_at IS NULL;
CREATE INDEX apo_question_idx ON public.automated_provisional_outcomes (question_id);
CREATE INDEX apo_import_idx ON public.automated_provisional_outcomes (import_id);

GRANT SELECT ON public.automated_provisional_outcomes TO authenticated;
GRANT ALL ON public.automated_provisional_outcomes TO service_role;
ALTER TABLE public.automated_provisional_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automated_provisional_outcomes_select" ON public.automated_provisional_outcomes
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE OR REPLACE FUNCTION public.automated_provisional_outcomes_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'automated_provisional_outcomes is append-only';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.question_id IS DISTINCT FROM OLD.question_id
     OR NEW.queue_row_key IS DISTINCT FROM OLD.queue_row_key
     OR NEW.provisional_outcome IS DISTINCT FROM OLD.provisional_outcome
     OR NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256
     OR NEW.package_sha256 IS DISTINCT FROM OLD.package_sha256
     OR NEW.pass_a_evidence IS DISTINCT FROM OLD.pass_a_evidence
     OR NEW.pass_b_evidence IS DISTINCT FROM OLD.pass_b_evidence
     OR NEW.pass_c_evidence IS DISTINCT FROM OLD.pass_c_evidence
     OR NEW.import_operation_id IS DISTINCT FROM OLD.import_operation_id THEN
    RAISE EXCEPTION 'automated_provisional_outcomes evidence is immutable; only superseded_at may change';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER apo_append_only
  BEFORE UPDATE OR DELETE ON public.automated_provisional_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.automated_provisional_outcomes_append_only();

-- Rollback / reapply audit ----------------------------------------------
CREATE TABLE public.automated_review_rollback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  import_id uuid REFERENCES public.automated_review_imports(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  package_sha256 text NOT NULL,
  affected_rows integer NOT NULL DEFAULT 0,
  state_hash text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arre_event_chk CHECK (event_type IN ('ROLLBACK','REAPPLY','IDEMPOTENCY_TEST'))
);

GRANT SELECT ON public.automated_review_rollback_events TO authenticated;
GRANT ALL ON public.automated_review_rollback_events TO service_role;
ALTER TABLE public.automated_review_rollback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automated_review_rollback_events_select" ON public.automated_review_rollback_events
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE OR REPLACE FUNCTION public.automated_review_rollback_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'automated_review_rollback_events is append-only';
END;
$$;

CREATE TRIGGER arre_append_only
  BEFORE UPDATE OR DELETE ON public.automated_review_rollback_events
  FOR EACH ROW EXECUTE FUNCTION public.automated_review_rollback_events_append_only();

-- Question-level advisory view (deduplicates multi-routing questions) ----
CREATE VIEW public.automated_provisional_question_outcomes
WITH (security_invoker = true) AS
SELECT
  o.org_id,
  o.question_id,
  max(o.external_ref) AS external_ref,
  max(o.subject) AS subject,
  count(*) AS queue_rows,
  min(o.provisional_outcome) AS provisional_outcome,
  bool_and(o.automated_not_human) AS automated_not_human,
  max(o.decision_class) AS decision_class,
  max(o.package_sha256) AS package_sha256,
  max(o.imported_at) AS imported_at
FROM public.automated_provisional_outcomes o
WHERE o.superseded_at IS NULL
GROUP BY o.org_id, o.question_id;

GRANT SELECT ON public.automated_provisional_question_outcomes TO authenticated;
GRANT ALL ON public.automated_provisional_question_outcomes TO service_role;

-- Internal-only provisional pool: advisory, never paid-selectable --------
CREATE VIEW public.internal_automated_provisional_pool
WITH (security_invoker = true) AS
SELECT
  q.org_id,
  q.question_id,
  q.external_ref,
  q.subject,
  q.provisional_outcome,
  'INTERNAL_AUTOMATED_PROVISIONAL'::text AS pool_label,
  false AS paid_selection_eligible,
  false AS production_export_eligible
FROM public.automated_provisional_question_outcomes q
WHERE q.provisional_outcome = 'AUTOMATED_PROVISIONAL_PASS';

GRANT SELECT ON public.internal_automated_provisional_pool TO authenticated;
GRANT ALL ON public.internal_automated_provisional_pool TO service_role;

CREATE TRIGGER automated_review_imports_touch
  BEFORE UPDATE ON public.automated_review_imports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.automated_review_imports FROM anon;
REVOKE ALL ON public.automated_provisional_outcomes FROM anon;
REVOKE ALL ON public.automated_review_rollback_events FROM anon;
REVOKE ALL ON public.automated_provisional_question_outcomes FROM anon;
REVOKE ALL ON public.internal_automated_provisional_pool FROM anon;

REVOKE ALL ON public.automated_review_imports FROM authenticated;
REVOKE ALL ON public.automated_provisional_outcomes FROM authenticated;
REVOKE ALL ON public.automated_review_rollback_events FROM authenticated;
REVOKE ALL ON public.automated_provisional_question_outcomes FROM authenticated;
REVOKE ALL ON public.internal_automated_provisional_pool FROM authenticated;

GRANT SELECT ON public.automated_review_imports TO authenticated;
GRANT SELECT ON public.automated_provisional_outcomes TO authenticated;
GRANT SELECT ON public.automated_review_rollback_events TO authenticated;
GRANT SELECT ON public.automated_provisional_question_outcomes TO authenticated;
GRANT SELECT ON public.internal_automated_provisional_pool TO authenticated;

GRANT ALL ON public.automated_review_imports TO service_role;
GRANT ALL ON public.automated_provisional_outcomes TO service_role;
GRANT ALL ON public.automated_review_rollback_events TO service_role;
GRANT ALL ON public.automated_provisional_question_outcomes TO service_role;
GRANT ALL ON public.internal_automated_provisional_pool TO service_role;

CREATE TABLE public.question_marking_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  spec_version integer NOT NULL DEFAULT 1,
  content_sha256 text NOT NULL,
  expected_conclusion text NOT NULL,
  required_reasoning jsonb NOT NULL DEFAULT '[]'::jsonb,
  acceptable_equivalents jsonb NOT NULL DEFAULT '[]'::jsonb,
  terminology jsonb NOT NULL DEFAULT '[]'::jsonb,
  units text,
  tolerance jsonb,
  common_mistakes jsonb NOT NULL DEFAULT '[]'::jsonb,
  minimum_passing_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  spec_sha256 text NOT NULL,
  authored_by text NOT NULL DEFAULT 'AUTOMATED_FOUNDER_AUTHORIZED',
  human_signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, spec_version)
);
GRANT SELECT ON public.question_marking_specs TO authenticated;
GRANT ALL ON public.question_marking_specs TO service_role;
ALTER TABLE public.question_marking_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_marking_specs_select" ON public.question_marking_specs
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE TABLE public.question_content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  revision_reason text NOT NULL,
  revision_kind text NOT NULL,
  before_content jsonb NOT NULL,
  after_content jsonb NOT NULL,
  before_sha256 text NOT NULL,
  after_sha256 text NOT NULL,
  applied boolean NOT NULL DEFAULT false,
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_content_revisions TO authenticated;
GRANT ALL ON public.question_content_revisions TO service_role;
ALTER TABLE public.question_content_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_content_revisions_select" ON public.question_content_revisions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE TABLE public.curriculum_source_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  source_title text NOT NULL,
  source_url text,
  section_ref text,
  accessed_at date,
  checksum_sha256 text,
  alignment_note text,
  licence_status text NOT NULL DEFAULT 'NOT_ASSESSED',
  verbatim_copying boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, source_title, section_ref)
);
GRANT SELECT ON public.curriculum_source_register TO authenticated;
GRANT ALL ON public.curriculum_source_register TO service_role;
ALTER TABLE public.curriculum_source_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "curriculum_source_register_select" ON public.curriculum_source_register
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE TABLE public.question_originality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  revision_id uuid REFERENCES public.question_content_revisions(id) ON DELETE SET NULL,
  matched_shingle text,
  exact_match boolean NOT NULL,
  normalized_match boolean NOT NULL,
  max_shingle_overlap numeric NOT NULL,
  semantic_similarity numeric NOT NULL,
  verdict text NOT NULL,
  copyright_clearance_claimed boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_originality_checks TO authenticated;
GRANT ALL ON public.question_originality_checks TO service_role;
ALTER TABLE public.question_originality_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_originality_checks_select" ON public.question_originality_checks
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE OR REPLACE FUNCTION public.content_resolution_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'question_content_revisions' THEN
    IF NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.question_id IS NOT DISTINCT FROM OLD.question_id
       AND NEW.before_content IS NOT DISTINCT FROM OLD.before_content
       AND NEW.after_content IS NOT DISTINCT FROM OLD.after_content
       AND NEW.before_sha256 IS NOT DISTINCT FROM OLD.before_sha256
       AND NEW.after_sha256 IS NOT DISTINCT FROM OLD.after_sha256 THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER question_marking_specs_append_only
  BEFORE UPDATE OR DELETE ON public.question_marking_specs
  FOR EACH ROW EXECUTE FUNCTION public.content_resolution_append_only();
CREATE TRIGGER question_content_revisions_append_only
  BEFORE UPDATE OR DELETE ON public.question_content_revisions
  FOR EACH ROW EXECUTE FUNCTION public.content_resolution_append_only();
CREATE TRIGGER curriculum_source_register_append_only
  BEFORE UPDATE OR DELETE ON public.curriculum_source_register
  FOR EACH ROW EXECUTE FUNCTION public.content_resolution_append_only();
CREATE TRIGGER question_originality_checks_append_only
  BEFORE UPDATE OR DELETE ON public.question_originality_checks
  FOR EACH ROW EXECUTE FUNCTION public.content_resolution_append_only();

CREATE INDEX idx_marking_specs_question ON public.question_marking_specs(question_id);
CREATE INDEX idx_content_revisions_question ON public.question_content_revisions(question_id);
CREATE INDEX idx_source_register_question ON public.curriculum_source_register(question_id);
CREATE INDEX idx_originality_checks_question ON public.question_originality_checks(question_id);