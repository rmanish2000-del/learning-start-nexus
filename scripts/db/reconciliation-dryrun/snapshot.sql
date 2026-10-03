-- Row-level fingerprint of the data the reconciliation must preserve.
SELECT 'feedback_submissions' AS t, count(*) AS n, md5(string_agg(id::text || '|' || message || '|' || route, ',' ORDER BY id)) AS h FROM public.feedback_submissions
UNION ALL SELECT 'remediation_snapshots', count(*), md5(string_agg(id::text || '|' || label || '|' || checksum || '|' || payload::text, ',' ORDER BY id)) FROM public.remediation_snapshots
UNION ALL SELECT 'remediation_actions', count(*), md5(string_agg(id::text || '|' || reason || '|' || prior_value::text || '|' || new_value::text, ',' ORDER BY id)) FROM public.remediation_actions
UNION ALL SELECT 'question_pool_exclusions', count(*), md5(coalesce(string_agg(question_id::text || '|' || pool || '|' || reason, ',' ORDER BY question_id, pool), '')) FROM public.question_pool_exclusions
UNION ALL SELECT 'remediation_work_items', count(*), md5(coalesce(string_agg(ref || '|' || title, ',' ORDER BY ref), '')) FROM public.remediation_work_items
ORDER BY 1;
