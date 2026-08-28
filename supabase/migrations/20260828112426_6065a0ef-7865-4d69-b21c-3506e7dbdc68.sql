-- =====================================================================
-- Wave 0 — curriculum catalogue, versioning, entitlement and pricing
-- foundation. Additive and reversible. No existing row is modified in a
-- way that changes behaviour; no table or column is dropped.
-- =====================================================================

-- ------------------------------------------------------------------ boards
CREATE TABLE public.catalogue_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalogue_boards TO anon, authenticated;
GRANT INSERT, UPDATE ON public.catalogue_boards TO authenticated;
GRANT ALL ON public.catalogue_boards TO service_role;
ALTER TABLE public.catalogue_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active boards" ON public.catalogue_boards
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage boards" ON public.catalogue_boards
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_catalogue_boards BEFORE UPDATE ON public.catalogue_boards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------- academic years
CREATE TABLE public.catalogue_academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.catalogue_boards(id),
  code text NOT NULL,
  starts_on date,
  ends_on date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, code)
);
GRANT SELECT ON public.catalogue_academic_years TO anon, authenticated;
GRANT INSERT, UPDATE ON public.catalogue_academic_years TO authenticated;
GRANT ALL ON public.catalogue_academic_years TO service_role;
ALTER TABLE public.catalogue_academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active academic years" ON public.catalogue_academic_years
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage academic years" ON public.catalogue_academic_years
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_catalogue_academic_years BEFORE UPDATE ON public.catalogue_academic_years
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- --------------------------------------------------------------- classes
CREATE TABLE public.catalogue_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.catalogue_academic_years(id),
  class_level integer NOT NULL CHECK (class_level BETWEEN 1 AND 12),
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, class_level)
);
GRANT SELECT ON public.catalogue_classes TO anon, authenticated;
GRANT INSERT, UPDATE ON public.catalogue_classes TO authenticated;
GRANT ALL ON public.catalogue_classes TO service_role;
ALTER TABLE public.catalogue_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active classes" ON public.catalogue_classes
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage classes" ON public.catalogue_classes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_catalogue_classes BEFORE UPDATE ON public.catalogue_classes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- --------------------------------------------------------------- streams
CREATE TABLE public.catalogue_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalogue_streams TO anon, authenticated;
GRANT INSERT, UPDATE ON public.catalogue_streams TO authenticated;
GRANT ALL ON public.catalogue_streams TO service_role;
ALTER TABLE public.catalogue_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active streams" ON public.catalogue_streams
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage streams" ON public.catalogue_streams
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_catalogue_streams BEFORE UPDATE ON public.catalogue_streams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------- subjects (sellable unit)
CREATE TABLE public.catalogue_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.catalogue_boards(id),
  academic_year_id uuid NOT NULL REFERENCES public.catalogue_academic_years(id),
  class_id uuid NOT NULL REFERENCES public.catalogue_classes(id),
  stream_id uuid REFERENCES public.catalogue_streams(id),
  code text NOT NULL UNIQUE,
  subject_key text NOT NULL,
  display_name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES public.catalogue_subjects(id),
  is_active boolean NOT NULL DEFAULT false,
  commercial_status text NOT NULL DEFAULT 'draft'
    CHECK (commercial_status IN ('draft','content_review','pilot','purchasable','retired')),
  review_state text NOT NULL DEFAULT 'unreviewed'
    CHECK (review_state IN ('unreviewed','in_review','approved')),
  reviewer_id uuid,
  reviewer_name text,
  reviewed_at timestamptz,
  curriculum_approved boolean NOT NULL DEFAULT false,
  outcomes_reviewed boolean NOT NULL DEFAULT false,
  diagnostic_eligible boolean NOT NULL DEFAULT false,
  reassessment_ready boolean NOT NULL DEFAULT false,
  min_questions_per_outcome integer NOT NULL DEFAULT 1,
  diagnostic_target integer NOT NULL DEFAULT 20,
  diagnostic_minimum integer NOT NULL DEFAULT 5,
  chapter_group_marks integer NOT NULL DEFAULT 20,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, class_id, subject_key, version)
);
CREATE INDEX catalogue_subjects_lookup_idx
  ON public.catalogue_subjects (class_id, commercial_status) WHERE archived_at IS NULL;
GRANT SELECT ON public.catalogue_subjects TO anon, authenticated;
GRANT INSERT, UPDATE ON public.catalogue_subjects TO authenticated;
GRANT ALL ON public.catalogue_subjects TO service_role;
ALTER TABLE public.catalogue_subjects ENABLE ROW LEVEL SECURITY;
-- Only commercially available, unarchived entries are ever readable by the
-- app; drafts stay invisible to every selector.
CREATE POLICY "Anyone can read purchasable subjects" ON public.catalogue_subjects
  FOR SELECT TO anon, authenticated
  USING (commercial_status = 'purchasable' AND is_active AND archived_at IS NULL);
