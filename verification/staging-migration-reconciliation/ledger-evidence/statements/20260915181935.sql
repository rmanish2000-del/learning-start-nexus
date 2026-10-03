CREATE TABLE public.question_marking_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  spec_version integer NOT NULL DEFAULT 1,
  content_sha256 text NOT NULL,
  expected_conclusion text NOT NULL,
  required_reasoning jsonb NOT NULL DEFAULT '[]'::jsonb,
  acceptable_equivalents jsonb NOT NULL DEFAULT '[]'::jsonb,
  terminology jsonb NOT NULL DEFAULT '[]'::jsonb,
  units text,
  tolerance jsonb,
  common_mistakes jsonb NOT NULL DEFAULT '[]'::jsonb,
  minimum_passing_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  spec_sha256 text NOT NULL,
  authored_by text NOT NULL DEFAULT 'AUTOMATED_FOUNDER_AUTHORIZED',
  human_signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, spec_version)
);
GRANT SELECT ON public.question_marking_specs TO authenticated;
GRANT ALL ON public.question_marking_specs TO service_role;
ALTER TABLE public.question_marking_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_marking_specs_select" ON public.question_marking_specs
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE TABLE public.question_content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  revision_reason text NOT NULL,
  revision_kind text NOT NULL,
  before_content jsonb NOT NULL,
  after_content jsonb NOT NULL,
  before_sha256 text NOT NULL,
  after_sha256 text NOT NULL,
  applied boolean NOT NULL DEFAULT false,
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_content_revisions TO authenticated;
GRANT ALL ON public.question_content_revisions TO service_role;
ALTER TABLE public.question_content_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_content_revisions_select" ON public.question_content_revisions
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE TABLE public.curriculum_source_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  source_title text NOT NULL,
  source_url text,
  section_ref text,
  accessed_at date,
  checksum_sha256 text,
  alignment_note text,
  licence_status text NOT NULL DEFAULT 'NOT_ASSESSED',
  verbatim_copying boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, source_title, section_ref)
);
GRANT SELECT ON public.curriculum_source_register TO authenticated;
GRANT ALL ON public.curriculum_source_register TO service_role;
ALTER TABLE public.curriculum_source_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "curriculum_source_register_select" ON public.curriculum_source_register
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE TABLE public.question_originality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  external_ref text,
  subject text NOT NULL,
  revision_id uuid REFERENCES public.question_content_revisions(id) ON DELETE SET NULL,
  matched_shingle text,
  exact_match boolean NOT NULL,
  normalized_match boolean NOT NULL,
  max_shingle_overlap numeric NOT NULL,
  semantic_similarity numeric NOT NULL,
  verdict text NOT NULL,
  copyright_clearance_claimed boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_originality_checks TO authenticated;
GRANT ALL ON public.question_originality_checks TO service_role;
ALTER TABLE public.question_originality_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_originality_checks_select" ON public.question_originality_checks
  FOR SELECT TO authenticated
  USING (org_id = private.current_org_id() AND (private.is_staff() OR private.is_reviewer()));

CREATE OR REPLACE FUNCTION public.content_resolution_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'question_content_revisions' THEN
    IF NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.question_id IS NOT DISTINCT FROM OLD.question_id
       AND NEW.before_content IS NOT DISTINCT FROM OLD.before_content
       AND NEW.after_content IS NOT DISTINCT FROM OLD.after_content
       AND NEW.before_sha256 IS NOT DISTINCT FROM OLD.before_sha256
       AND NEW.after_sha256 IS NOT DISTINCT FROM OLD.after_sha256 THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER question_marking_specs_append_only
  BEFORE UPDATE OR DELETE ON public.question_marking_specs
  FOR EACH ROW EXECUTE FUNCTION public.content_resolution_append_only();
CREATE TRIGGER question_content_revisions_append_only
  BEFORE UPDATE OR DELETE ON public.question_content_revisions
  FOR EACH ROW EXECUTE FUNCTION public.content_resolution_append_only();
CREATE TRIGGER curriculum_source_register_append_only
  BEFORE UPDATE OR DELETE ON public.curriculum_source_register
  FOR EACH ROW EXECUTE FUNCTION public.content_resolution_append_only();
CREATE TRIGGER question_originality_checks_append_only
  BEFORE UPDATE OR DELETE ON public.question_originality_checks
  FOR EACH ROW EXECUTE FUNCTION public.content_resolution_append_only();

CREATE INDEX idx_marking_specs_question ON public.question_marking_specs(question_id);
CREATE INDEX idx_content_revisions_question ON public.question_content_revisions(question_id);
CREATE INDEX idx_source_register_question ON public.curriculum_source_register(question_id);
CREATE INDEX idx_originality_checks_question ON public.question_originality_checks(question_id);