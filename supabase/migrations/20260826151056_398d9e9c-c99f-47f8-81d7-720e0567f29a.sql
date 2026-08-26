CREATE TABLE public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'razorpay',
  event_id text,
  event_type text NOT NULL,
  provider_order_id text,
  provider_payment_id text,
  order_id uuid REFERENCES public.parent_orders(id) ON DELETE SET NULL,
  signature_valid boolean NOT NULL DEFAULT true,
  is_duplicate boolean NOT NULL DEFAULT false,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_webhook_events_event_id_idx ON public.payment_webhook_events (event_id);
CREATE INDEX payment_webhook_events_created_at_idx ON public.payment_webhook_events (created_at DESC);

GRANT SELECT ON public.payment_webhook_events TO authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and reviewers can read webhook events"
ON public.payment_webhook_events
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'reviewer'::public.app_role));