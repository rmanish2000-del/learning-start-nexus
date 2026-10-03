SELECT 'table:' || tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
 'remediation_snapshots','remediation_actions','remediation_work_items','question_pool_exclusions','sme_review_queue',
 'legacy_verification_quarantine','engine_rerun_results','automated_review_imports','automated_provisional_outcomes',
 'automated_review_rollback_events','question_marking_specs','question_content_revisions','curriculum_source_register',
 'question_originality_checks','question_commercial_release','founder_access_denials','feedback_submissions')
UNION ALL SELECT 'view:' || viewname FROM pg_views WHERE schemaname = 'public' AND viewname IN ('production_release_pool','automated_provisional_question_outcomes','internal_automated_provisional_pool')
UNION ALL SELECT 'policy:' || tablename || '.' || policyname FROM pg_policies WHERE schemaname = 'public'
UNION ALL SELECT 'trigger:' || c.relname || '.' || t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND NOT t.tgisinternal
UNION ALL SELECT 'column:pilot_leads.' || column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pilot_leads' AND column_name IN ('owner_notified_at','owner_notification_error')
UNION ALL SELECT 'view_option:production_release_pool=' || coalesce((SELECT array_to_string(reloptions, ',') FROM pg_class WHERE relname = 'production_release_pool' AND relkind = 'v'), 'none')
UNION ALL SELECT 'function:is_platform_owner_confirmed=' || coalesce((SELECT (prosrc LIKE '%email_confirmed_at IS NOT NULL%')::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'is_platform_owner'), 'absent')
ORDER BY 1;
