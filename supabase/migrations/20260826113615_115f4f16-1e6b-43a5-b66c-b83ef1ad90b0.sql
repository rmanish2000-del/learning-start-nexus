
-- 1. Rollback vault (private schema, no Data API access)
CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS archive.cleanup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS archive.deleted_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES archive.cleanup_runs(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  row_pk text NOT NULL,
  payload jsonb NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS archive.flag_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES archive.cleanup_runs(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  row_pk text NOT NULL,
  column_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Archive semantics
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_status_check;
ALTER TABLE public.books ADD CONSTRAINT books_status_check
  CHECK (status = ANY (ARRAY['uploaded','processing','processed','approved','failed','archived']));
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  run uuid;
  grade3 uuid := '66000000-0000-4000-8000-000000000003';
  probe_ids uuid[] := ARRAY['6d078557-aea3-4fed-90df-0bec96fa2872','8079567c-87bf-4ee9-88f4-0383d7f40d97','ce93a163-5bf3-496e-90a4-141ce7be36b3']::uuid[];
  gap_probe uuid := '3968bf48-08b8-4d06-8674-20ec992eb666';
  dup_q uuid[] := ARRAY['a0e474d2-e330-432a-9fd8-83f235671ba5','cc28e1cb-0948-4b0c-bf57-9e0432f710e8','df8597de-646c-41e1-ad20-d5827744c2e9','9ea0aad0-7fbe-4888-9b50-0e74d9c28538','d0189f58-23b2-4f8a-889b-e304daf7a196']::uuid[];
  empty_dup uuid := 'a55e5512-0000-4000-8000-000000000001';
  r record;
BEGIN
  INSERT INTO archive.cleanup_runs(label, note)
  VALUES ('class10-launch-cleanup', 'Archive Grade 3 + Fractions pilot, delete probe residue and duplicate rows. Reversible via archive.deleted_rows / archive.flag_changes.')
  RETURNING id INTO run;

  -- 2a. Archive the Grade 3 GK pack (kept for audit centres)
  INSERT INTO archive.flag_changes(run_id, table_name, row_pk, column_name, old_value, new_value)
  SELECT run, 'books', id::text, 'status', status, 'archived' FROM public.books WHERE id = grade3;
  UPDATE public.books SET status = 'archived', is_demo = true, archived_at = now() WHERE id = grade3;

  -- 2b. Archive fractions-only pilot assessments (bookless legacy)
  INSERT INTO archive.flag_changes(run_id, table_name, row_pk, column_name, old_value, new_value)
  SELECT run, 'assessments', id::text, 'is_demo', 'false', 'true'
  FROM public.assessments WHERE book_id IS NULL AND id <> empty_dup;
  UPDATE public.assessments SET is_demo = true, archived_at = now()
  WHERE book_id IS NULL AND id <> empty_dup;

  -- 2c. Archive demo learners (grades other than 10)
  INSERT INTO archive.flag_changes(run_id, table_name, row_pk, column_name, old_value, new_value)
  SELECT run, 'learners', id::text, 'is_demo', 'false', 'true' FROM public.learners WHERE grade <> 10;
  UPDATE public.learners SET is_demo = true WHERE grade <> 10;

  -- 3. Junk / duplicate removal (snapshot first)
  -- 3a. probe assessments + their maps
  FOR r IN SELECT * FROM public.assessment_question_map WHERE assessment_id = ANY(probe_ids) LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload)
    VALUES (run, 'assessment_question_map', r.assessment_id::text||':'||r.question_id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.assessment_question_map WHERE assessment_id = ANY(probe_ids);

  FOR r IN SELECT * FROM public.assessment_item_map WHERE assessment_id = ANY(probe_ids) OR assessment_id = empty_dup LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload)
    VALUES (run, 'assessment_item_map', r.assessment_id::text||':'||r.item_id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.assessment_item_map WHERE assessment_id = ANY(probe_ids) OR assessment_id = empty_dup;

  FOR r IN SELECT * FROM public.assessments WHERE id = ANY(probe_ids) OR id = empty_dup LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload)
    VALUES (run, 'assessments', r.id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.assessments WHERE id = ANY(probe_ids) OR id = empty_dup;

  -- 3b. audit-probe learning gap and its dependents
  FOR r IN SELECT * FROM public.interventions WHERE gap_id = gap_probe LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload) VALUES (run, 'interventions', r.id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.interventions WHERE gap_id = gap_probe;
  FOR r IN SELECT * FROM public.recommendations WHERE gap_id = gap_probe LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload) VALUES (run, 'recommendations', r.id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.recommendations WHERE gap_id = gap_probe;
  FOR r IN SELECT * FROM public.learning_gaps WHERE id = gap_probe LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload) VALUES (run, 'learning_gaps', r.id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.learning_gaps WHERE id = gap_probe;

  -- 3c. duplicate questions (keep the earliest of each group)
  FOR r IN SELECT * FROM public.assessment_question_map WHERE question_id = ANY(dup_q) LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload)
    VALUES (run, 'assessment_question_map', r.assessment_id::text||':'||r.question_id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.assessment_question_map WHERE question_id = ANY(dup_q);

  FOR r IN SELECT * FROM public.question_verifications WHERE question_id = ANY(dup_q) LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload) VALUES (run, 'question_verifications', r.id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.question_verifications WHERE question_id = ANY(dup_q);

  FOR r IN SELECT * FROM public.question_bank WHERE id = ANY(dup_q) LOOP
    INSERT INTO archive.deleted_rows(run_id, table_name, row_pk, payload) VALUES (run, 'question_bank', r.id::text, to_jsonb(r));
  END LOOP;
  DELETE FROM public.question_bank WHERE id = ANY(dup_q);

  -- 3d. resequence sort_order for affected assessments
  FOR r IN SELECT DISTINCT assessment_id FROM public.assessment_question_map LOOP
    WITH ordered AS (
      SELECT question_id, row_number() OVER (ORDER BY sort_order, question_id) AS rn
      FROM public.assessment_question_map WHERE assessment_id = r.assessment_id
    )
    UPDATE public.assessment_question_map m SET sort_order = o.rn
    FROM ordered o WHERE m.assessment_id = r.assessment_id AND m.question_id = o.question_id AND m.sort_order <> o.rn;
  END LOOP;
END $$;
