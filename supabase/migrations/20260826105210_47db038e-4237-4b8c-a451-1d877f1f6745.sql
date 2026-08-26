CREATE TABLE public.pilot_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  learner_count text,
  boards_grades text,
  timeline text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.pilot_leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.pilot_leads TO authenticated;
GRANT ALL ON public.pilot_leads TO service_role;

ALTER TABLE public.pilot_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone may submit a pilot application"
ON public.pilot_leads FOR INSERT TO anon, authenticated
WITH CHECK (
  length(centre_name) BETWEEN 1 AND 200
  AND length(contact_name) BETWEEN 1 AND 200
  AND length(email) BETWEEN 3 AND 320
  AND coalesce(length(notes), 0) <= 2000
  AND status = 'new'
);

CREATE POLICY "Admins can read pilot applications"
ON public.pilot_leads FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pilot applications"
ON public.pilot_leads FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));