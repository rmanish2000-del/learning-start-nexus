-- ============================================================
-- Staging → canonical alignment (production SHA 84311d07).
-- Part 1: remove staging-only divergence that production never had.
-- ============================================================
DROP TABLE IF EXISTS public.pilot_journeys CASCADE;
DROP TABLE IF EXISTS public.pilot_access_grants CASCADE;
DROP TABLE IF EXISTS public.assignment_events CASCADE;
DROP TABLE IF EXISTS public.educator_assignments CASCADE;
DROP TABLE IF EXISTS public.educator_capacity CASCADE;
DROP TYPE IF EXISTS public.assignment_status CASCADE;

ALTER TABLE public.parent_orders DROP CONSTRAINT IF EXISTS parent_orders_pilot_no_payment_check;
ALTER TABLE public.parent_orders DROP CONSTRAINT IF EXISTS parent_orders_access_source_check;
ALTER TABLE public.parent_orders DROP COLUMN IF EXISTS access_source;
ALTER TABLE public.parent_orders DROP COLUMN IF EXISTS pilot_grant_id;
ALTER TABLE public.parent_orders DROP CONSTRAINT IF EXISTS parent_orders_status_check;
ALTER TABLE public.parent_orders
  ADD CONSTRAINT parent_orders_status_check
  CHECK (status = ANY (ARRAY['created'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'expired'::text]));

ALTER TABLE public.parent_entitlements DROP CONSTRAINT IF EXISTS parent_entitlements_source_check;
ALTER TABLE public.parent_entitlements DROP COLUMN IF EXISTS source;
ALTER TABLE public.parent_entitlements DROP COLUMN IF EXISTS pilot_grant_id;

-- staging-only SME import rows and their staging-only metadata columns
DELETE FROM public.question_verifications;
DELETE FROM public.question_bank WHERE review_queue IS NOT NULL;
ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS question_bank_pool_check;
ALTER TABLE public.question_bank
  DROP COLUMN IF EXISTS subject,
  DROP COLUMN IF EXISTS board,
  DROP COLUMN IF EXISTS class_level,
  DROP COLUMN IF EXISTS academic_year,
  DROP COLUMN IF EXISTS pool,
  DROP COLUMN IF EXISTS review_queue,
  DROP COLUMN IF EXISTS unit_title,
  DROP COLUMN IF EXISTS chapter_title,
  DROP COLUMN IF EXISTS topic_title,
  DROP COLUMN IF EXISTS atom_ref,
  DROP COLUMN IF EXISTS atom_status,
  DROP COLUMN IF EXISTS official_source_reference,
  DROP COLUMN IF EXISTS official_requirement_ids,
  DROP COLUMN IF EXISTS scoring_rule;
DROP INDEX IF EXISTS public.question_bank_org_external_ref_key;
ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS question_bank_verification_state_check;
ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_verification_state_check
  CHECK (verification_state IN ('unverified', 'verified', 'rejected'));

ALTER TABLE public.question_verifications DROP CONSTRAINT IF EXISTS question_verifications_identity_check;
ALTER TABLE public.question_verifications DROP CONSTRAINT IF EXISTS question_verifications_action_check;
ALTER TABLE public.question_verifications DROP COLUMN IF EXISTS reviewer_name;

-- ============================================================
-- Part 2: canonical production migrations, applied in order.
-- ============================================================

-- >>> 20260901030208
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

-- >>> 20260901065804
ALTER TABLE public.guardian_consents DROP CONSTRAINT guardian_consents_action_check;
ALTER TABLE public.guardian_consents ADD CONSTRAINT guardian_consents_action_check
  CHECK (action = ANY (ARRAY['granted'::text, 'withdrawn'::text, 'declined'::text]));

-- >>> 20260902065859
REVOKE SELECT ON public.catalogue_subjects FROM anon;
GRANT SELECT (
  id, academic_year_id, board_id, class_id, stream_id, subject_key, code,
  display_name, commercial_status, is_active, archived_at, version,
  diagnostic_eligible, diagnostic_minimum, diagnostic_target,
  min_questions_per_outcome, chapter_group_marks, reassessment_ready,
  created_at, updated_at
) ON public.catalogue_subjects TO anon;

ALTER TABLE public.pilot_leads
  DROP CONSTRAINT IF EXISTS pilot_leads_email_format_check,
  DROP CONSTRAINT IF EXISTS pilot_leads_contact_name_length_check,
  DROP CONSTRAINT IF EXISTS pilot_leads_notes_length_check;

