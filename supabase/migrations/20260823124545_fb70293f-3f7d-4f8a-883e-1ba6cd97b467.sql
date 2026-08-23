-- Phase 1 audit hardening: org isolation + 6-digit PINs + second demo org

CREATE OR REPLACE FUNCTION private.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION private.current_org_id() FROM anon, PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_org_id() TO authenticated;

DROP POLICY IF EXISTS "Users can view profiles in their workspace" ON public.profiles;
CREATE POLICY "Members view profiles in their own org"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR (org_id IS NOT NULL AND org_id = private.current_org_id())
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users update own profile; admins update org profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  auth.uid() = id
  OR (private.has_role(auth.uid(), 'admin') AND org_id = private.current_org_id())
)
WITH CHECK (
  auth.uid() = id
  OR (private.has_role(auth.uid(), 'admin') AND org_id = private.current_org_id())
);

DROP POLICY IF EXISTS "Users can read their own roles; admins read all" ON public.user_roles;
CREATE POLICY "Users read own roles; admins read org roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (
    private.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id AND p.org_id = private.current_org_id()
    )
  )
);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles in their org"
ON public.user_roles FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id AND p.org_id = private.current_org_id()
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id AND p.org_id = private.current_org_id()
  )
);

DROP POLICY IF EXISTS "Learner visibility by role" ON public.learners;
CREATE POLICY "Org-scoped learner visibility"
ON public.learners FOR SELECT TO authenticated
USING (
  org_id = private.current_org_id()
  AND (
    private.has_role(auth.uid(), 'admin')
    OR educator_id = auth.uid()
    OR student_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff can add learners" ON public.learners;
CREATE POLICY "Staff add learners to their org"
ON public.learners FOR INSERT TO authenticated
WITH CHECK (
  org_id = private.current_org_id()
  AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'educator'))
);

DROP POLICY IF EXISTS "Staff can update their learners" ON public.learners;
CREATE POLICY "Staff update learners in their org"
ON public.learners FOR UPDATE TO authenticated
USING (
  org_id = private.current_org_id()
  AND (private.has_role(auth.uid(), 'admin') OR educator_id = auth.uid())
)
WITH CHECK (
  org_id = private.current_org_id()
  AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'educator'))
);

DROP POLICY IF EXISTS "Admins can delete learners" ON public.learners;
CREATE POLICY "Admins delete learners in their org"
ON public.learners FOR DELETE TO authenticated
USING (org_id = private.current_org_id() AND private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Mastery history visibility" ON public.mastery_history;
CREATE POLICY "Mastery history visibility"
ON public.mastery_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.learners l WHERE l.id = mastery_history.learner_id));

DROP POLICY IF EXISTS "Admins manage mastery history" ON public.mastery_history;
CREATE POLICY "Admins manage mastery history"
ON public.mastery_history FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (SELECT 1 FROM public.learners l WHERE l.id = mastery_history.learner_id)
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (SELECT 1 FROM public.learners l WHERE l.id = mastery_history.learner_id)
);

DROP POLICY IF EXISTS "Assessment visibility" ON public.learner_assessments;
CREATE POLICY "Assessment visibility"
ON public.learner_assessments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learner_assessments.learner_id));

DROP POLICY IF EXISTS "Admins manage assessments" ON public.learner_assessments;
CREATE POLICY "Admins manage assessments"
ON public.learner_assessments FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learner_assessments.learner_id)
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learner_assessments.learner_id)
);

DROP POLICY IF EXISTS "Learning plan visibility" ON public.learning_plan_items;
CREATE POLICY "Learning plan visibility"
ON public.learning_plan_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learning_plan_items.learner_id));

DROP POLICY IF EXISTS "Admins manage learning plans" ON public.learning_plan_items;
CREATE POLICY "Admins manage learning plans"
ON public.learning_plan_items FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learning_plan_items.learner_id)
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learning_plan_items.learner_id)
);

DROP POLICY IF EXISTS "Evidence visibility" ON public.learner_evidence;
CREATE POLICY "Evidence visibility"
ON public.learner_evidence FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learner_evidence.learner_id));

