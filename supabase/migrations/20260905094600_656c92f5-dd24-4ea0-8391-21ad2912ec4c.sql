DROP VIEW IF EXISTS public.catalogue_public_subjects;

-- Public catalogue rows stay public...
CREATE POLICY "Anyone can read purchasable subjects"
ON public.catalogue_subjects
FOR SELECT
TO anon, authenticated
USING (
  commercial_status = 'purchasable'
  AND is_active
  AND archived_at IS NULL
);

-- ...but only public columns are granted. Reviewer identity and internal
-- review/threshold metadata are reachable only by service-role server code.
REVOKE SELECT ON public.catalogue_subjects FROM anon, authenticated;

GRANT SELECT (
  id, code, subject_key, display_name, version,
  board_id, academic_year_id, class_id, stream_id,
  commercial_status, is_active, archived_at, created_at, updated_at
) ON public.catalogue_subjects TO anon, authenticated;

GRANT ALL ON public.catalogue_subjects TO service_role;