ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS assessments_client_request_id_key
  ON public.assessments (org_id, client_request_id)
  WHERE client_request_id IS NOT NULL;