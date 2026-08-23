CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE public.app_role AS ENUM ('admin', 'educator', 'student');
CREATE TYPE public.learner_status AS ENUM ('active', 'needs_attention', 'paused');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text,
  email text,
  phone text,
  website text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE TABLE public.learners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  educator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  handle text NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9][a-z0-9._-]{1,29}$'),
  grade int NOT NULL CHECK (grade BETWEEN 1 AND 12),
  subject text NOT NULL DEFAULT 'Mathematics',
  status public.learner_status NOT NULL DEFAULT 'active',
  mastery_score int NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  mastery_lift numeric(5,1) NOT NULL DEFAULT 0,
  focus_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learners TO authenticated;
GRANT ALL ON public.learners TO service_role;
ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mastery_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  recorded_on date NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastery_history TO authenticated;
GRANT ALL ON public.mastery_history TO service_role;
ALTER TABLE public.mastery_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.learner_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL DEFAULT 'Mathematics',
  taken_on date,
  score int CHECK (score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'scheduled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_assessments TO authenticated;
GRANT ALL ON public.learner_assessments TO service_role;
ALTER TABLE public.learner_assessments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.learning_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  focus text NOT NULL,
  activity text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_plan_items TO authenticated;
GRANT ALL ON public.learning_plan_items TO service_role;
ALTER TABLE public.learning_plan_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.learner_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'worksheet' CHECK (kind IN ('worksheet', 'quiz', 'observation')),
  note text,
  recorded_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_evidence TO authenticated;
GRANT ALL ON public.learner_evidence TO service_role;
ALTER TABLE public.learner_evidence ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.learning_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL DEFAULT 'Mathematics',
  kind text NOT NULL DEFAULT 'practice' CHECK (kind IN ('lesson', 'practice', 'review')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_pct int NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  due date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_items TO authenticated;
GRANT ALL ON public.learning_items TO service_role;
ALTER TABLE public.learning_items ENABLE ROW LEVEL SECURITY;

-- Auto-create a profile for every new account
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, org_id, full_name)
  VALUES (
    NEW.id,
    (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_learners BEFORE UPDATE ON public.learners FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_learning_items BEFORE UPDATE ON public.learning_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS policies
CREATE POLICY "Authenticated users can view the organization"
  ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update the organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view profiles in their workspace"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'));
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own roles; admins read all"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Learner visibility by role"
  ON public.learners FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR educator_id = auth.uid()
    OR student_user_id = auth.uid()
  );
CREATE POLICY "Staff can add learners"
  ON public.learners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'));
CREATE POLICY "Staff can update their learners"
  ON public.learners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR educator_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR educator_id = auth.uid());
CREATE POLICY "Admins can delete learners"
  ON public.learners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mastery history visibility"
  ON public.mastery_history FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.learners l
      WHERE l.id = learner_id AND (l.educator_id = auth.uid() OR l.student_user_id = auth.uid())
    )
  );
CREATE POLICY "Admins manage mastery history"
  ON public.mastery_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Assessment visibility"
  ON public.learner_assessments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.learners l
      WHERE l.id = learner_id AND (l.educator_id = auth.uid() OR l.student_user_id = auth.uid())
    )
  );
CREATE POLICY "Admins manage assessments"
  ON public.learner_assessments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Learning plan visibility"
  ON public.learning_plan_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.learners l
      WHERE l.id = learner_id AND (l.educator_id = auth.uid() OR l.student_user_id = auth.uid())
    )
  );
CREATE POLICY "Admins manage learning plans"
  ON public.learning_plan_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Evidence visibility"
  ON public.learner_evidence FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.learners l
      WHERE l.id = learner_id AND (l.educator_id = auth.uid() OR l.student_user_id = auth.uid())
    )
  );
CREATE POLICY "Admins manage evidence"
  ON public.learner_evidence FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Learning item visibility"
  ON public.learning_items FOR SELECT TO authenticated
  USING (
    student_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.learners l
      WHERE l.student_user_id = learning_items.student_user_id AND l.educator_id = auth.uid()
    )
  );
