CREATE TABLE public.parent_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref text NOT NULL UNIQUE,
  access_token text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('diagnostic','board_success_plan')),
  amount_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed','refunded')),
  provider text NOT NULL DEFAULT 'simulated',
  provider_payment_ref text,
  board text,
  grade integer,
  subject text,
  book_id uuid REFERENCES public.books(id),
  unit_id uuid REFERENCES public.curriculum_units(id),
  contact_name text,
  contact_email text,
  contact_phone text,
  child_first_name text,
  org_id uuid REFERENCES public.organizations(id),
  learner_id uuid REFERENCES public.learners(id),
  assessment_id uuid REFERENCES public.assessments(id),
  session_id uuid REFERENCES public.assessment_sessions(id),
  parent_order_id uuid REFERENCES public.parent_orders(id),
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.parent_orders TO authenticated;
GRANT ALL ON public.parent_orders TO service_role;
ALTER TABLE public.parent_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_orders_admin_read" ON public.parent_orders FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE TABLE public.parent_entitlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.parent_orders(id) ON DELETE CASCADE,
  learner_id uuid REFERENCES public.learners(id),
  kind text NOT NULL CHECK (kind IN ('diagnostic_credit','board_success_plan')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.parent_entitlements TO authenticated;
GRANT ALL ON public.parent_entitlements TO service_role;
ALTER TABLE public.parent_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_entitlements_admin_read" ON public.parent_entitlements FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE INDEX parent_orders_status_idx ON public.parent_orders(status, created_at DESC);
CREATE INDEX parent_entitlements_order_idx ON public.parent_entitlements(order_id);

CREATE TRIGGER parent_orders_touch BEFORE UPDATE ON public.parent_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

UPDATE public.question_bank q
SET status = 'approved'
WHERE q.source = 'import'
  AND q.status = 'draft'
  AND EXISTS (SELECT 1 FROM public.books b WHERE b.id = q.book_id AND b.grade = 10);