DROP POLICY IF EXISTS "Admins manage evidence" ON public.learner_evidence;
CREATE POLICY "Admins manage evidence"
ON public.learner_evidence FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learner_evidence.learner_id)
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (SELECT 1 FROM public.learners l WHERE l.id = learner_evidence.learner_id)
);

DROP POLICY IF EXISTS "Learning item visibility" ON public.learning_items;
CREATE POLICY "Learning item visibility"
ON public.learning_items FOR SELECT TO authenticated
USING (
  student_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.student_user_id = learning_items.student_user_id
  )
);

DROP POLICY IF EXISTS "Admins manage learning items" ON public.learning_items;
CREATE POLICY "Admins manage learning items"
ON public.learning_items FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.student_user_id = learning_items.student_user_id
  )
);

DROP POLICY IF EXISTS "Students update their own learning items" ON public.learning_items;
CREATE POLICY "Students update their own learning items"
ON public.learning_items FOR UPDATE TO authenticated
USING (
  student_user_id = auth.uid()
  OR (
    private.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.learners l
      WHERE l.student_user_id = learning_items.student_user_id
    )
  )
)
WITH CHECK (
  student_user_id = auth.uid()
  OR (
    private.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.learners l
      WHERE l.student_user_id = learning_items.student_user_id
    )
  )
);

DROP POLICY IF EXISTS "Admins delete learning items" ON public.learning_items;
CREATE POLICY "Admins delete learning items"
ON public.learning_items FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM public.learners l
    WHERE l.student_user_id = learning_items.student_user_id
  )
);

UPDATE auth.users SET encrypted_password = extensions.crypt('123456#aarav', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'aarav@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201002#diya', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'diya@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201003#rohan', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'rohan@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201004#ananya', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'ananya@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201005#kabir', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'kabir@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201006#mia', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'mia@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201007#ethan', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'ethan@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201008#zara', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'zara@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201009#lucas', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'lucas@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201010#ishita', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'ishita@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201011#noah', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'noah@student.eduos.local';
UPDATE auth.users SET encrypted_password = extensions.crypt('201012#sara', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'sara@student.eduos.local';

INSERT INTO public.organizations (id, name, tagline, email, timezone)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  'Northstar Tutoring',
  'After-school math and reading pods',
  'hello@northstar.education',
  'America/New_York'
);

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'eeeeeee2-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'nina.osei@northstar.education', extensions.crypt('Teach#2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nina Osei"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb2-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'tom@student.eduos.local', extensions.crypt('654321#tom', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tom Okafor"}', now(), now());

INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT id, email, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
FROM auth.users
WHERE email IN ('nina.osei@northstar.education', 'tom@student.eduos.local');

UPDATE public.profiles
SET org_id = '22222222-2222-4222-8222-222222222222'
WHERE id IN ('eeeeeee2-0000-4000-8000-000000000001', 'bbbbbbb2-0000-4000-8000-000000000001');

UPDATE auth.users
SET confirmation_token = '', recovery_token = '', email_change = '',
    email_change_token_new = '', email_change_token_current = '',
    phone_change = '', phone_change_token = '', reauthentication_token = ''
WHERE email IN ('nina.osei@northstar.education', 'tom@student.eduos.local');

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('eeeeeee2-0000-4000-8000-000000000001', 'educator'),
  ('bbbbbbb2-0000-4000-8000-000000000001', 'student');

INSERT INTO public.learners (id, org_id, student_user_id, educator_id, full_name, handle, grade, subject, status, mastery_score, mastery_lift, focus_note)
VALUES (
  'ccccccc2-0000-4000-8000-000000000001',
  '22222222-2222-4222-8222-222222222222',
  'bbbbbbb2-0000-4000-8000-000000000001',
  'eeeeeee2-0000-4000-8000-000000000001',
  'Tom Okafor', 'tom', 4, 'Mathematics', 'active', 63, 6.0,
  'Northstar demo learner — invisible to Brightpath staff.'
);