CREATE POLICY "Staff can read all subjects" ON public.catalogue_subjects
  FOR SELECT TO authenticated
  USING (private.is_staff() OR private.is_reviewer());
CREATE POLICY "Admins manage subjects" ON public.catalogue_subjects
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_catalogue_subjects BEFORE UPDATE ON public.catalogue_subjects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -------------------------------------------------------- subject sources
CREATE TABLE public.catalogue_subject_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_subject_id uuid NOT NULL REFERENCES public.catalogue_subjects(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.books(id),
  source_type text NOT NULL
    CHECK (source_type IN ('ncert_reference','board_syllabus','original','licensed')),
  internal_reference text NOT NULL,
  copyright_cleared boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX catalogue_subject_sources_book_idx
  ON public.catalogue_subject_sources (catalogue_subject_id, book_id) WHERE book_id IS NOT NULL;
GRANT SELECT ON public.catalogue_subject_sources TO authenticated;
GRANT ALL ON public.catalogue_subject_sources TO service_role;
ALTER TABLE public.catalogue_subject_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read subject sources" ON public.catalogue_subject_sources
  FOR SELECT TO authenticated USING (private.is_staff() OR private.is_reviewer());
CREATE POLICY "Admins manage subject sources" ON public.catalogue_subject_sources
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_catalogue_subject_sources BEFORE UPDATE ON public.catalogue_subject_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------ learner subject selections
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS stream_label text;

CREATE TABLE public.learner_subject_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  catalogue_subject_id uuid NOT NULL REFERENCES public.catalogue_subjects(id),
  source text NOT NULL DEFAULT 'parent' CHECK (source IN ('parent','centre','system')),
  selected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, catalogue_subject_id)
);
GRANT SELECT ON public.learner_subject_selections TO authenticated;
GRANT ALL ON public.learner_subject_selections TO service_role;
ALTER TABLE public.learner_subject_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learner circle can read selections" ON public.learner_subject_selections
  FOR SELECT TO authenticated
  USING (
    private.can_view_learner(learner_id)
    OR private.is_parent_of(learner_id)
    OR private.is_own_learner(learner_id)
  );
CREATE TRIGGER touch_learner_subject_selections BEFORE UPDATE ON public.learner_subject_selections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------- price bundles
CREATE TABLE public.price_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  class_id uuid REFERENCES public.catalogue_classes(id),
  bundle_type text NOT NULL DEFAULT 'class_bundle'
    CHECK (bundle_type IN ('class_bundle','selected_subject_bundle')),
  member_subject_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.price_bundles TO anon, authenticated;
GRANT ALL ON public.price_bundles TO service_role;
ALTER TABLE public.price_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active bundles" ON public.price_bundles
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage bundles" ON public.price_bundles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_price_bundles BEFORE UPDATE ON public.price_bundles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- --------------------------------------------------------------- price plans
CREATE TABLE public.price_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  display_name text NOT NULL,
  plan_type text NOT NULL
    CHECK (plan_type IN ('subject_diagnostic','subject_annual','class_bundle','selected_subject_bundle','centre_contract')),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  board_id uuid REFERENCES public.catalogue_boards(id),
  academic_year_id uuid REFERENCES public.catalogue_academic_years(id),
  class_id uuid REFERENCES public.catalogue_classes(id),
  stream_id uuid REFERENCES public.catalogue_streams(id),
  catalogue_subject_id uuid REFERENCES public.catalogue_subjects(id),
  bundle_id uuid REFERENCES public.price_bundles(id),
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  tax_mode text NOT NULL DEFAULT 'inactive' CHECK (tax_mode IN ('inactive','inclusive','exclusive')),
  tax_percent numeric NOT NULL DEFAULT 0,
  validity_days integer NOT NULL DEFAULT 365,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, effective_from)
);
GRANT SELECT ON public.price_plans TO anon, authenticated;
GRANT ALL ON public.price_plans TO service_role;
ALTER TABLE public.price_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active plans" ON public.price_plans
  FOR SELECT TO anon, authenticated
  USING (is_active AND effective_from <= now() AND (effective_to IS NULL OR effective_to > now()));
CREATE POLICY "Admins manage plans" ON public.price_plans
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_price_plans BEFORE UPDATE ON public.price_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------ discount rules
CREATE TABLE public.discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('coupon','credit','centre_override')),
  value_paise integer,
  value_percent numeric,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  max_uses integer,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discount_rules TO authenticated;
