ALTER TABLE public.question_verifications
  ADD COLUMN IF NOT EXISTS reviewer_qualification text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS decision_basis text NOT NULL DEFAULT '';

ALTER TABLE public.question_verifications
  DROP CONSTRAINT IF EXISTS question_verifications_attribution_chk;
ALTER TABLE public.question_verifications
  ADD CONSTRAINT question_verifications_attribution_chk
  CHECK (length(btrim(reviewer_qualification)) >= 2 AND length(btrim(decision_basis)) >= 10) NOT VALID;

ALTER TABLE public.question_verifications
  DROP CONSTRAINT IF EXISTS question_verifications_action_check;
ALTER TABLE public.question_verifications
  ADD CONSTRAINT question_verifications_action_check
  CHECK (action IN ('verified', 'rejected', 'remediation_required', 'cannot_assess'));

CREATE OR REPLACE FUNCTION public.apply_question_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.question_bank
  SET verification_state = CASE
        WHEN NEW.action IN ('verified', 'rejected') THEN NEW.action
        ELSE verification_state
      END,
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