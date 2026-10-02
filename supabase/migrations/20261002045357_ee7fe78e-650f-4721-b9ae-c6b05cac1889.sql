
CREATE TABLE public.centre_onboarding (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  approved_at timestamptz NOT NULL DEFAULT now(),
  profile_completed_at timestamptz,
  report_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.centre_onboarding TO authenticated;
GRANT ALL ON public.centre_onboarding TO service_role;
ALTER TABLE public.centre_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre admins read own onboarding" ON public.centre_onboarding FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Centre admins create own onboarding" ON public.centre_onboarding FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Centre admins update own onboarding" ON public.centre_onboarding FOR UPDATE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER touch_centre_onboarding BEFORE UPDATE ON public.centre_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.sample_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  sample_label text NOT NULL DEFAULT 'SAMPLE' CHECK (sample_label = 'SAMPLE'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sample_workspaces TO authenticated;
GRANT ALL ON public.sample_workspaces TO service_role;
ALTER TABLE public.sample_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre staff read own sample workspace" ON public.sample_workspaces FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'educator'::app_role)));

CREATE TABLE public.sample_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.sample_workspaces(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('learner','assessment','report')),
  sample_key text NOT NULL,
  label text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_label text NOT NULL DEFAULT 'SAMPLE' CHECK (sample_label = 'SAMPLE'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sample_key)
);
GRANT SELECT ON public.sample_records TO authenticated;
GRANT ALL ON public.sample_records TO service_role;
ALTER TABLE public.sample_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre staff read own sample records" ON public.sample_records FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'educator'::app_role)));

CREATE TABLE public.sample_workspace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created','removed')),
  record_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sample_workspace_events TO authenticated;
GRANT ALL ON public.sample_workspace_events TO service_role;
ALTER TABLE public.sample_workspace_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Centre admins read own sample log" ON public.sample_workspace_events FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER sample_workspace_events_no_update BEFORE UPDATE OR DELETE ON public.sample_workspace_events
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();

CREATE OR REPLACE FUNCTION public.create_sample_workspace()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid := private.current_org_id();
  v_ws uuid;
  v_n integer;
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL OR NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_ws FROM public.sample_workspaces WHERE org_id = v_org;
  IF v_ws IS NOT NULL THEN
    SELECT count(*) INTO v_n FROM public.sample_records WHERE workspace_id = v_ws;
    RETURN v_n;
  END IF;
  INSERT INTO public.sample_workspaces (org_id, created_by) VALUES (v_org, auth.uid()) RETURNING id INTO v_ws;
  INSERT INTO public.sample_records (workspace_id, org_id, kind, sample_key, label, payload) VALUES
    (v_ws, v_org, 'learner', 'sample-a', 'Learner A', '{"class":10,"board":"CBSE","band":"Developing"}'),
    (v_ws, v_org, 'learner', 'sample-b', 'Learner B', '{"class":10,"board":"CBSE","band":"Secure"}'),
    (v_ws, v_org, 'learner', 'sample-c', 'Learner C', '{"class":9,"board":"CBSE","band":"Emerging"}'),
    (v_ws, v_org, 'learner', 'sample-d', 'Learner D', '{"class":10,"board":"State","band":"Developing"}'),
    (v_ws, v_org, 'learner', 'sample-e', 'Learner E', '{"class":9,"board":"State","band":"Secure"}'),
    (v_ws, v_org, 'assessment', 'sample-asmt-1', 'Maths — Algebra', '{"subject":"Mathematics","class":10,"completion":80}'),
    (v_ws, v_org, 'assessment', 'sample-asmt-2', 'Science — Chemical Reactions', '{"subject":"Science","class":10,"completion":60}'),
    (v_ws, v_org, 'assessment', 'sample-asmt-3', 'Maths — Quadratic Equations', '{"subject":"Mathematics","class":10,"completion":40}'),
    (v_ws, v_org, 'report', 'sample-report-1', 'Learner A — Maths', '{"learner":"Learner A","band":"Developing"}'),
    (v_ws, v_org, 'report', 'sample-report-2', 'Learner B — Science', '{"learner":"Learner B","band":"Secure"}');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  INSERT INTO public.sample_workspace_events (org_id, actor_id, action, record_count) VALUES (v_org, auth.uid(), 'created', v_n);
  RETURN v_n;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_sample_workspace()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid := private.current_org_id();
  v_n integer := 0;
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL OR NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.sample_records WHERE org_id = v_org;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  DELETE FROM public.sample_workspaces WHERE org_id = v_org;
  INSERT INTO public.sample_workspace_events (org_id, actor_id, action, record_count) VALUES (v_org, auth.uid(), 'removed', v_n);
  RETURN v_n;
END; $$;

REVOKE ALL ON FUNCTION public.create_sample_workspace() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_sample_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sample_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_sample_workspace() TO authenticated;
