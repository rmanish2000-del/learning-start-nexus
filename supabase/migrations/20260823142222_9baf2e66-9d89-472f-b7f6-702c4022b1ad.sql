-- RLS hardening sprint: learner_assessments, learner_evidence, learning_items,
-- learning_plan_items, mastery_history.
--
-- Problem: SELECT policies used EXISTS (SELECT ... FROM learners ...) evaluated
-- as the querying user, so they silently depended on the nested learners RLS
-- policy. Write policies had no explicit org isolation.
--
-- Fix: every check now goes through private-schema SECURITY DEFINER helpers
-- (owned by postgres, so they bypass nested RLS) that enforce, explicitly:
--   1. organization isolation  (learner.org_id = caller's org)
--   2. role checks             (admin / assigned educator / the student)
-- No policy below references another table's RLS-gated row visibility.

-- ---------------------------------------------------------------------------
-- Helper functions (private schema: never exposed through the Data API)
-- ---------------------------------------------------------------------------

-- Learner row exists in the caller's organization (org check only).
CREATE OR REPLACE FUNCTION private.learner_in_my_org(_learner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.id = _learner_id
      AND l.org_id = private.current_org_id()
  );
$$;

-- Read access: same org AND (admin OR assigned educator OR the student themself).
CREATE OR REPLACE FUNCTION private.can_view_learner(_learner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.id = _learner_id
      AND l.org_id = private.current_org_id()
      AND (
        private.has_role(auth.uid(), 'admin'::app_role)
        OR l.educator_id = auth.uid()
        OR l.student_user_id = auth.uid()
      )
  );
$$;

-- Write access: same org AND (admin OR assigned educator).
CREATE OR REPLACE FUNCTION private.can_manage_learner(_learner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.id = _learner_id
      AND l.org_id = private.current_org_id()
      AND (
        private.has_role(auth.uid(), 'admin'::app_role)
        OR l.educator_id = auth.uid()
      )
  );
$$;

-- Student-linked learner row exists in the caller's organization (org check only).
CREATE OR REPLACE FUNCTION private.student_in_my_org(_student_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.student_user_id = _student_user_id
      AND l.org_id = private.current_org_id()
  );
$$;

-- Staff read access to a student's data: same org AND (admin OR assigned educator).
CREATE OR REPLACE FUNCTION private.can_view_student(_student_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.student_user_id = _student_user_id
      AND l.org_id = private.current_org_id()
      AND (
        private.has_role(auth.uid(), 'admin'::app_role)
        OR l.educator_id = auth.uid()
      )
  );
$$;

-- Staff write access to a student's data: same org AND (admin OR assigned educator).
CREATE OR REPLACE FUNCTION private.can_manage_student(_student_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.student_user_id = _student_user_id
      AND l.org_id = private.current_org_id()
      AND (
        private.has_role(auth.uid(), 'admin'::app_role)
        OR l.educator_id = auth.uid()
      )
  );
$$;

-- Executable by authenticated sessions (for RLS evaluation) only; never by
-- anon/PUBLIC, and the private schema keeps them off the Data API entirely.
REVOKE EXECUTE ON FUNCTION private.learner_in_my_org(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION private.can_view_learner(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION private.can_manage_learner(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION private.student_in_my_org(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION private.can_view_student(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION private.can_manage_student(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION private.learner_in_my_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_learner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_learner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.student_in_my_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_student(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- learner_assessments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage assessments" ON public.learner_assessments;
DROP POLICY IF EXISTS "Assessment visibility" ON public.learner_assessments;

CREATE POLICY "assessments_select" ON public.learner_assessments
  FOR SELECT TO authenticated
  USING (private.can_view_learner(learner_id));

CREATE POLICY "assessments_insert" ON public.learner_assessments
  FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learner(learner_id));

CREATE POLICY "assessments_update" ON public.learner_assessments
  FOR UPDATE TO authenticated
  USING (private.can_manage_learner(learner_id))
  WITH CHECK (private.can_manage_learner(learner_id));

CREATE POLICY "assessments_delete" ON public.learner_assessments
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND private.learner_in_my_org(learner_id));

-- ---------------------------------------------------------------------------
-- learner_evidence
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage evidence" ON public.learner_evidence;
DROP POLICY IF EXISTS "Evidence visibility" ON public.learner_evidence;

CREATE POLICY "evidence_select" ON public.learner_evidence
  FOR SELECT TO authenticated
  USING (private.can_view_learner(learner_id));

CREATE POLICY "evidence_insert" ON public.learner_evidence
  FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learner(learner_id));

CREATE POLICY "evidence_update" ON public.learner_evidence
  FOR UPDATE TO authenticated
  USING (private.can_manage_learner(learner_id))
  WITH CHECK (private.can_manage_learner(learner_id));

CREATE POLICY "evidence_delete" ON public.learner_evidence
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND private.learner_in_my_org(learner_id));

-- ---------------------------------------------------------------------------
-- learning_plan_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage learning plans" ON public.learning_plan_items;
DROP POLICY IF EXISTS "Learning plan visibility" ON public.learning_plan_items;

CREATE POLICY "plan_items_select" ON public.learning_plan_items
  FOR SELECT TO authenticated
  USING (private.can_view_learner(learner_id));

CREATE POLICY "plan_items_insert" ON public.learning_plan_items
  FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learner(learner_id));

CREATE POLICY "plan_items_update" ON public.learning_plan_items
  FOR UPDATE TO authenticated
  USING (private.can_manage_learner(learner_id))
  WITH CHECK (private.can_manage_learner(learner_id));

CREATE POLICY "plan_items_delete" ON public.learning_plan_items
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND private.learner_in_my_org(learner_id));

-- ---------------------------------------------------------------------------
-- mastery_history
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage mastery history" ON public.mastery_history;
DROP POLICY IF EXISTS "Mastery history visibility" ON public.mastery_history;

CREATE POLICY "mastery_select" ON public.mastery_history
  FOR SELECT TO authenticated
  USING (private.can_view_learner(learner_id));

CREATE POLICY "mastery_insert" ON public.mastery_history
  FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learner(learner_id));

CREATE POLICY "mastery_update" ON public.mastery_history
  FOR UPDATE TO authenticated
  USING (private.can_manage_learner(learner_id))
  WITH CHECK (private.can_manage_learner(learner_id));

CREATE POLICY "mastery_delete" ON public.mastery_history
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND private.learner_in_my_org(learner_id));

-- ---------------------------------------------------------------------------
-- learning_items (keyed by student_user_id instead of learner_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins delete learning items" ON public.learning_items;
DROP POLICY IF EXISTS "Admins manage learning items" ON public.learning_items;
DROP POLICY IF EXISTS "Learning item visibility" ON public.learning_items;
DROP POLICY IF EXISTS "Students update their own learning items" ON public.learning_items;

CREATE POLICY "learning_items_select" ON public.learning_items
  FOR SELECT TO authenticated
  USING (student_user_id = auth.uid() OR private.can_view_student(student_user_id));

CREATE POLICY "learning_items_insert" ON public.learning_items
  FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_student(student_user_id));

CREATE POLICY "learning_items_update" ON public.learning_items
  FOR UPDATE TO authenticated
  USING (student_user_id = auth.uid() OR private.can_manage_student(student_user_id))
  WITH CHECK (student_user_id = auth.uid() OR private.can_manage_student(student_user_id));

CREATE POLICY "learning_items_delete" ON public.learning_items
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND private.student_in_my_org(student_user_id));