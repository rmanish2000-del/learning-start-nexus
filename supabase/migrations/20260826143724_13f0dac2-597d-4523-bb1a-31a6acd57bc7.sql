ALTER TABLE public.parent_orders
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS failure_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS parent_orders_provider_order_id_key
  ON public.parent_orders (provider_order_id)
  WHERE provider_order_id IS NOT NULL;