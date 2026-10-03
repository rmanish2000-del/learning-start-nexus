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

-- Append-only enforcement: no deletes; updates may only set superseded_at.
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