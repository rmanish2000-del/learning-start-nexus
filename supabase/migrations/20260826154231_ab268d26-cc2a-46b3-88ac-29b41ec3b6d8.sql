ALTER TABLE public.parent_orders ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.parent_entitlements ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS board text;

CREATE INDEX IF NOT EXISTS parent_orders_parent_user_id_idx ON public.parent_orders (parent_user_id);
CREATE INDEX IF NOT EXISTS parent_entitlements_parent_user_id_idx ON public.parent_entitlements (parent_user_id);

GRANT SELECT ON public.parent_orders TO authenticated;
GRANT SELECT ON public.parent_entitlements TO authenticated;
GRANT ALL ON public.parent_orders TO service_role;
GRANT ALL ON public.parent_entitlements TO service_role;

DROP POLICY IF EXISTS parent_orders_owner_select ON public.parent_orders;
CREATE POLICY parent_orders_owner_select
  ON public.parent_orders
  FOR SELECT
  TO authenticated
  USING (parent_user_id = auth.uid());

DROP POLICY IF EXISTS parent_entitlements_owner_select ON public.parent_entitlements;
CREATE POLICY parent_entitlements_owner_select
  ON public.parent_entitlements
  FOR SELECT
  TO authenticated
  USING (parent_user_id = auth.uid());