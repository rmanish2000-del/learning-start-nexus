ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS question_bank_source_check;
ALTER TABLE public.question_bank ADD CONSTRAINT question_bank_source_check CHECK (source = ANY (ARRAY['ai'::text, 'manual'::text, 'import'::text]));

ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS external_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS question_bank_book_external_ref_key ON public.question_bank (book_id, external_ref) WHERE external_ref IS NOT NULL;