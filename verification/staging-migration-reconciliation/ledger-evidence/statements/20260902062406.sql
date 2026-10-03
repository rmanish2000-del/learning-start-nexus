REVOKE SELECT ON public.catalogue_subjects FROM anon;
GRANT SELECT (
  id, academic_year_id, board_id, class_id, stream_id, subject_key, code,
  display_name, commercial_status, is_active, archived_at, version,
  diagnostic_eligible, diagnostic_minimum, diagnostic_target,
  min_questions_per_outcome, chapter_group_marks, reassessment_ready,
  created_at, updated_at
) ON public.catalogue_subjects TO anon;