
-- Pilot access: non-commercial entitlement, fully separate from orders/payments.
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

-- Append-only audit trail.
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

-- Pilot diagnostic runs: the journey record for pilot families.
-- Deliberately NOT parent_orders: no amount, no status, no payment reference,
-- so pilot activity can never appear in revenue or conversion reporting.
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

-- Active pilot access check, usable from SQL and policies.
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
