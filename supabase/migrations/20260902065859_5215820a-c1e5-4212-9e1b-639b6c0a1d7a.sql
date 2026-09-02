REVOKE SELECT ON public.catalogue_subjects FROM anon;
GRANT SELECT (
  id, academic_year_id, board_id, class_id, stream_id, subject_key, code,
  display_name, commercial_status, is_active, archived_at, version,
  diagnostic_eligible, diagnostic_minimum, diagnostic_target,
  min_questions_per_outcome, chapter_group_marks, reassessment_ready,
  created_at, updated_at
) ON public.catalogue_subjects TO anon;

ALTER TABLE public.pilot_leads
  ADD CONSTRAINT pilot_leads_email_format_check
  CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$' AND length(email) <= 254),
  ADD CONSTRAINT pilot_leads_contact_name_length_check
  CHECK (length(btrim(contact_name)) BETWEEN 1 AND 120),
  ADD CONSTRAINT pilot_leads_notes_length_check
  CHECK (notes IS NULL OR length(notes) <= 2000);