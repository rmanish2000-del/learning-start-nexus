-- Centre admin first-login release (PR #5, owner check hardened to require a confirmed email)

CREATE OR REPLACE FUNCTION private.is_platform_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.email, '')) = 'rmanish2000@gmail.com'
      AND u.email_confirmed_at IS NOT NULL
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_platform_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_platform_owner() TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can read pilot applications" ON public.pilot_leads;
DROP POLICY IF EXISTS "Admins can update pilot applications" ON public.pilot_leads;
DROP POLICY IF EXISTS "Platform owner reads pilot applications" ON public.pilot_leads;
DROP POLICY IF EXISTS "Platform owner updates pilot applications" ON public.pilot_leads;

CREATE POLICY "Platform owner reads pilot applications"
ON public.pilot_leads FOR SELECT TO authenticated
USING (private.is_platform_owner());

CREATE POLICY "Platform owner updates pilot applications"
ON public.pilot_leads FOR UPDATE TO authenticated
USING (private.is_platform_owner())
WITH CHECK (private.is_platform_owner());

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_signup_role text := NULLIF(NEW.raw_user_meta_data->>'signup_role', '');
  v_provisioned boolean := NEW.email_confirmed_at IS NOT NULL;
BEGIN
  INSERT INTO public.profiles (id, org_id, full_name, phone)
  VALUES (
    NEW.id,
    (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  IF v_signup_role = 'parent'
     OR (v_provisioned AND v_signup_role IN ('student', 'educator', 'reviewer', 'admin')) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_signup_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.assessment_sessions ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS learners_sample_org_idx ON public.learners (org_id) WHERE is_sample;
CREATE INDEX IF NOT EXISTS assessments_sample_org_idx ON public.assessments (org_id) WHERE is_sample;
CREATE INDEX IF NOT EXISTS assessment_sessions_sample_org_idx ON public.assessment_sessions (org_id) WHERE is_sample;

CREATE TABLE IF NOT EXISTS public.sample_workspace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'removed')),
  actor_user_id uuid NOT NULL,
  learners_count integer NOT NULL DEFAULT 0,
  assessments_count integer NOT NULL DEFAULT 0,
  sessions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.sample_workspace_events FROM anon;
GRANT SELECT ON public.sample_workspace_events TO authenticated;
GRANT ALL ON public.sample_workspace_events TO service_role;
ALTER TABLE public.sample_workspace_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sample_workspace_events_org_admin_select" ON public.sample_workspace_events;
CREATE POLICY "sample_workspace_events_org_admin_select" ON public.sample_workspace_events
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS sample_workspace_events_no_update ON public.sample_workspace_events;
CREATE TRIGGER sample_workspace_events_no_update BEFORE UPDATE ON public.sample_workspace_events
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();
DROP TRIGGER IF EXISTS sample_workspace_events_no_delete ON public.sample_workspace_events;
CREATE TRIGGER sample_workspace_events_no_delete BEFORE DELETE ON public.sample_workspace_events
  FOR EACH ROW EXECUTE FUNCTION public.remediation_append_only();

CREATE TABLE IF NOT EXISTS public.centre_setup_progress (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_reviewed_at timestamptz,
  completed_at timestamptz,
  sample_created_at timestamptz,
  sample_removed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.centre_setup_progress FROM anon;
GRANT SELECT ON public.centre_setup_progress TO authenticated;
GRANT ALL ON public.centre_setup_progress TO service_role;
ALTER TABLE public.centre_setup_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "centre_setup_progress_org_staff_select" ON public.centre_setup_progress;
CREATE POLICY "centre_setup_progress_org_staff_select" ON public.centre_setup_progress
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff());

