
CREATE OR REPLACE FUNCTION archive.rollback_cleanup(p_label text DEFAULT 'class10-launch-cleanup')
RETURNS TABLE(action text, table_name text, rows integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = archive, public
AS $$
DECLARE
  run uuid;
  t text;
  n integer;
  f record;
BEGIN
  SELECT id INTO run FROM archive.cleanup_runs WHERE label = p_label ORDER BY created_at DESC LIMIT 1;
  IF run IS NULL THEN RAISE EXCEPTION 'No cleanup run named %', p_label; END IF;

  -- 1. Restore deleted rows, parents before children.
  FOR t IN SELECT unnest(ARRAY[
      'learning_gaps','recommendations','interventions','question_bank',
      'question_verifications','assessments','assessment_question_map','assessment_item_map'])
  LOOP
    n := 0;
    FOR f IN SELECT payload FROM archive.deleted_rows WHERE run_id = run AND archive.deleted_rows.table_name = t LOOP
      EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT DO NOTHING', t, t)
        USING f.payload;
      n := n + 1;
    END LOOP;
    IF n > 0 THEN RETURN QUERY SELECT 'restored'::text, t, n; END IF;
  END LOOP;

  -- 2. Revert flag changes.
  FOR f IN SELECT * FROM archive.flag_changes WHERE run_id = run LOOP
    EXECUTE format('UPDATE public.%I SET %I = $1 WHERE id::text = $2', f.table_name, f.column_name)
      USING f.old_value, f.row_pk;
  END LOOP;
  UPDATE public.books SET archived_at = NULL WHERE id::text IN
    (SELECT row_pk FROM archive.flag_changes WHERE run_id = run AND archive.flag_changes.table_name = 'books');
  UPDATE public.assessments SET archived_at = NULL WHERE id::text IN
    (SELECT row_pk FROM archive.flag_changes WHERE run_id = run AND archive.flag_changes.table_name = 'assessments');
  RETURN QUERY SELECT 'flags reverted'::text, 'books/assessments/learners'::text,
    (SELECT count(*)::int FROM archive.flag_changes WHERE run_id = run);
END $$;

REVOKE ALL ON FUNCTION archive.rollback_cleanup(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION archive.rollback_cleanup(text) FROM anon, authenticated;
