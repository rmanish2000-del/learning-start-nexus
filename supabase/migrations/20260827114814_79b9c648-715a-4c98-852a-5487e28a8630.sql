-- 1. Pilot content gate: verify the imported Class 10 pool.
UPDATE public.question_bank q
SET verification_state = 'verified',
    verified_by = 'ddddddd1-0000-4000-8000-000000000001'::uuid,
    verified_at = now(),
    verification_note = 'Pilot gate batch 1 (2026-08-27): NCERT-aligned controlled import; structural review passed - outcome linkage, kind, difficulty, non-empty correct_answer and explanation.'
WHERE q.source = 'import'
  AND q.status = 'approved'
  AND q.correct_answer IS NOT NULL AND length(trim(q.correct_answer)) > 0
  AND q.explanation IS NOT NULL AND length(trim(q.explanation)) > 20
  AND q.difficulty IS NOT NULL
  AND q.outcome_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS question_bank_book_status_verification_idx
  ON public.question_bank (book_id, status, verification_state);

-- 2. Parent order expiry handling.
ALTER TABLE public.parent_orders DROP CONSTRAINT IF EXISTS parent_orders_status_check;
ALTER TABLE public.parent_orders ADD CONSTRAINT parent_orders_status_check
  CHECK (status = ANY (ARRAY['created'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'expired'::text]));

CREATE OR REPLACE FUNCTION public.expire_stale_parent_orders(older_than interval DEFAULT interval '24 hours')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.parent_orders
  SET status = 'expired',
      failure_reason = coalesce(failure_reason, 'Checkout was never started at the gateway; expired automatically.')
  WHERE status = 'created'
    AND provider_order_id IS NULL
    AND paid_at IS NULL
    AND created_at < now() - older_than;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_parent_orders(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_parent_orders(interval) TO service_role;

SELECT public.expire_stale_parent_orders();

-- 3. Archive the duplicate single-chapter Science book (no deletion).
UPDATE public.books
SET archived_at = now(), status = 'archived'
WHERE id = '26ac60d7-794d-4805-8cdb-5b73bcb40c53'::uuid
  AND archived_at IS NULL;