GRANT ALL ON public.discount_rules TO service_role;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discount rules" ON public.discount_rules
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_discount_rules BEFORE UPDATE ON public.discount_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------- centre contracts
CREATE TABLE public.centre_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  plan_code text NOT NULL,
  negotiated_amount_paise integer NOT NULL CHECK (negotiated_amount_paise >= 0),
  active_learner_cap integer,
  catalogue_subject_ids uuid[] NOT NULL DEFAULT '{}',
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.centre_contracts TO authenticated;
GRANT ALL ON public.centre_contracts TO service_role;
ALTER TABLE public.centre_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read their own centre contract" ON public.centre_contracts
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND private.is_staff());
CREATE POLICY "Admins manage centre contracts" ON public.centre_contracts
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_centre_contracts BEFORE UPDATE ON public.centre_contracts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------- entitlements
CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id),
  parent_user_id uuid REFERENCES auth.users(id),
  board_id uuid REFERENCES public.catalogue_boards(id),
  academic_year_id uuid REFERENCES public.catalogue_academic_years(id),
  class_level integer,
  stream_label text,
  catalogue_subject_id uuid REFERENCES public.catalogue_subjects(id),
  bundle_id uuid REFERENCES public.price_bundles(id),
  entitlement_type text NOT NULL CHECK (entitlement_type IN (
    'subject_diagnostic','subject_annual','class_bundle',
    'selected_subject_bundle','diagnostic_credit','centre_sponsored'
  )),
  sponsor_type text NOT NULL DEFAULT 'parent' CHECK (sponsor_type IN ('parent','centre')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','expired','revoked')),
  source_order_id uuid REFERENCES public.parent_orders(id),
  legacy_entitlement_id uuid REFERENCES public.parent_entitlements(id),
  credit_amount_paise integer,
  credit_consumed_at timestamptz,
  price_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One live entitlement per learner + type + subject/bundle + source order.
CREATE UNIQUE INDEX entitlements_unique_source_idx
  ON public.entitlements (learner_id, entitlement_type, coalesce(catalogue_subject_id, bundle_id, learner_id), coalesce(source_order_id, id));
CREATE UNIQUE INDEX entitlements_legacy_unique_idx
  ON public.entitlements (legacy_entitlement_id) WHERE legacy_entitlement_id IS NOT NULL;
CREATE INDEX entitlements_learner_idx ON public.entitlements (learner_id, status);
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learner circle can read entitlements" ON public.entitlements
  FOR SELECT TO authenticated
  USING (
    private.can_view_learner(learner_id)
    OR private.is_parent_of(learner_id)
    OR private.is_own_learner(learner_id)
  );
CREATE TRIGGER touch_entitlements BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------- additive links on existing tables
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS catalogue_subject_id uuid REFERENCES public.catalogue_subjects(id);
ALTER TABLE public.parent_orders ADD COLUMN IF NOT EXISTS catalogue_subject_id uuid REFERENCES public.catalogue_subjects(id);
ALTER TABLE public.parent_orders ADD COLUMN IF NOT EXISTS price_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.parent_entitlements ADD COLUMN IF NOT EXISTS catalogue_subject_id uuid REFERENCES public.catalogue_subjects(id);

-- =====================================================================
-- Backfill — CBSE 2026-27, Classes 9-12, and the two live Class 10 subjects
-- =====================================================================
WITH board AS (
  INSERT INTO public.catalogue_boards (code, display_name, is_active)
  VALUES ('CBSE', 'CBSE', true)
  RETURNING id
), yr AS (
  INSERT INTO public.catalogue_academic_years (board_id, code, starts_on, ends_on, is_active)
  SELECT id, '2026-27', DATE '2026-04-01', DATE '2027-03-31', true FROM board
  RETURNING id
), cls AS (
  INSERT INTO public.catalogue_classes (academic_year_id, class_level, display_name, is_active)
  SELECT yr.id, lvl, 'Class ' || lvl,
         -- Only Class 10 is live today; 9, 11 and 12 stay inactive.
         (lvl = 10)
  FROM yr, (VALUES (9),(10),(11),(12)) AS v(lvl)
  RETURNING id, class_level
)
INSERT INTO public.catalogue_subjects (
  board_id, academic_year_id, class_id, code, subject_key, display_name,
  version, is_active, commercial_status, review_state, reviewer_name, reviewed_at,
  curriculum_approved, outcomes_reviewed, diagnostic_eligible, reassessment_ready,
  min_questions_per_outcome, diagnostic_target, diagnostic_minimum, chapter_group_marks
)
SELECT (SELECT id FROM board), (SELECT id FROM yr), cls.id,
       'CBSE-2026-27-C10-' || s.key_code, s.subject_key, s.display_name,
       1, true, 'purchasable', 'approved', 'EduOS content review (Class 10 pilot)', now(),
       true, true, true, false,
       1, 20, 5, 20
FROM cls,
     (VALUES ('MAT','Mathematics','Mathematics'), ('SCI','Science','Science')) AS s(key_code, subject_key, display_name)
WHERE cls.class_level = 10;

-- Streams (inactive until Classes 11-12 are activated)
INSERT INTO public.catalogue_streams (code, display_name, is_active) VALUES
  ('SCIENCE', 'Science', false),
  ('COMMERCE', 'Commerce', false),
  ('HUMANITIES', 'Humanities', false);

-- Link existing CBSE Class 10 books to their catalogue subject.
UPDATE public.books b
SET catalogue_subject_id = cs.id
FROM public.catalogue_subjects cs
WHERE b.board = 'CBSE' AND b.grade = 10 AND b.subject = cs.subject_key
  AND cs.code LIKE 'CBSE-2026-27-C10-%'
  AND b.catalogue_subject_id IS NULL;

INSERT INTO public.catalogue_subject_sources (catalogue_subject_id, book_id, source_type, internal_reference, copyright_cleared, notes)
SELECT b.catalogue_subject_id, b.id, 'ncert_reference', b.title, true,
       'Backfilled from the existing Class 10 pilot content pack.'
FROM public.books b
WHERE b.catalogue_subject_id IS NOT NULL;

-- Link existing orders to the catalogue subject via their book.
UPDATE public.parent_orders o
SET catalogue_subject_id = b.catalogue_subject_id
FROM public.books b
WHERE o.book_id = b.id AND b.catalogue_subject_id IS NOT NULL
  AND o.catalogue_subject_id IS NULL;

-- Grandfather existing purchases into the new entitlements table (read model;
-- the legacy table stays authoritative for current code paths).
INSERT INTO public.entitlements (
  learner_id, org_id, parent_user_id, board_id, academic_year_id, class_level,
  catalogue_subject_id, entitlement_type, sponsor_type, status, source_order_id,
  legacy_entitlement_id, credit_amount_paise, credit_consumed_at, starts_at, expires_at, price_snapshot
)
SELECT pe.learner_id,
       l.org_id,
       pe.parent_user_id,
       (SELECT id FROM public.catalogue_boards WHERE code = 'CBSE'),
       (SELECT id FROM public.catalogue_academic_years WHERE code = '2026-27'),
       10,
       o.catalogue_subject_id,
       CASE WHEN pe.kind = 'diagnostic_credit' THEN 'diagnostic_credit' ELSE 'class_bundle' END,
       'parent',
       CASE WHEN pe.consumed_at IS NOT NULL THEN 'consumed'
            WHEN pe.expires_at IS NOT NULL AND pe.expires_at <= now() THEN 'expired'
            ELSE 'active' END,
       pe.order_id,
       pe.id,
       CASE WHEN pe.kind = 'diagnostic_credit' THEN 19900 ELSE NULL END,
       pe.consumed_at,
       pe.granted_at,
       pe.expires_at,
       jsonb_build_object('source', 'legacy_backfill', 'legacy_kind', pe.kind)
FROM public.parent_entitlements pe
JOIN public.learners l ON l.id = pe.learner_id
LEFT JOIN public.parent_orders o ON o.id = pe.order_id
WHERE pe.learner_id IS NOT NULL;

UPDATE public.parent_entitlements pe
SET catalogue_subject_id = o.catalogue_subject_id
FROM public.parent_orders o
WHERE pe.order_id = o.id AND o.catalogue_subject_id IS NOT NULL
  AND pe.catalogue_subject_id IS NULL;

-- Live pricing recorded as configuration. Values are identical to production.
INSERT INTO public.price_plans (
  code, display_name, plan_type, currency, board_id, academic_year_id, class_id,
  amount_paise, tax_mode, validity_days, is_active
)
SELECT p.code, p.display_name, p.plan_type, 'INR',
       (SELECT id FROM public.catalogue_boards WHERE code = 'CBSE'),
       (SELECT id FROM public.catalogue_academic_years WHERE code = '2026-27'),
       (SELECT c.id FROM public.catalogue_classes c
          JOIN public.catalogue_academic_years y ON y.id = c.academic_year_id
         WHERE c.class_level = 10 AND y.code = '2026-27'),
       p.amount_paise, 'inactive', p.validity_days, true
FROM (VALUES
  ('CBSE-2026-27-C10-DIAGNOSTIC', 'Class 10 subject diagnostic', 'subject_diagnostic', 19900, 365),
  ('CBSE-2026-27-C10-ANNUAL', 'Class 10 Board Success Plan (annual)', 'class_bundle', 299900, 365)
) AS p(code, display_name, plan_type, amount_paise, validity_days);

INSERT INTO public.discount_rules (code, kind, value_paise, conditions, is_active)
VALUES (
  'DIAGNOSTIC_CREDIT_199', 'credit', 19900,
  jsonb_build_object(
    'same_learner', true,
    'qualifying_plan_types', jsonb_build_array('class_bundle','selected_subject_bundle','subject_annual'),
    'window_days', 30,
    'max_applications', 1
  ),
  true
);