ALTER TABLE public.pilot_leads
  ADD CONSTRAINT pilot_leads_email_format_check
  CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$' AND length(email) <= 254),
  ADD CONSTRAINT pilot_leads_contact_name_length_check
  CHECK (length(btrim(contact_name)) BETWEEN 1 AND 120),
  ADD CONSTRAINT pilot_leads_notes_length_check
  CHECK (notes IS NULL OR length(notes) <= 2000);

-- >>> 20260903045542
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

-- >>> 20260903134259
REVOKE UPDATE, DELETE, TRUNCATE ON public.question_verifications FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.question_verifications FROM anon;

CREATE OR REPLACE FUNCTION public.question_verifications_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'question_verifications is append-only; decisions cannot be % ',
    lower(TG_OP);
END;
$$;

DROP TRIGGER IF EXISTS question_verifications_no_update_trg ON public.question_verifications;
CREATE TRIGGER question_verifications_no_update_trg
  BEFORE UPDATE ON public.question_verifications
  FOR EACH ROW EXECUTE FUNCTION public.question_verifications_append_only();

DROP TRIGGER IF EXISTS question_verifications_no_delete_trg ON public.question_verifications;
CREATE TRIGGER question_verifications_no_delete_trg
  BEFORE DELETE ON public.question_verifications
  FOR EACH ROW EXECUTE FUNCTION public.question_verifications_append_only();

CREATE OR REPLACE FUNCTION public.question_verifications_no_bulk()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM new_rows;
  IF n > 1 THEN
    RAISE EXCEPTION 'Bulk verification is not permitted; record one reviewer decision at a time';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS question_verifications_no_bulk_trg ON public.question_verifications;
CREATE TRIGGER question_verifications_no_bulk_trg
  AFTER INSERT ON public.question_verifications
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.question_verifications_no_bulk();

CREATE OR REPLACE FUNCTION public.apply_question_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.question_bank
  SET verification_state = NEW.action,
      verified_by = NEW.reviewer_id,
      verified_at = NEW.created_at,
      verification_note = NEW.note,
      status = CASE WHEN NEW.action = 'verified' THEN 'approved' ELSE status END
  WHERE id = NEW.question_id
    AND org_id = NEW.org_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_question_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.question_verifications_append_only() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.question_verifications_no_bulk() FROM PUBLIC, anon, authenticated;

-- >>> 20260903142636
ALTER TABLE public.question_verifications
  ADD COLUMN IF NOT EXISTS reviewer_qualification text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS decision_basis text NOT NULL DEFAULT '';

ALTER TABLE public.question_verifications
  DROP CONSTRAINT IF EXISTS question_verifications_attribution_chk;
ALTER TABLE public.question_verifications
  ADD CONSTRAINT question_verifications_attribution_chk
  CHECK (length(btrim(reviewer_qualification)) >= 2 AND length(btrim(decision_basis)) >= 10) NOT VALID;

ALTER TABLE public.question_verifications
  DROP CONSTRAINT IF EXISTS question_verifications_action_check;
ALTER TABLE public.question_verifications
  ADD CONSTRAINT question_verifications_action_check
  CHECK (action IN ('verified', 'rejected', 'remediation_required', 'cannot_assess'));

CREATE OR REPLACE FUNCTION public.apply_question_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.question_bank
  SET verification_state = CASE
        WHEN NEW.action IN ('verified', 'rejected') THEN NEW.action
        ELSE verification_state
      END,
      verified_by = NEW.reviewer_id,
      verified_at = NEW.created_at,
      verification_note = NEW.note,
      status = CASE WHEN NEW.action = 'verified' THEN 'approved' ELSE status END
  WHERE id = NEW.question_id
    AND org_id = NEW.org_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_question_verification() FROM PUBLIC, anon, authenticated;

-- >>> 20260903145431
UPDATE public.assessments a
SET status = 'archived'
WHERE a.status = 'published'
  AND (
    a.grade IS DISTINCT FROM 10
    OR a.book_id IS NULL
    OR EXISTS (SELECT 1 FROM public.books b WHERE b.id = a.book_id AND (b.archived_at IS NOT NULL OR b.is_demo))
    OR EXISTS (
      SELECT 1 FROM public.assessment_question_map m
      JOIN public.question_bank q ON q.id = m.question_id
      WHERE m.assessment_id = a.id
        AND (q.status <> 'approved' OR q.verification_state <> 'verified')
    )
    OR NOT EXISTS (SELECT 1 FROM public.assessment_question_map m WHERE m.assessment_id = a.id)
  );

