CREATE TABLE public.parent_learner_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, learner_id)
);
CREATE INDEX parent_learner_links_parent_idx ON public.parent_learner_links (parent_user_id);
CREATE INDEX parent_learner_links_learner_idx ON public.parent_learner_links (learner_id);

GRANT SELECT, INSERT, DELETE ON public.parent_learner_links TO authenticated;
GRANT ALL ON public.parent_learner_links TO service_role;

ALTER TABLE public.parent_learner_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "links_select" ON public.parent_learner_links
  FOR SELECT TO authenticated
  USING (
    org_id = private.current_org_id()
    AND (parent_user_id = auth.uid() OR private.is_staff() OR private.is_reviewer())
  );

CREATE POLICY "links_admin_insert" ON public.parent_learner_links
  FOR INSERT TO authenticated
  WITH CHECK (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "links_admin_delete" ON public.parent_learner_links
  FOR DELETE TO authenticated
  USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION private.is_parent_of(_learner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_learner_links pll
    WHERE pll.learner_id = _learner_id
      AND pll.parent_user_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_parent_of(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_parent_of(uuid) TO authenticated;

CREATE POLICY "learners_parent_select" ON public.learners
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_parent_of(id));

CREATE POLICY "consents_parent_select" ON public.guardian_consents
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_parent_of(learner_id));

CREATE POLICY "consents_parent_insert" ON public.guardian_consents
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = private.current_org_id()
    AND private.has_role(auth.uid(), 'parent'::app_role)
    AND private.is_parent_of(learner_id)
    AND recorded_by = auth.uid()
  );

CREATE POLICY "outcomes_parent_select" ON public.learner_outcomes
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_parent_of(learner_id));

CREATE POLICY "sessions_parent_select" ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_parent_of(learner_id));

CREATE POLICY "interventions_parent_select" ON public.interventions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_parent_of(learner_id));

CREATE POLICY "mastery_parent_select" ON public.mastery_history
  FOR SELECT TO authenticated
  USING (private.is_parent_of(learner_id));

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'fffffff1-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'meera.patel@eduos.dev', extensions.crypt('Parent#2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Patel"}', now(), now());

INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT id, email, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
FROM auth.users
WHERE email = 'meera.patel@eduos.dev';

-- The on_auth_user_created trigger already created the profile; pin it to Brightpath.
UPDATE public.profiles
SET org_id = '11111111-1111-4111-8111-111111111111', full_name = 'Meera Patel'
WHERE id = 'fffffff1-0000-4000-8000-000000000001';

INSERT INTO public.user_roles (user_id, role)
VALUES ('fffffff1-0000-4000-8000-000000000001', 'parent');

INSERT INTO public.parent_learner_links (org_id, parent_user_id, learner_id)
VALUES ('11111111-1111-4111-8111-111111111111', 'fffffff1-0000-4000-8000-000000000001', 'ccccccc1-0000-4000-8000-000000000001');