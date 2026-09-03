-- SME review workflow hardening: append-only audit trail, no bulk approval,
-- explicit-approve-only promotion.

REVOKE UPDATE, DELETE, TRUNCATE ON public.question_verifications FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.question_verifications FROM anon;

-- 1. Append-only: block any change or removal of a recorded decision,
--    including through the service role.
CREATE OR REPLACE FUNCTION public.question_verifications_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'question_verifications is append-only; decisions cannot be % ',
    lower(TG_OP);
END;
$$;

DROP TRIGGER IF EXISTS question_verifications_no_update_trg ON public.question_verifications;
CREATE TRIGGER question_verifications_no_update_trg
  BEFORE UPDATE ON public.question_verifications
  FOR EACH ROW EXECUTE FUNCTION public.question_verifications_append_only();

DROP TRIGGER IF EXISTS question_verifications_no_delete_trg ON public.question_verifications;
CREATE TRIGGER question_verifications_no_delete_trg
  BEFORE DELETE ON public.question_verifications
  FOR EACH ROW EXECUTE FUNCTION public.question_verifications_append_only();

-- 2. No bulk approval: one deliberate decision per statement.
CREATE OR REPLACE FUNCTION public.question_verifications_no_bulk()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM new_rows;
  IF n > 1 THEN
    RAISE EXCEPTION 'Bulk verification is not permitted; record one reviewer decision at a time';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS question_verifications_no_bulk_trg ON public.question_verifications;
CREATE TRIGGER question_verifications_no_bulk_trg
  AFTER INSERT ON public.question_verifications
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.question_verifications_no_bulk();

-- 3. Only an explicit approve decision promotes a question into the
--    approved pool. A rejection never promotes.
CREATE OR REPLACE FUNCTION public.apply_question_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.question_bank
  SET verification_state = NEW.action,
      verified_by = NEW.reviewer_id,
      verified_at = NEW.created_at,
      verification_note = NEW.note,
      status = CASE WHEN NEW.action = 'verified' THEN 'approved' ELSE status END
  WHERE id = NEW.question_id
    AND org_id = NEW.org_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_question_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.question_verifications_append_only() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.question_verifications_no_bulk() FROM PUBLIC, anon, authenticated;