-- >>> 20260903173600
CREATE TABLE public.pilot_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES public.learners(id) ON DELETE CASCADE,
  subject text,
  grant_reason text NOT NULL,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pilot_grants_parent_idx ON public.pilot_grants(parent_user_id);
CREATE INDEX pilot_grants_learner_idx ON public.pilot_grants(learner_id);

GRANT SELECT, INSERT, UPDATE ON public.pilot_grants TO authenticated;
GRANT ALL ON public.pilot_grants TO service_role;
ALTER TABLE public.pilot_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot_grants_admin_all" ON public.pilot_grants FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "pilot_grants_parent_read" ON public.pilot_grants FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());

CREATE TABLE public.pilot_grant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL REFERENCES public.pilot_grants(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('granted','extended','revoked')),
  actor_user_id uuid NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pilot_grant_events TO authenticated;
GRANT SELECT, INSERT ON public.pilot_grant_events TO service_role;
ALTER TABLE public.pilot_grant_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot_grant_events_admin_read" ON public.pilot_grant_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.pilot_grant_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'pilot_grant_events is append-only';
END;
$$;

CREATE TRIGGER pilot_grant_events_no_update BEFORE UPDATE ON public.pilot_grant_events
  FOR EACH ROW EXECUTE FUNCTION public.pilot_grant_events_append_only();
CREATE TRIGGER pilot_grant_events_no_delete BEFORE DELETE ON public.pilot_grant_events
  FOR EACH ROW EXECUTE FUNCTION public.pilot_grant_events_append_only();

CREATE TABLE public.pilot_diagnostic_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL REFERENCES public.pilot_grants(id) ON DELETE CASCADE,
  run_ref text NOT NULL UNIQUE,
  access_token text NOT NULL UNIQUE,
  board text,
  grade integer,
  subject text,
  book_id uuid,
  unit_id uuid,
  child_first_name text,
  org_id uuid,
  parent_user_id uuid NOT NULL,
  learner_id uuid,
  assessment_id uuid,
  session_id uuid,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pilot_runs_parent_idx ON public.pilot_diagnostic_runs(parent_user_id);
CREATE INDEX pilot_runs_learner_idx ON public.pilot_diagnostic_runs(learner_id);

GRANT SELECT ON public.pilot_diagnostic_runs TO authenticated;
GRANT ALL ON public.pilot_diagnostic_runs TO service_role;
ALTER TABLE public.pilot_diagnostic_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot_runs_parent_read" ON public.pilot_diagnostic_runs FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());