CREATE OR REPLACE FUNCTION public.create_sample_workspace(p_org uuid, p_actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suffix text := substr(replace(p_org::text, '-', ''), 1, 8);
  v_a uuid; v_b uuid; v_c uuid;
  v_maths uuid; v_science uuid; v_quadratic uuid;
  v_note text := 'SAMPLE workspace — generated, not a real learner. Remove from Settings.';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org) THEN
    RAISE EXCEPTION 'organization not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.learners WHERE org_id = p_org AND is_sample) THEN
    RAISE EXCEPTION 'sample workspace already exists';
  END IF;

  INSERT INTO public.learners (org_id, educator_id, full_name, handle, grade, subject, board, status, mastery_score, mastery_lift, focus_note, is_demo, is_sample, learner_mode)
  VALUES (p_org, p_actor, 'Learner A (SAMPLE)', 'sample-a-' || v_suffix, 10, 'Mathematics', 'CBSE', 'active', 55, 0, v_note, true, true, 'centre_managed')
  RETURNING id INTO v_a;
  INSERT INTO public.learners (org_id, educator_id, full_name, handle, grade, subject, board, status, mastery_score, mastery_lift, focus_note, is_demo, is_sample, learner_mode)
  VALUES (p_org, p_actor, 'Learner B (SAMPLE)', 'sample-b-' || v_suffix, 10, 'Science', 'CBSE', 'active', 82, 0, v_note, true, true, 'centre_managed')
  RETURNING id INTO v_b;
  INSERT INTO public.learners (org_id, educator_id, full_name, handle, grade, subject, board, status, mastery_score, mastery_lift, focus_note, is_demo, is_sample, learner_mode)
  VALUES (p_org, p_actor, 'Learner C (SAMPLE)', 'sample-c-' || v_suffix, 9, 'Mathematics', 'CBSE', 'needs_attention', 48, 0, v_note, true, true, 'centre_managed')
  RETURNING id INTO v_c;
  INSERT INTO public.learners (org_id, educator_id, full_name, handle, grade, subject, board, status, mastery_score, mastery_lift, focus_note, is_demo, is_sample, learner_mode)
  VALUES (p_org, p_actor, 'Learner D (SAMPLE)', 'sample-d-' || v_suffix, 10, 'Science', 'State Board', 'active', 67, 0, v_note, true, true, 'centre_managed');
  INSERT INTO public.learners (org_id, educator_id, full_name, handle, grade, subject, board, status, mastery_score, mastery_lift, focus_note, is_demo, is_sample, learner_mode)
  VALUES (p_org, p_actor, 'Learner E (SAMPLE)', 'sample-e-' || v_suffix, 9, 'Mathematics', 'State Board', 'active', 73, 0, v_note, true, true, 'centre_managed');

  INSERT INTO public.assessments (org_id, created_by, title, description, subject, topic, grade, kind, status, is_demo, is_sample)
  VALUES (p_org, p_actor, 'SAMPLE · Mathematics — Algebra diagnostic', 'Sample workspace content. Not real assessment data.', 'Mathematics', 'Algebra', 10, 'diagnostic', 'published', true, true)
  RETURNING id INTO v_maths;
  INSERT INTO public.assessments (org_id, created_by, title, description, subject, topic, grade, kind, status, is_demo, is_sample)
  VALUES (p_org, p_actor, 'SAMPLE · Science — Chemical Reactions diagnostic', 'Sample workspace content. Not real assessment data.', 'Science', 'Chemical Reactions and Equations', 10, 'diagnostic', 'published', true, true)
  RETURNING id INTO v_science;
  INSERT INTO public.assessments (org_id, created_by, title, description, subject, topic, grade, kind, status, is_demo, is_sample)
  VALUES (p_org, p_actor, 'SAMPLE · Mathematics — Quadratic Equations diagnostic', 'Sample workspace content. Not real assessment data.', 'Mathematics', 'Quadratic Equations', 10, 'diagnostic', 'published', true, true)
  RETURNING id INTO v_quadratic;

  INSERT INTO public.assessment_sessions (org_id, assessment_id, learner_id, assigned_by, status, score_pct, correct_count, total_count, started_at, last_activity_at, submitted_at, is_sample)
  VALUES
    (p_org, v_maths, v_a, p_actor, 'submitted', 55, 11, 20, now() - interval '2 days', now() - interval '2 days', now() - interval '2 days', true),
    (p_org, v_science, v_b, p_actor, 'submitted', 82, 16, 20, now() - interval '1 day', now() - interval '1 day', now() - interval '1 day', true),
    (p_org, v_quadratic, v_c, p_actor, 'assigned', NULL, NULL, NULL, NULL, NULL, NULL, true);

  INSERT INTO public.sample_workspace_events (org_id, action, actor_user_id, learners_count, assessments_count, sessions_count)
  VALUES (p_org, 'created', p_actor, 5, 3, 3);

  INSERT INTO public.centre_setup_progress (org_id, sample_created_at, sample_removed_at, updated_at)
  VALUES (p_org, now(), NULL, now())
  ON CONFLICT (org_id) DO UPDATE
    SET sample_created_at = now(), sample_removed_at = NULL, updated_at = now();

  RETURN jsonb_build_object('learners', 5, 'assessments', 3, 'sessions', 3);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_sample_workspace(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sample_workspace(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.remove_sample_workspace(p_org uuid, p_actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sessions integer := 0;
  v_assessments integer := 0;
  v_learners integer := 0;
BEGIN
  WITH d AS (
    DELETE FROM public.assessment_sessions
    WHERE org_id = p_org
      AND (is_sample
           OR learner_id IN (SELECT id FROM public.learners WHERE org_id = p_org AND is_sample)
           OR assessment_id IN (SELECT id FROM public.assessments WHERE org_id = p_org AND is_sample))
    RETURNING 1
  ) SELECT count(*) INTO v_sessions FROM d;

  WITH d AS (
    DELETE FROM public.assessments WHERE org_id = p_org AND is_sample RETURNING 1
  ) SELECT count(*) INTO v_assessments FROM d;

  WITH d AS (
    DELETE FROM public.learners WHERE org_id = p_org AND is_sample RETURNING 1
  ) SELECT count(*) INTO v_learners FROM d;

  INSERT INTO public.sample_workspace_events (org_id, action, actor_user_id, learners_count, assessments_count, sessions_count)
  VALUES (p_org, 'removed', p_actor, v_learners, v_assessments, v_sessions);

  INSERT INTO public.centre_setup_progress (org_id, sample_removed_at, updated_at)
  VALUES (p_org, now(), now())
  ON CONFLICT (org_id) DO UPDATE
    SET sample_removed_at = now(), updated_at = now();

  RETURN jsonb_build_object('learners', v_learners, 'assessments', v_assessments, 'sessions', v_sessions);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.remove_sample_workspace(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_sample_workspace(uuid, uuid) TO service_role;