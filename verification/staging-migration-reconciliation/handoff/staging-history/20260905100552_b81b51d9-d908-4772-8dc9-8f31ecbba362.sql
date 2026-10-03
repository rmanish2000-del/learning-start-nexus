-- Helper: owning organisation of a book, resolved with owner rights so RLS on
-- catalogue_subject_sources cannot be bypassed or recursed through books.
CREATE OR REPLACE FUNCTION private.book_org_id(_book_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.org_id FROM public.books b WHERE b.id = _book_id
$$;

REVOKE ALL ON FUNCTION private.book_org_id(uuid) FROM PUBLIC, anon, authenticated;

-- 1) Internal catalogue source notes: same-organisation only.
DROP POLICY IF EXISTS "Staff can read subject sources" ON public.catalogue_subject_sources;
DROP POLICY IF EXISTS "Admins manage subject sources" ON public.catalogue_subject_sources;

CREATE POLICY "Same-org staff read subject sources"
ON public.catalogue_subject_sources
FOR SELECT
TO authenticated
USING (
  (private.is_staff() OR private.is_reviewer())
  AND (
    book_id IS NULL
    OR private.book_org_id(book_id) = private.current_org_id()
  )
);

CREATE POLICY "Same-org admins manage subject sources"
ON public.catalogue_subject_sources
FOR ALL
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND (
    book_id IS NULL
    OR private.book_org_id(book_id) = private.current_org_id()
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND (
    book_id IS NULL
    OR private.book_org_id(book_id) = private.current_org_id()
  )
);

-- 2) Public catalogue: expose only genuinely public fields, no reviewer identity
--    or internal review/threshold metadata.
DROP POLICY IF EXISTS "Anyone can read purchasable subjects" ON public.catalogue_subjects;

CREATE OR REPLACE VIEW public.catalogue_public_subjects
WITH (security_invoker = off) AS
  SELECT
    s.id,
    s.code,
    s.subject_key,
    s.display_name,
    s.version,
    s.board_id,
    s.academic_year_id,
    s.class_id,
    s.stream_id,
    s.commercial_status,
    s.is_active
  FROM public.catalogue_subjects s
  WHERE s.commercial_status = 'purchasable'
    AND s.is_active
    AND s.archived_at IS NULL;

GRANT SELECT ON public.catalogue_public_subjects TO anon, authenticated;