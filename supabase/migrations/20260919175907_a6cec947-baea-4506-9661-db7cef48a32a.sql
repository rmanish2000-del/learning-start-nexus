INSERT INTO public.question_pool_exclusions (org_id, question_id, external_ref, pool, reason, work_item_ref, active)
SELECT q.org_id, q.id, q.external_ref, 'paid',
  'Engine v1.0.0 quarantined; no named-SME approval. Not eligible for paid selection.',
  NULL, true
FROM public.question_bank q
JOIN public.question_auto_verifications av ON av.question_id = q.id AND av.outcome = 'quarantined'
ON CONFLICT (question_id, pool) DO NOTHING;

INSERT INTO public.remediation_work_items (org_id, ref, title, severity, status, details)
SELECT q.org_id, 'REASSESSMENT-146ec7c8-POOL-BREACH', 'Published reassessment 146ec7c8 served diagnostic-pool items (REQ001-DIAG-001/005/009)', 'P0', 'open',
  jsonb_build_object(
    'reassessment_id','146ec7c8',
    'requirements', jsonb_build_array('REQ001-DIAG-001','REQ001-DIAG-005','REQ001-DIAG-009'),
    'external_refs', jsonb_build_array('C10-2627-MATH-REQ001-DIAG-001','C10-2627-MATH-REQ001-DIAG-005','C10-2627-MATH-REQ001-DIAG-009'),
    'condition','C1',
    'action_taken','excluded from paid diagnostic capacity in production',
    'not_done', jsonb_build_array('no deletion','no silent pool reclassification'),
    'resolution_required_before','paid diagnostic reuse')
FROM public.question_bank q
WHERE q.external_ref = 'C10-2627-MATH-REQ001-DIAG-001'
ON CONFLICT (ref) DO NOTHING;

INSERT INTO public.question_pool_exclusions (org_id, question_id, external_ref, pool, reason, work_item_ref, active)
SELECT q.org_id, q.id, q.external_ref, 'paid_diagnostic',
  'C1: served inside published reassessment 146ec7c8; excluded from paid diagnostic capacity until the pool breach is resolved.',
  'REASSESSMENT-146ec7c8-POOL-BREACH', true
FROM public.question_bank q
WHERE q.external_ref IN ('C10-2627-MATH-REQ001-DIAG-001','C10-2627-MATH-REQ001-DIAG-005','C10-2627-MATH-REQ001-DIAG-009')
ON CONFLICT (question_id, pool) DO NOTHING;