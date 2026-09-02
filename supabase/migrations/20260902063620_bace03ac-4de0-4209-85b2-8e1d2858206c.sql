ALTER TABLE public.pilot_leads
  ADD CONSTRAINT pilot_leads_email_format_check
  CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$' AND length(email) <= 254),
  ADD CONSTRAINT pilot_leads_contact_name_length_check
  CHECK (length(btrim(contact_name)) BETWEEN 1 AND 120),
  ADD CONSTRAINT pilot_leads_notes_length_check
  CHECK (notes IS NULL OR length(notes) <= 2000);