CREATE POLICY "Students update their own learning items"
  ON public.learning_items FOR UPDATE TO authenticated
  USING (student_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (student_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage learning items"
  ON public.learning_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete learning items"
  ON public.learning_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ DEMO SEED ============

INSERT INTO public.organizations (id, name, tagline, email, phone, website, timezone)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Brightpath Learning',
  'Learning intelligence for modern tutoring centers',
  'hello@brightpath.education',
  '+1 (415) 555-0132',
  'https://brightpath.education',
  'Asia/Kolkata'
);

-- Staff + student accounts (passwords hashed)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaa1-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@eduos.dev', extensions.crypt('Admin#2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Krishnan"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'eeeeeee1-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'priya.nair@eduos.dev', extensions.crypt('Teach#2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Nair"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'eeeeeee1-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'marcus.reed@eduos.dev', extensions.crypt('Teach#2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marcus Reed"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'eeeeeee1-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'sofia.alvarez@eduos.dev', extensions.crypt('Teach#2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sofia Alvarez"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'aarav@student.eduos.local', extensions.crypt('1234#aarav', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aarav Sharma"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'diya@student.eduos.local', extensions.crypt('1002#diya', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Diya Patel"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'rohan@student.eduos.local', extensions.crypt('1003#rohan', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rohan Mehta"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'ananya@student.eduos.local', extensions.crypt('1004#ananya', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ananya Iyer"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'kabir@student.eduos.local', extensions.crypt('1005#kabir', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kabir Singh"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'mia@student.eduos.local', extensions.crypt('1006#mia', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mia Thompson"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'ethan@student.eduos.local', extensions.crypt('1007#ethan', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ethan Walker"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'zara@student.eduos.local', extensions.crypt('1008#zara', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Zara Khan"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'lucas@student.eduos.local', extensions.crypt('1009#lucas', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lucas Silva"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'ishita@student.eduos.local', extensions.crypt('1010#ishita', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ishita Rao"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'noah@student.eduos.local', extensions.crypt('1011#noah', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Noah Bennett"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbb1-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'sara@student.eduos.local', extensions.crypt('1012#sara', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sara Ali"}', now(), now());

INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT id, email, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
FROM auth.users
WHERE email LIKE '%@eduos.dev' OR email LIKE '%@student.eduos.local';

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001', 'admin'),
  ('eeeeeee1-0000-4000-8000-000000000001', 'educator'),
  ('eeeeeee1-0000-4000-8000-000000000002', 'educator'),
  ('eeeeeee1-0000-4000-8000-000000000003', 'educator'),
  ('bbbbbbb1-0000-4000-8000-000000000001', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000002', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000003', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000004', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000005', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000006', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000007', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000008', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000009', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000010', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000011', 'student'),
  ('bbbbbbb1-0000-4000-8000-000000000012', 'student');

INSERT INTO public.learners (id, org_id, student_user_id, educator_id, full_name, handle, grade, subject, status, mastery_score, mastery_lift, focus_note)
VALUES
  ('ccccccc1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000001', 'eeeeeee1-0000-4000-8000-000000000001', 'Aarav Sharma', 'aarav', 6, 'Mathematics', 'active', 78, 14.5, 'Strengthening multi-step fraction problems; strong recent momentum.'),
  ('ccccccc1-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000002', 'eeeeeee1-0000-4000-8000-000000000001', 'Diya Patel', 'diya', 6, 'Mathematics', 'needs_attention', 54, -3.0, 'Struggling with ratio word problems; missed the last two sessions.'),
  ('ccccccc1-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000003', 'eeeeeee1-0000-4000-8000-000000000001', 'Rohan Mehta', 'rohan', 7, 'Mathematics', 'active', 82, 9.0, 'Pre-algebra readiness; solid one-step equation solving.'),
  ('ccccccc1-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000004', 'eeeeeee1-0000-4000-8000-000000000001', 'Ananya Iyer', 'ananya', 5, 'Mathematics', 'active', 71, 11.5, 'Building fluency with long division and remainders.'),
  ('ccccccc1-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000005', 'eeeeeee1-0000-4000-8000-000000000001', 'Kabir Singh', 'kabir', 8, 'Mathematics', 'paused', 66, 2.0, 'On a family break until September; resume quadratic intro.'),
  ('ccccccc1-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000006', 'eeeeeee1-0000-4000-8000-000000000002', 'Mia Thompson', 'mia', 6, 'Mathematics', 'active', 85, 12.0, 'Ready for enrichment: early percent-of-a-number problems.'),
  ('ccccccc1-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000007', 'eeeeeee1-0000-4000-8000-000000000002', 'Ethan Walker', 'ethan', 7, 'Mathematics', 'needs_attention', 49, -5.5, 'Confidence dip after fractions unit; needs wins on basics.'),
  ('ccccccc1-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000008', 'eeeeeee1-0000-4000-8000-000000000002', 'Zara Khan', 'zara', 5, 'Mathematics', 'active', 74, 8.5, 'Steady progress on multi-digit multiplication.'),
  ('ccccccc1-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000009', 'eeeeeee1-0000-4000-8000-000000000002', 'Lucas Silva', 'lucas', 8, 'Mathematics', 'active', 88, 10.0, 'Strong algebra foundations; introduce functions next.'),
  ('ccccccc1-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000010', 'eeeeeee1-0000-4000-8000-000000000003', 'Ishita Rao', 'ishita', 7, 'Mathematics', 'active', 79, 13.0, 'Great growth mindset; working on geometry proofs.'),
  ('ccccccc1-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000011', 'eeeeeee1-0000-4000-8000-000000000003', 'Noah Bennett', 'noah', 8, 'Mathematics', 'needs_attention', 58, -2.5, 'Slipping on linear equations; schedule a check-in.'),
  ('ccccccc1-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'bbbbbbb1-0000-4000-8000-000000000012', 'eeeeeee1-0000-4000-8000-000000000003', 'Sara Ali', 'sara', 5, 'Mathematics', 'active', 69, 7.5, 'Enjoys visual fraction models; extend to number line work.');

-- 8 weekly mastery points per learner, ending at their current score
INSERT INTO public.mastery_history (learner_id, recorded_on, score)
SELECT l.id,
       (CURRENT_DATE - ((7 - n) * 7))::date,
       GREATEST(5, LEAST(100, ROUND(l.mastery_score - l.mastery_lift * (7 - n) / 7.0)))::int
FROM public.learners l
CROSS JOIN generate_series(0, 7) AS n;

-- Aarav's assessment trail
INSERT INTO public.learner_assessments (learner_id, title, subject, taken_on, score, status)
VALUES
  ('ccccccc1-0000-4000-8000-000000000001', 'Fractions Foundations Quiz', 'Mathematics', (CURRENT_DATE - 48)::date, 78, 'completed'),
  ('ccccccc1-0000-4000-8000-000000000001', 'Ratios & Proportions Checkpoint', 'Mathematics', (CURRENT_DATE - 34)::date, 84, 'completed'),
  ('ccccccc1-0000-4000-8000-000000000001', 'Geometry Basics Review', 'Mathematics', (CURRENT_DATE - 20)::date, 71, 'completed'),
  ('ccccccc1-0000-4000-8000-000000000001', 'Decimals & Percentages Unit Test', 'Mathematics', (CURRENT_DATE - 6)::date, 88, 'completed'),
  ('ccccccc1-0000-4000-8000-000000000001', 'Multi-step Word Problems', 'Mathematics', (CURRENT_DATE + 7)::date, NULL, 'scheduled');

-- Two assessments for every other learner
INSERT INTO public.learner_assessments (learner_id, title, subject, taken_on, score, status)
SELECT l.id, v.title, 'Mathematics', (CURRENT_DATE - v.days_ago)::date,
       GREATEST(30, LEAST(98, l.mastery_score + v.delta))::int, 'completed'
FROM public.learners l
CROSS JOIN (VALUES
  ('Foundations Skills Quiz', 42, -16),
  ('Unit Checkpoint', 13, -4)
) AS v(title, days_ago, delta)
WHERE l.handle <> 'aarav';

-- Aarav's learning plan
INSERT INTO public.learning_plan_items (learner_id, sort_order, focus, activity, status, target_date)
VALUES
  ('ccccccc1-0000-4000-8000-000000000001', 1, 'Fractions', 'Multi-step fraction word problems with mixed numbers', 'completed', (CURRENT_DATE - 39)::date),
  ('ccccccc1-0000-4000-8000-000000000001', 2, 'Ratios', 'Ratio tables and equivalent ratios practice set', 'completed', (CURRENT_DATE - 25)::date),
  ('ccccccc1-0000-4000-8000-000000000001', 3, 'Geometry', 'Area of composite figures — guided worksheet', 'in_progress', (CURRENT_DATE + 4)::date),
  ('ccccccc1-0000-4000-8000-000000000001', 4, 'Decimals', 'Decimal-to-percentage conversion drills', 'in_progress', (CURRENT_DATE + 7)::date),
  ('ccccccc1-0000-4000-8000-000000000001', 5, 'Word Problems', 'Two-step word problems benchmark prep', 'not_started', (CURRENT_DATE + 12)::date);

-- A light plan for every other learner
INSERT INTO public.learning_plan_items (learner_id, sort_order, focus, activity, status, target_date)
SELECT l.id, v.sort_order, v.focus, v.activity, v.status, (CURRENT_DATE + v.offset_days)::date
FROM public.learners l
CROSS JOIN (VALUES
  (1, 'Core Skills', 'Weekly core-skill practice block', 'in_progress', 6),
  (2, 'Review', 'Spaced review checkpoint with educator', 'not_started', 11)
) AS v(sort_order, focus, activity, status, offset_days)
WHERE l.handle <> 'aarav';

-- Evidence samples
INSERT INTO public.learner_evidence (learner_id, title, kind, note, recorded_on)
VALUES
  ('ccccccc1-0000-4000-8000-000000000001', 'Fractions worksheet — Week 3', 'worksheet', 'Completed 18/20; errors concentrated on mixed-number conversion.', (CURRENT_DATE - 45)::date),
  ('ccccccc1-0000-4000-8000-000000000001', 'Ratio table exit ticket', 'quiz', 'Scored 5/5; strong grasp of equivalent ratios.', (CURRENT_DATE - 31)::date),
  ('ccccccc1-0000-4000-8000-000000000001', 'Composite figures classwork', 'worksheet', 'Needed prompts for triangle area; revisit with grid models.', (CURRENT_DATE - 17)::date),
  ('ccccccc1-0000-4000-8000-000000000001', 'Educator observation note', 'observation', 'Confidently explained decimal conversions to a peer today.', (CURRENT_DATE - 4)::date),
  ('ccccccc1-0000-4000-8000-000000000002', 'Ratio word problem set', 'worksheet', 'Stopped after question 3; signs of frustration with multi-step text.', (CURRENT_DATE - 5)::date),
  ('ccccccc1-0000-4000-8000-000000000007', 'Fractions exit ticket', 'quiz', 'Scored 2/5; revisit common denominators before moving on.', (CURRENT_DATE - 3)::date),
  ('ccccccc1-0000-4000-8000-000000000011', 'Linear equations practice', 'worksheet', 'Sign errors on negative coefficients in 4 of 10 items.', (CURRENT_DATE - 2)::date);

-- Learning items for every student (powers student Home / Learning pages)
INSERT INTO public.learning_items (student_user_id, title, subject, kind, status, progress_pct, due)
SELECT l.student_user_id, v.title, 'Mathematics', v.kind, v.status, v.progress, (CURRENT_DATE + v.due_offset)::date
FROM public.learners l
CROSS JOIN (VALUES
  ('Fraction Word Problems — Set B', 'practice', 'not_started', 0, 0),
  ('Decimal Conversion Sprint', 'practice', 'in_progress', 35, 0),
  ('Ratio Tables Review', 'review', 'not_started', 0, 1),
  ('Geometry Basics Recap', 'review', 'completed', 100, -2)
) AS v(title, kind, status, progress, due_offset)
WHERE l.student_user_id IS NOT NULL;

-- Aarav's current lesson (drives Continue Learning)
INSERT INTO public.learning_items (student_user_id, title, subject, kind, status, progress_pct, due)
VALUES
  ('bbbbbbb1-0000-4000-8000-000000000001', 'Area of Composite Figures', 'Mathematics', 'lesson', 'in_progress', 60, (CURRENT_DATE + 1)::date),
  ('bbbbbbb1-0000-4000-8000-000000000001', 'Multi-step Word Problems Prep', 'Mathematics', 'lesson', 'not_started', 0, (CURRENT_DATE + 3)::date);