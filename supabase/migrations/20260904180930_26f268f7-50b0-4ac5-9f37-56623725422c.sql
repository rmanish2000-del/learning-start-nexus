CREATE TABLE IF NOT EXISTS public.question_auto_verification_archive (
  archive_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  archive_reason text NOT NULL,
  id uuid NOT NULL,
  org_id uuid NOT NULL,
  question_id uuid NOT NULL,
  run_id uuid NOT NULL,
  engine_version text NOT NULL,
  outcome text NOT NULL,
  confidence numeric NOT NULL,
  checks jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL
);

GRANT SELECT ON public.question_auto_verification_archive TO authenticated;
GRANT ALL ON public.question_auto_verification_archive TO service_role;

ALTER TABLE public.question_auto_verification_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auto_verification_archive_select" ON public.question_auto_verification_archive;
CREATE POLICY "auto_verification_archive_select"
  ON public.question_auto_verification_archive FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY question_id, engine_version, outcome
           ORDER BY created_at, id
         ) AS rn
  FROM public.question_auto_verifications
)
INSERT INTO public.question_auto_verification_archive (
  archive_reason, id, org_id, question_id, run_id, engine_version,
  outcome, confidence, checks, created_by, created_at
)
SELECT 'duplicate_evidence_dedup_2026_09_04', v.id, v.org_id, v.question_id, v.run_id,
       v.engine_version, v.outcome, v.confidence, v.checks, v.created_by, v.created_at
FROM public.question_auto_verifications v
JOIN ranked r ON r.id = v.id
WHERE r.rn > 1;

ALTER TABLE public.question_auto_verifications DISABLE TRIGGER question_auto_verifications_no_delete;

DELETE FROM public.question_auto_verifications v
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY question_id, engine_version, outcome
           ORDER BY created_at, id
         ) AS rn
  FROM public.question_auto_verifications
) r
WHERE r.id = v.id AND r.rn > 1;

ALTER TABLE public.question_auto_verifications ENABLE TRIGGER question_auto_verifications_no_delete;

CREATE UNIQUE INDEX IF NOT EXISTS question_auto_verifications_unique_evidence
  ON public.question_auto_verifications (question_id, engine_version, outcome);