
DROP FUNCTION public.create_sample_workspace();
DROP FUNCTION public.remove_sample_workspace();

CREATE OR REPLACE FUNCTION public.create_sample_workspace(_org uuid, _actor uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid; v_n integer;
BEGIN
  IF _org IS NULL OR _actor IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_ws FROM public.sample_workspaces WHERE org_id = _org;
  IF v_ws IS NOT NULL THEN
    SELECT count(*) INTO v_n FROM public.sample_records WHERE workspace_id = v_ws;
    RETURN v_n;
  END IF;
  INSERT INTO public.sample_workspaces (org_id, created_by) VALUES (_org, _actor) RETURNING id INTO v_ws;
  INSERT INTO public.sample_records (workspace_id, org_id, kind, sample_key, label, payload) VALUES
    (v_ws, _org, 'learner', 'sample-a', 'Learner A', '{"class":10,"board":"CBSE","band":"Developing"}'),
    (v_ws, _org, 'learner', 'sample-b', 'Learner B', '{"class":10,"board":"CBSE","band":"Secure"}'),
    (v_ws, _org, 'learner', 'sample-c', 'Learner C', '{"class":9,"board":"CBSE","band":"Emerging"}'),
    (v_ws, _org, 'learner', 'sample-d', 'Learner D', '{"class":10,"board":"State","band":"Developing"}'),
    (v_ws, _org, 'learner', 'sample-e', 'Learner E', '{"class":9,"board":"State","band":"Secure"}'),
    (v_ws, _org, 'assessment', 'sample-asmt-1', 'Maths — Algebra', '{"subject":"Mathematics","class":10,"completion":80}'),
    (v_ws, _org, 'assessment', 'sample-asmt-2', 'Science — Chemical Reactions', '{"subject":"Science","class":10,"completion":60}'),
    (v_ws, _org, 'assessment', 'sample-asmt-3', 'Maths — Quadratic Equations', '{"subject":"Mathematics","class":10,"completion":40}'),
    (v_ws, _org, 'report', 'sample-report-1', 'Learner A — Maths', '{"learner":"Learner A","band":"Developing"}'),
    (v_ws, _org, 'report', 'sample-report-2', 'Learner B — Science', '{"learner":"Learner B","band":"Secure"}');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  INSERT INTO public.sample_workspace_events (org_id, actor_id, action, record_count) VALUES (_org, _actor, 'created', v_n);
  RETURN v_n;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_sample_workspace(_org uuid, _actor uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer := 0;
BEGIN
  IF _org IS NULL OR _actor IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.sample_records WHERE org_id = _org;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  DELETE FROM public.sample_workspaces WHERE org_id = _org;
  INSERT INTO public.sample_workspace_events (org_id, actor_id, action, record_count) VALUES (_org, _actor, 'removed', v_n);
  RETURN v_n;
END; $$;

REVOKE ALL ON FUNCTION public.create_sample_workspace(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_sample_workspace(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sample_workspace(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_sample_workspace(uuid, uuid) TO service_role;