CREATE POLICY "pilot_runs_admin_read" ON public.pilot_diagnostic_runs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.has_active_pilot_access(_learner_id uuid, _subject text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pilot_grants g
    WHERE g.learner_id = _learner_id
      AND g.revoked_at IS NULL
      AND g.expires_at > now()
      AND (g.subject IS NULL OR _subject IS NULL OR g.subject = _subject)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_pilot_access(uuid, text) FROM anon;

-- >>> 20260903173640
REVOKE ALL ON FUNCTION public.has_active_pilot_access(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pilot_grant_events_append_only() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_pilot_access(uuid, text) TO service_role;

-- >>> 20260903182657
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS verification_tier text;

ALTER TABLE public.question_bank
  DROP CONSTRAINT IF EXISTS question_bank_verification_tier_check;
ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_verification_tier_check
  CHECK (verification_tier IS NULL OR verification_tier = ANY (ARRAY['named_sme'::text, 'eduos_automated'::text]));

CREATE TABLE public.question_auto_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  run_id uuid NOT NULL,
  engine_version text NOT NULL,
  outcome text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.question_auto_verifications
  ADD CONSTRAINT question_auto_verifications_outcome_check
  CHECK (outcome = ANY (ARRAY['auto_approved'::text, 'quarantined'::text]));

CREATE INDEX question_auto_verifications_question_idx
  ON public.question_auto_verifications (question_id, created_at DESC);
CREATE INDEX question_auto_verifications_run_idx
  ON public.question_auto_verifications (run_id);

GRANT SELECT, INSERT ON public.question_auto_verifications TO authenticated;
GRANT ALL ON public.question_auto_verifications TO service_role;

ALTER TABLE public.question_auto_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auto_verifications_select"
  ON public.question_auto_verifications FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE POLICY "auto_verifications_insert"
  ON public.question_auto_verifications FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.auto_verifications_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Automated verification records are append-only';
END;
$$;

CREATE TRIGGER question_auto_verifications_no_update
  BEFORE UPDATE ON public.question_auto_verifications
  FOR EACH ROW EXECUTE FUNCTION public.auto_verifications_immutable();

CREATE TRIGGER question_auto_verifications_no_delete
  BEFORE DELETE ON public.question_auto_verifications
  FOR EACH ROW EXECUTE FUNCTION public.auto_verifications_immutable();

CREATE TABLE public.pyq_practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  subject text NOT NULL,
  chapter text,
  cohort text NOT NULL DEFAULT 'recent_2023_2026',
  mode text NOT NULL DEFAULT 'practice',
  duration_minutes integer,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'in_progress',
  score_pct integer,
  correct_count integer,
  total_count integer,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pyq_practice_sessions
  ADD CONSTRAINT pyq_practice_sessions_status_check
  CHECK (status = ANY (ARRAY['in_progress'::text, 'submitted'::text]));
ALTER TABLE public.pyq_practice_sessions
  ADD CONSTRAINT pyq_practice_sessions_mode_check
  CHECK (mode = ANY (ARRAY['practice'::text, 'timed_paper'::text]));
ALTER TABLE public.pyq_practice_sessions
  ADD CONSTRAINT pyq_practice_sessions_cohort_check
  CHECK (cohort = ANY (ARRAY['recent_2023_2026'::text, 'term_2022'::text]));

CREATE INDEX pyq_practice_sessions_learner_idx
  ON public.pyq_practice_sessions (learner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pyq_practice_sessions TO authenticated;
GRANT ALL ON public.pyq_practice_sessions TO service_role;

ALTER TABLE public.pyq_practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pyq_sessions_select"
  ON public.pyq_practice_sessions FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.can_view_learner(learner_id));

CREATE POLICY "pyq_sessions_parent_select"
  ON public.pyq_practice_sessions FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_parent_of(learner_id));

CREATE POLICY "pyq_sessions_insert"
  ON public.pyq_practice_sessions FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));

CREATE POLICY "pyq_sessions_update"
  ON public.pyq_practice_sessions FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.can_manage_learner(learner_id))
  WITH CHECK (org_id = private.current_org_id() AND private.can_manage_learner(learner_id));

CREATE POLICY "pyq_sessions_delete"
  ON public.pyq_practice_sessions FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_pyq_practice_sessions
  BEFORE UPDATE ON public.pyq_practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- >>> 20260903182734
REVOKE ALL ON FUNCTION public.auto_verifications_immutable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_verifications_immutable() FROM anon;
REVOKE ALL ON FUNCTION public.auto_verifications_immutable() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.auto_verifications_immutable() TO service_role;

-- >>> 20260903194001
ALTER TABLE public.pyq_practice_sessions DROP CONSTRAINT IF EXISTS pyq_practice_sessions_mode_check;
ALTER TABLE public.pyq_practice_sessions ADD CONSTRAINT pyq_practice_sessions_mode_check CHECK (mode = ANY (ARRAY['practice'::text, 'timed_paper'::text, 'full_paper'::text]));

-- >>> 20260903194805
CREATE POLICY pyq_sessions_learner_insert ON public.pyq_practice_sessions
FOR INSERT TO authenticated
WITH CHECK (
  org_id = private.current_org_id()
  AND EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = learner_id
      AND l.org_id = private.current_org_id()
      AND l.student_user_id = auth.uid()
  )
);

CREATE POLICY pyq_sessions_learner_update ON public.pyq_practice_sessions
FOR UPDATE TO authenticated
USING (
  org_id = private.current_org_id()
  AND EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = learner_id
      AND l.org_id = private.current_org_id()
      AND l.student_user_id = auth.uid()
  )
)
WITH CHECK (
  org_id = private.current_org_id()
  AND EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.id = learner_id
      AND l.org_id = private.current_org_id()
      AND l.student_user_id = auth.uid()
  )
);

-- >>> 20260904071901
DROP POLICY IF EXISTS tutor_sessions_update ON public.tutor_sessions;
CREATE POLICY tutor_sessions_update ON public.tutor_sessions
FOR UPDATE TO authenticated
USING (
  student_user_id = auth.uid()
  AND org_id = private.current_org_id()
  AND private.is_own_learner(learner_id)
)
WITH CHECK (
  student_user_id = auth.uid()
  AND org_id = private.current_org_id()
  AND private.is_own_learner(learner_id)
);