-- Sprint 6: Curriculum Engine V1 — library metadata, learning outcomes,
-- knowledge graph, processing history, and the pilot book seed.

-- 1. Book library: board level (Board > Grade > Subject > Book) and an
--    'approved' lifecycle stage (Upload > Review > Approve > Ready).
alter table public.books add column board text;
alter table public.books drop constraint books_status_check;
alter table public.books add constraint books_status_check
  check (status in ('uploaded','processing','processed','approved','failed'));

-- 2. Learning outcomes stored as their own rows (view / edit / approve).
create table public.curriculum_outcomes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  topic_id uuid not null references public.curriculum_topics(id) on delete cascade,
  text text not null,
  position int not null default 0,
  status text not null default 'suggested' check (status in ('suggested','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.curriculum_outcomes to authenticated;
grant all on public.curriculum_outcomes to service_role;
alter table public.curriculum_outcomes enable row level security;

create policy outcomes_select on public.curriculum_outcomes for select to authenticated
  using (org_id = private.current_org_id() and (private.is_staff() or private.is_reviewer()));
create policy outcomes_insert on public.curriculum_outcomes for insert to authenticated
  with check (org_id = private.current_org_id() and private.is_staff());
create policy outcomes_update on public.curriculum_outcomes for update to authenticated
  using (org_id = private.current_org_id() and private.is_staff())
  with check (org_id = private.current_org_id() and private.is_staff());
create policy outcomes_delete on public.curriculum_outcomes for delete to authenticated
  using (org_id = private.current_org_id() and private.is_staff());

create trigger touch_curriculum_outcomes before update on public.curriculum_outcomes
  for each row execute function public.touch_updated_at();

-- 3. Knowledge graph: concept nodes + directed edges (parent contains child).
create table public.concept_nodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  label text not null,
  depth int not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.concept_nodes to authenticated;
grant all on public.concept_nodes to service_role;
alter table public.concept_nodes enable row level security;

create policy concept_nodes_select on public.concept_nodes for select to authenticated
  using (org_id = private.current_org_id() and (private.is_staff() or private.is_reviewer()));
create policy concept_nodes_insert on public.concept_nodes for insert to authenticated
  with check (org_id = private.current_org_id() and private.is_staff());
create policy concept_nodes_update on public.concept_nodes for update to authenticated
  using (org_id = private.current_org_id() and private.is_staff())
  with check (org_id = private.current_org_id() and private.is_staff());
create policy concept_nodes_delete on public.concept_nodes for delete to authenticated
  using (org_id = private.current_org_id() and private.is_staff());

create table public.concept_edges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  parent_id uuid not null references public.concept_nodes(id) on delete cascade,
  child_id uuid not null references public.concept_nodes(id) on delete cascade,
  relation text not null default 'contains',
  created_at timestamptz not null default now(),
  unique (parent_id, child_id)
);

grant select, insert, update, delete on public.concept_edges to authenticated;
grant all on public.concept_edges to service_role;
alter table public.concept_edges enable row level security;

create policy concept_edges_select on public.concept_edges for select to authenticated
  using (org_id = private.current_org_id() and (private.is_staff() or private.is_reviewer()));
create policy concept_edges_insert on public.concept_edges for insert to authenticated
  with check (org_id = private.current_org_id() and private.is_staff());
create policy concept_edges_update on public.concept_edges for update to authenticated
  using (org_id = private.current_org_id() and private.is_staff())
  with check (org_id = private.current_org_id() and private.is_staff());
create policy concept_edges_delete on public.concept_edges for delete to authenticated
  using (org_id = private.current_org_id() and private.is_staff());

-- 4. Processing history: append-only audit trail per book.
create table public.book_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  actor_id uuid,
  event text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

grant select, insert on public.book_events to authenticated;
grant all on public.book_events to service_role;
alter table public.book_events enable row level security;

create policy book_events_select on public.book_events for select to authenticated
  using (org_id = private.current_org_id() and (private.is_staff() or private.is_reviewer()));
create policy book_events_insert on public.book_events for insert to authenticated
  with check (org_id = private.current_org_id() and private.is_staff());

-- 5. Extend the live policy registry to cover the curriculum tables.
create or replace view public.rls_policy_audit
with (security_invoker = true) as
select
  tablename,
  policyname,
  cmd,
  roles::text as roles,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in (
    'assessments',
    'assessment_sessions',
    'assessment_items',
    'learner_assessments',
    'learner_evidence',
    'books',
    'curriculum_units',
    'curriculum_chapters',
    'curriculum_topics',
    'curriculum_outcomes',
    'concept_nodes',
    'concept_edges',
    'book_events'
  )
order by tablename, policyname;

-- 6. Seed: pilot book 'Knowledge Bank for Children' (ICSE / Class 3 / GK),
--    imported from the Gemini curriculum analysis PDF.
insert into public.books (id, org_id, uploaded_by, title, board, grade, subject, file_names, storage_paths, mime_types, file_size_bytes, status, processed_at)
values ('66000000-0000-4000-8000-000000000003', (select id from public.organizations order by created_at limit 1), (select id from auth.users where email = 'admin@eduos.dev'), 'Knowledge Bank for Children', 'ICSE', 3, 'General Knowledge',
  array['Class_3_GK_Curriculum_Analysis.pdf'], array[]::text[], array['application/pdf'], 171200, 'processed', now());
insert into public.curriculum_units (id, org_id, book_id, title, position)
select v.id::uuid, o.id, '66000000-0000-4000-8000-000000000003'::uuid, v.title, v.position
from (values
('66100000-0000-4000-8000-000000000001', 'My Country', 1),
('66100000-0000-4000-8000-000000000002', 'My World', 2),
('66100000-0000-4000-8000-000000000003', 'Flora and Fauna', 3),
('66100000-0000-4000-8000-000000000004', 'Science and Technology', 4),
('66100000-0000-4000-8000-000000000005', 'Sports and Entertainment', 5),
('66100000-0000-4000-8000-000000000006', 'Language and Literature', 6)
) as v(id, title, position)
cross join (select id from public.organizations order by created_at limit 1) o;
insert into public.curriculum_chapters (id, org_id, book_id, unit_id, title, position)
select v.id::uuid, o.id, '66000000-0000-4000-8000-000000000003'::uuid, v.unit_id::uuid, v.title, v.position
from (values
('66200000-0000-4000-8000-000000000001', '66100000-0000-4000-8000-000000000001', 'India-My Motherland', 1),
('66200000-0000-4000-8000-000000000002', '66100000-0000-4000-8000-000000000001', 'Treasures of India', 2),
('66200000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000001', 'Incredible India', 3),
('66200000-0000-4000-8000-000000000004', '66100000-0000-4000-8000-000000000001', 'Glorious India', 4),
('66200000-0000-4000-8000-000000000005', '66100000-0000-4000-8000-000000000001', 'States and Their Capitals', 5),
('66200000-0000-4000-8000-000000000006', '66100000-0000-4000-8000-000000000001', 'What''s the New Name?', 6),
('66200000-0000-4000-8000-000000000007', '66100000-0000-4000-8000-000000000001', 'Marvels of India', 7),
('66200000-0000-4000-8000-000000000008', '66100000-0000-4000-8000-000000000001', 'Meet the Firsts of India', 8),
('66200000-0000-4000-8000-000000000009', '66100000-0000-4000-8000-000000000001', 'Eminent Indians', 9),
('66200000-0000-4000-8000-00000000000a', '66100000-0000-4000-8000-000000000001', 'Yummy Indian Food!', 10),
('66200000-0000-4000-8000-00000000000b', '66100000-0000-4000-8000-000000000002', 'Currencies Around the Globe', 1),
('66200000-0000-4000-8000-00000000000c', '66100000-0000-4000-8000-000000000002', 'World Around Us', 2),
('66200000-0000-4000-8000-00000000000d', '66100000-0000-4000-8000-000000000002', 'The World Quiz', 3),
('66200000-0000-4000-8000-00000000000e', '66100000-0000-4000-8000-000000000002', 'Wonders of the World', 4),
('66200000-0000-4000-8000-00000000000f', '66100000-0000-4000-8000-000000000002', 'Famous Structures', 5),
('66200000-0000-4000-8000-000000000010', '66100000-0000-4000-8000-000000000002', 'Countries and Their Capitals', 6),
('66200000-0000-4000-8000-000000000011', '66100000-0000-4000-8000-000000000002', 'Sobriquets', 7),
('66200000-0000-4000-8000-000000000012', '66100000-0000-4000-8000-000000000002', 'Languages Around the World', 8),
('66200000-0000-4000-8000-000000000013', '66100000-0000-4000-8000-000000000002', 'Famous People', 9),
('66200000-0000-4000-8000-000000000014', '66100000-0000-4000-8000-000000000002', 'Logical Reasoning and Aptitude: Shape Patterns', 10),
('66200000-0000-4000-8000-000000000015', '66100000-0000-4000-8000-000000000002', 'Logical Reasoning and Aptitude: Number Patterns', 11),
('66200000-0000-4000-8000-000000000016', '66100000-0000-4000-8000-000000000002', 'Logical Reasoning and Aptitude: Tiling Patterns', 12),
('66200000-0000-4000-8000-000000000017', '66100000-0000-4000-8000-000000000002', 'Logical Reasoning and Aptitude: Figure Completion', 13),
('66200000-0000-4000-8000-000000000018', '66100000-0000-4000-8000-000000000002', 'Logical Reasoning and Aptitude: Crack the Puzzle', 14),
('66200000-0000-4000-8000-000000000019', '66100000-0000-4000-8000-000000000002', 'TEST PAPER-1', 15),
('66200000-0000-4000-8000-00000000001a', '66100000-0000-4000-8000-000000000003', 'Wonderful Trees', 1),
('66200000-0000-4000-8000-00000000001b', '66100000-0000-4000-8000-000000000003', 'Green Leaves', 2),
('66200000-0000-4000-8000-00000000001c', '66100000-0000-4000-8000-000000000003', 'Guess the Animal', 3),
('66200000-0000-4000-8000-00000000001d', '66100000-0000-4000-8000-000000000003', 'Male and Female Animals', 4),
('66200000-0000-4000-8000-00000000001e', '66100000-0000-4000-8000-000000000003', 'Plant Quiz', 5),
('66200000-0000-4000-8000-00000000001f', '66100000-0000-4000-8000-000000000004', 'Great Inventions and Inventors', 1),
('66200000-0000-4000-8000-000000000020', '66100000-0000-4000-8000-000000000004', 'Our Body', 2),
('66200000-0000-4000-8000-000000000021', '66100000-0000-4000-8000-000000000004', 'Human Body Crossword', 3),
('66200000-0000-4000-8000-000000000022', '66100000-0000-4000-8000-000000000004', 'Diseases and Their Causes', 4),
('66200000-0000-4000-8000-000000000023', '66100000-0000-4000-8000-000000000004', 'Measuring Instruments', 5),
('66200000-0000-4000-8000-000000000024', '66100000-0000-4000-8000-000000000004', 'Science in Our Life', 6),
('66200000-0000-4000-8000-000000000025', '66100000-0000-4000-8000-000000000004', 'Number Magic', 7),
('66200000-0000-4000-8000-000000000026', '66100000-0000-4000-8000-000000000004', 'Logical Reasoning and Aptitude: Match the Pairs (Analogy)', 8),
('66200000-0000-4000-8000-000000000027', '66100000-0000-4000-8000-000000000004', 'Logical Reasoning and Aptitude: Analogy in Figures', 9),
('66200000-0000-4000-8000-000000000028', '66100000-0000-4000-8000-000000000004', 'Logical Reasoning and Aptitude: Analogy in Numbers', 10),
('66200000-0000-4000-8000-000000000029', '66100000-0000-4000-8000-000000000004', 'Logical Reasoning and Aptitude: Find My Mirror Image', 11),
('66200000-0000-4000-8000-00000000002a', '66100000-0000-4000-8000-000000000004', 'Logical Reasoning and Aptitude: More Mirror Images', 12),
('66200000-0000-4000-8000-00000000002b', '66100000-0000-4000-8000-000000000004', 'Logical Reasoning and Aptitude: Crack the Puzzle', 13),
('66200000-0000-4000-8000-00000000002c', '66100000-0000-4000-8000-000000000004', 'TEST PAPER-2', 14),
('66200000-0000-4000-8000-00000000002d', '66100000-0000-4000-8000-000000000005', 'The World of Sports', 1),
('66200000-0000-4000-8000-00000000002e', '66100000-0000-4000-8000-000000000005', 'Games and Their Play Areas', 2),
('66200000-0000-4000-8000-00000000002f', '66100000-0000-4000-8000-000000000005', 'Our Sporting Stars', 3),
('66200000-0000-4000-8000-000000000030', '66100000-0000-4000-8000-000000000005', 'Famous Cricketers', 4),
('66200000-0000-4000-8000-000000000031', '66100000-0000-4000-8000-000000000005', 'Soulful World of Music', 5),
('66200000-0000-4000-8000-000000000032', '66100000-0000-4000-8000-000000000006', 'World of Books', 1),
('66200000-0000-4000-8000-000000000033', '66100000-0000-4000-8000-000000000006', 'Amazing Books and Their Authors', 2),
('66200000-0000-4000-8000-000000000034', '66100000-0000-4000-8000-000000000006', 'Language Time', 3),
('66200000-0000-4000-8000-000000000035', '66100000-0000-4000-8000-000000000006', 'Synonyms and Antonyms', 4),
('66200000-0000-4000-8000-000000000036', '66100000-0000-4000-8000-000000000006', 'Popular Proverbs', 5),
('66200000-0000-4000-8000-000000000037', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Dictionary Order', 6),
('66200000-0000-4000-8000-000000000038', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Words from Letters', 7),
('66200000-0000-4000-8000-000000000039', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Words from Words', 8),
('66200000-0000-4000-8000-00000000003a', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Ranking Test-1', 9),
('66200000-0000-4000-8000-00000000003b', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Ranking Test-2', 10),
('66200000-0000-4000-8000-00000000003c', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Directions Test', 11),
('66200000-0000-4000-8000-00000000003d', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Data Handling and Analysis', 12),
('66200000-0000-4000-8000-00000000003e', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Mental Ability Quiz', 13),
('66200000-0000-4000-8000-00000000003f', '66100000-0000-4000-8000-000000000006', 'Logical Reasoning and Aptitude: Crack the Puzzle', 14),
('66200000-0000-4000-8000-000000000040', '66100000-0000-4000-8000-000000000006', 'TEST PAPER-3', 15)
) as v(id, unit_id, title, position)
cross join (select id from public.organizations order by created_at limit 1) o;
insert into public.curriculum_topics (id, org_id, book_id, chapter_id, title, position, key_concepts)
select v.id::uuid, o.id, '66000000-0000-4000-8000-000000000003'::uuid, v.chapter_id::uuid, v.title, v.position, v.key_concepts
from (values
('66300000-0000-4000-8000-000000000001', '66200000-0000-4000-8000-000000000001', 'India-My Motherland', 1, '["National symbols","capital","national anthem/song","constitutional father"]'::jsonb),
('66300000-0000-4000-8000-000000000002', '66200000-0000-4000-8000-000000000002', 'Treasures of India', 1, '["Monuments","festivals","religious gatherings","geographic records (longest dam, river, desert)"]'::jsonb),
('66300000-0000-4000-8000-000000000003', '66200000-0000-4000-8000-000000000003', 'Incredible India', 1, '["Monuments","festivals","religious gatherings","geographic records (longest dam, river, desert)"]'::jsonb),
('66300000-0000-4000-8000-000000000004', '66200000-0000-4000-8000-000000000004', 'Glorious India', 1, '["Monuments","festivals","religious gatherings","geographic records (longest dam, river, desert)"]'::jsonb),
('66300000-0000-4000-8000-000000000005', '66200000-0000-4000-8000-000000000005', 'States and Their Capitals', 1, '["Indian states & capitals","historic vs modern city names"]'::jsonb),
('66300000-0000-4000-8000-000000000006', '66200000-0000-4000-8000-000000000006', 'What''s the New Name?', 1, '["Indian states & capitals","historic vs modern city names"]'::jsonb),
('66300000-0000-4000-8000-000000000007', '66200000-0000-4000-8000-000000000007', 'Marvels of India', 1, '["Monuments","festivals","religious gatherings","geographic records (longest dam, river, desert)"]'::jsonb),
('66300000-0000-4000-8000-000000000008', '66200000-0000-4000-8000-000000000008', 'Meet the Firsts of India', 1, '["First leaders","prominent personalities across domains","regional cuisines"]'::jsonb),
('66300000-0000-4000-8000-000000000009', '66200000-0000-4000-8000-000000000009', 'Eminent Indians', 1, '["First leaders","prominent personalities across domains","regional cuisines"]'::jsonb),
('66300000-0000-4000-8000-00000000000a', '66200000-0000-4000-8000-00000000000a', 'Yummy Indian Food!', 1, '["First leaders","prominent personalities across domains","regional cuisines"]'::jsonb),
('66300000-0000-4000-8000-00000000000b', '66200000-0000-4000-8000-00000000000b', 'Currencies Around the Globe', 1, '["World currencies","country capitals","sobriquets","languages","global personalities"]'::jsonb),
('66300000-0000-4000-8000-00000000000c', '66200000-0000-4000-8000-00000000000c', 'World Around Us', 1, '["Continents","oceans","mountain peaks","7 Wonders of the World","world structures"]'::jsonb),
('66300000-0000-4000-8000-00000000000d', '66200000-0000-4000-8000-00000000000d', 'The World Quiz', 1, '[]'::jsonb),
('66300000-0000-4000-8000-00000000000e', '66200000-0000-4000-8000-00000000000e', 'Wonders of the World', 1, '["Continents","oceans","mountain peaks","7 Wonders of the World","world structures"]'::jsonb),
('66300000-0000-4000-8000-00000000000f', '66200000-0000-4000-8000-00000000000f', 'Famous Structures', 1, '["Continents","oceans","mountain peaks","7 Wonders of the World","world structures"]'::jsonb),
('66300000-0000-4000-8000-000000000010', '66200000-0000-4000-8000-000000000010', 'Countries and Their Capitals', 1, '["World currencies","country capitals","sobriquets","languages","global personalities"]'::jsonb),
('66300000-0000-4000-8000-000000000011', '66200000-0000-4000-8000-000000000011', 'Sobriquets', 1, '["World currencies","country capitals","sobriquets","languages","global personalities"]'::jsonb),
('66300000-0000-4000-8000-000000000012', '66200000-0000-4000-8000-000000000012', 'Languages Around the World', 1, '["World currencies","country capitals","sobriquets","languages","global personalities"]'::jsonb),
('66300000-0000-4000-8000-000000000013', '66200000-0000-4000-8000-000000000013', 'Famous People', 1, '["World currencies","country capitals","sobriquets","languages","global personalities"]'::jsonb),
('66300000-0000-4000-8000-000000000014', '66200000-0000-4000-8000-000000000014', 'Logical Reasoning and Aptitude: Shape Patterns', 1, '["Shape sequences","number patterns","tiling/tessellation","figure completion"]'::jsonb),
('66300000-0000-4000-8000-000000000015', '66200000-0000-4000-8000-000000000015', 'Logical Reasoning and Aptitude: Number Patterns', 1, '["Shape sequences","number patterns","tiling/tessellation","figure completion"]'::jsonb),
('66300000-0000-4000-8000-000000000016', '66200000-0000-4000-8000-000000000016', 'Logical Reasoning and Aptitude: Tiling Patterns', 1, '["Shape sequences","number patterns","tiling/tessellation","figure completion"]'::jsonb),
('66300000-0000-4000-8000-000000000017', '66200000-0000-4000-8000-000000000017', 'Logical Reasoning and Aptitude: Figure Completion', 1, '["Shape sequences","number patterns","tiling/tessellation","figure completion"]'::jsonb),
('66300000-0000-4000-8000-000000000018', '66200000-0000-4000-8000-000000000018', 'Logical Reasoning and Aptitude: Crack the Puzzle', 1, '[]'::jsonb),
('66300000-0000-4000-8000-000000000019', '66200000-0000-4000-8000-000000000019', 'TEST PAPER-1', 1, '[]'::jsonb),
('66300000-0000-4000-8000-00000000001a', '66200000-0000-4000-8000-00000000001a', 'Wonderful Trees', 1, '["Medicinal trees","types of leaves","carnivorous/biennial/perennial plants","root vegetables"]'::jsonb),
('66300000-0000-4000-8000-00000000001b', '66200000-0000-4000-8000-00000000001b', 'Green Leaves', 1, '["Medicinal trees","types of leaves","carnivorous/biennial/perennial plants","root vegetables"]'::jsonb),
('66300000-0000-4000-8000-00000000001c', '66200000-0000-4000-8000-00000000001c', 'Guess the Animal', 1, '["Unique animal behaviors/traits","male-female animal terminology"]'::jsonb),
('66300000-0000-4000-8000-00000000001d', '66200000-0000-4000-8000-00000000001d', 'Male and Female Animals', 1, '["Unique animal behaviors/traits","male-female animal terminology"]'::jsonb),
('66300000-0000-4000-8000-00000000001e', '66200000-0000-4000-8000-00000000001e', 'Plant Quiz', 1, '[]'::jsonb),
('66300000-0000-4000-8000-00000000001f', '66200000-0000-4000-8000-00000000001f', 'Great Inventions and Inventors', 1, '["Famous inventors","human organ systems","skeletal/muscular structure"]'::jsonb),
('66300000-0000-4000-8000-000000000020', '66200000-0000-4000-8000-000000000020', 'Our Body', 1, '["Famous inventors","human organ systems","skeletal/muscular structure"]'::jsonb),
('66300000-0000-4000-8000-000000000021', '66200000-0000-4000-8000-000000000021', 'Human Body Crossword', 1, '["Famous inventors","human organ systems","skeletal/muscular structure"]'::jsonb),
('66300000-0000-4000-8000-000000000022', '66200000-0000-4000-8000-000000000022', 'Diseases and Their Causes', 1, '["Disease causes/deficiencies","measuring instruments","basic physical & tech facts"]'::jsonb),
('66300000-0000-4000-8000-000000000023', '66200000-0000-4000-8000-000000000023', 'Measuring Instruments', 1, '["Disease causes/deficiencies","measuring instruments","basic physical & tech facts"]'::jsonb),
('66300000-0000-4000-8000-000000000024', '66200000-0000-4000-8000-000000000024', 'Science in Our Life', 1, '["Disease causes/deficiencies","measuring instruments","basic physical & tech facts"]'::jsonb),
('66300000-0000-4000-8000-000000000025', '66200000-0000-4000-8000-000000000025', 'Number Magic', 1, '["Disease causes/deficiencies","measuring instruments","basic physical & tech facts"]'::jsonb),
('66300000-0000-4000-8000-000000000026', '66200000-0000-4000-8000-000000000026', 'Logical Reasoning and Aptitude: Match the Pairs (Analogy)', 1, '["Figure/number analogies","lateral inversion/mirror reflections","observation puzzles"]'::jsonb),
('66300000-0000-4000-8000-000000000027', '66200000-0000-4000-8000-000000000027', 'Logical Reasoning and Aptitude: Analogy in Figures', 1, '["Figure/number analogies","lateral inversion/mirror reflections","observation puzzles"]'::jsonb),
('66300000-0000-4000-8000-000000000028', '66200000-0000-4000-8000-000000000028', 'Logical Reasoning and Aptitude: Analogy in Numbers', 1, '["Figure/number analogies","lateral inversion/mirror reflections","observation puzzles"]'::jsonb),
('66300000-0000-4000-8000-000000000029', '66200000-0000-4000-8000-000000000029', 'Logical Reasoning and Aptitude: Find My Mirror Image', 1, '["Figure/number analogies","lateral inversion/mirror reflections","observation puzzles"]'::jsonb),
('66300000-0000-4000-8000-00000000002a', '66200000-0000-4000-8000-00000000002a', 'Logical Reasoning and Aptitude: More Mirror Images', 1, '["Figure/number analogies","lateral inversion/mirror reflections","observation puzzles"]'::jsonb),
('66300000-0000-4000-8000-00000000002b', '66200000-0000-4000-8000-00000000002b', 'Logical Reasoning and Aptitude: Crack the Puzzle', 1, '[]'::jsonb),
('66300000-0000-4000-8000-00000000002c', '66200000-0000-4000-8000-00000000002c', 'TEST PAPER-2', 1, '[]'::jsonb),
('66300000-0000-4000-8000-00000000002d', '66200000-0000-4000-8000-00000000002d', 'The World of Sports', 1, '["Global sports","play areas (ring, pitch, velodrome)","sporting personalities","Olympics"]'::jsonb),
('66300000-0000-4000-8000-00000000002e', '66200000-0000-4000-8000-00000000002e', 'Games and Their Play Areas', 1, '["Global sports","play areas (ring, pitch, velodrome)","sporting personalities","Olympics"]'::jsonb),
('66300000-0000-4000-8000-00000000002f', '66200000-0000-4000-8000-00000000002f', 'Our Sporting Stars', 1, '["Global sports","play areas (ring, pitch, velodrome)","sporting personalities","Olympics"]'::jsonb),
('66300000-0000-4000-8000-000000000030', '66200000-0000-4000-8000-000000000030', 'Famous Cricketers', 1, '["Global sports","play areas (ring, pitch, velodrome)","sporting personalities","Olympics"]'::jsonb),
('66300000-0000-4000-8000-000000000031', '66200000-0000-4000-8000-000000000031', 'Soulful World of Music', 1, '["String","wind","percussion","and keyboard instruments"]'::jsonb),
('66300000-0000-4000-8000-000000000032', '66200000-0000-4000-8000-000000000032', 'World of Books', 1, '["Book types","authors","synonyms","antonyms","proverbs","vocabulary expansion"]'::jsonb),
('66300000-0000-4000-8000-000000000033', '66200000-0000-4000-8000-000000000033', 'Amazing Books and Their Authors', 1, '["Book types","authors","synonyms","antonyms","proverbs","vocabulary expansion"]'::jsonb),
('66300000-0000-4000-8000-000000000034', '66200000-0000-4000-8000-000000000034', 'Language Time', 1, '["Book types","authors","synonyms","antonyms","proverbs","vocabulary expansion"]'::jsonb),
('66300000-0000-4000-8000-000000000035', '66200000-0000-4000-8000-000000000035', 'Synonyms and Antonyms', 1, '["Book types","authors","synonyms","antonyms","proverbs","vocabulary expansion"]'::jsonb),
('66300000-0000-4000-8000-000000000036', '66200000-0000-4000-8000-000000000036', 'Popular Proverbs', 1, '["Book types","authors","synonyms","antonyms","proverbs","vocabulary expansion"]'::jsonb),
('66300000-0000-4000-8000-000000000037', '66200000-0000-4000-8000-000000000037', 'Logical Reasoning and Aptitude: Dictionary Order', 1, '["Dictionary ordering","anagrams","word extraction","spatial position/ranking","directions","data interpretation"]'::jsonb),
('66300000-0000-4000-8000-000000000038', '66200000-0000-4000-8000-000000000038', 'Logical Reasoning and Aptitude: Words from Letters', 1, '["Dictionary ordering","anagrams","word extraction","spatial position/ranking","directions","data interpretation"]'::jsonb),
('66300000-0000-4000-8000-000000000039', '66200000-0000-4000-8000-000000000039', 'Logical Reasoning and Aptitude: Words from Words', 1, '["Dictionary ordering","anagrams","word extraction","spatial position/ranking","directions","data interpretation"]'::jsonb),
('66300000-0000-4000-8000-00000000003a', '66200000-0000-4000-8000-00000000003a', 'Logical Reasoning and Aptitude: Ranking Test-1', 1, '["Dictionary ordering","anagrams","word extraction","spatial position/ranking","directions","data interpretation"]'::jsonb),
('66300000-0000-4000-8000-00000000003b', '66200000-0000-4000-8000-00000000003b', 'Logical Reasoning and Aptitude: Ranking Test-2', 1, '["Dictionary ordering","anagrams","word extraction","spatial position/ranking","directions","data interpretation"]'::jsonb),
('66300000-0000-4000-8000-00000000003c', '66200000-0000-4000-8000-00000000003c', 'Logical Reasoning and Aptitude: Directions Test', 1, '["Dictionary ordering","anagrams","word extraction","spatial position/ranking","directions","data interpretation"]'::jsonb),
('66300000-0000-4000-8000-00000000003d', '66200000-0000-4000-8000-00000000003d', 'Logical Reasoning and Aptitude: Data Handling and Analysis', 1, '["Dictionary ordering","anagrams","word extraction","spatial position/ranking","directions","data interpretation"]'::jsonb),
('66300000-0000-4000-8000-00000000003e', '66200000-0000-4000-8000-00000000003e', 'Logical Reasoning and Aptitude: Mental Ability Quiz', 1, '[]'::jsonb),
('66300000-0000-4000-8000-00000000003f', '66200000-0000-4000-8000-00000000003f', 'Logical Reasoning and Aptitude: Crack the Puzzle', 1, '[]'::jsonb),
('66300000-0000-4000-8000-000000000040', '66200000-0000-4000-8000-000000000040', 'TEST PAPER-3', 1, '[]'::jsonb)
) as v(id, chapter_id, title, position, key_concepts)
cross join (select id from public.organizations order by created_at limit 1) o;
insert into public.curriculum_outcomes (id, org_id, book_id, topic_id, text, position)
select v.id::uuid, o.id, '66000000-0000-4000-8000-000000000003'::uuid, v.topic_id::uuid, v.text, v.position
from (values
('66400000-0000-4000-8000-000000000001', '66300000-0000-4000-8000-000000000001', 'Identify national symbols, leaders, and basic geographic facts of India.', 1),
('66400000-0000-4000-8000-000000000002', '66300000-0000-4000-8000-000000000002', 'Distinguish famous Indian landmarks, monuments, and cultural heritage sites.', 1),
('66400000-0000-4000-8000-000000000003', '66300000-0000-4000-8000-000000000003', 'Distinguish famous Indian landmarks, monuments, and cultural heritage sites.', 1),
('66400000-0000-4000-8000-000000000004', '66300000-0000-4000-8000-000000000004', 'Distinguish famous Indian landmarks, monuments, and cultural heritage sites.', 1),
('66400000-0000-4000-8000-000000000005', '66300000-0000-4000-8000-000000000005', 'Memorize states, capitals, and updated nomenclature of major Indian cities.', 1),
('66400000-0000-4000-8000-000000000006', '66300000-0000-4000-8000-000000000006', 'Memorize states, capitals, and updated nomenclature of major Indian cities.', 1),
('66400000-0000-4000-8000-000000000007', '66300000-0000-4000-8000-000000000007', 'Distinguish famous Indian landmarks, monuments, and cultural heritage sites.', 1),
('66400000-0000-4000-8000-000000000008', '66300000-0000-4000-8000-000000000008', 'Recognize historic pioneers, famous personalities, and regional culinary diversity.', 1),
('66400000-0000-4000-8000-000000000009', '66300000-0000-4000-8000-000000000009', 'Recognize historic pioneers, famous personalities, and regional culinary diversity.', 1),
('66400000-0000-4000-8000-00000000000a', '66300000-0000-4000-8000-00000000000a', 'Recognize historic pioneers, famous personalities, and regional culinary diversity.', 1),
('66400000-0000-4000-8000-00000000000b', '66300000-0000-4000-8000-00000000000b', 'Associate countries with their capitals, currencies, native languages, and nicknames.', 1),
('66400000-0000-4000-8000-00000000000c', '66300000-0000-4000-8000-00000000000c', 'Locate global geographic features, identify famous international landmarks.', 1),
('66400000-0000-4000-8000-00000000000d', '66300000-0000-4000-8000-00000000000e', 'Locate global geographic features, identify famous international landmarks.', 1),
('66400000-0000-4000-8000-00000000000e', '66300000-0000-4000-8000-00000000000f', 'Locate global geographic features, identify famous international landmarks.', 1),
('66400000-0000-4000-8000-00000000000f', '66300000-0000-4000-8000-000000000010', 'Associate countries with their capitals, currencies, native languages, and nicknames.', 1),
('66400000-0000-4000-8000-000000000010', '66300000-0000-4000-8000-000000000011', 'Associate countries with their capitals, currencies, native languages, and nicknames.', 1),
('66400000-0000-4000-8000-000000000011', '66300000-0000-4000-8000-000000000012', 'Associate countries with their capitals, currencies, native languages, and nicknames.', 1),
('66400000-0000-4000-8000-000000000012', '66300000-0000-4000-8000-000000000013', 'Associate countries with their capitals, currencies, native languages, and nicknames.', 1),
('66400000-0000-4000-8000-000000000013', '66300000-0000-4000-8000-000000000014', 'Analyze visual and numerical progression patterns and deduce missing terms.', 1),
('66400000-0000-4000-8000-000000000014', '66300000-0000-4000-8000-000000000015', 'Analyze visual and numerical progression patterns and deduce missing terms.', 1),
('66400000-0000-4000-8000-000000000015', '66300000-0000-4000-8000-000000000016', 'Analyze visual and numerical progression patterns and deduce missing terms.', 1),
('66400000-0000-4000-8000-000000000016', '66300000-0000-4000-8000-000000000017', 'Analyze visual and numerical progression patterns and deduce missing terms.', 1),
('66400000-0000-4000-8000-000000000017', '66300000-0000-4000-8000-00000000001a', 'Classify plant varieties, edible plant parts, and recognize medicinal properties.', 1),
('66400000-0000-4000-8000-000000000018', '66300000-0000-4000-8000-00000000001b', 'Classify plant varieties, edible plant parts, and recognize medicinal properties.', 1),
('66400000-0000-4000-8000-000000000019', '66300000-0000-4000-8000-00000000001c', 'Distinguish specialized animal characteristics and recall gender-specific animal names.', 1),
('66400000-0000-4000-8000-00000000001a', '66300000-0000-4000-8000-00000000001d', 'Distinguish specialized animal characteristics and recall gender-specific animal names.', 1),
('66400000-0000-4000-8000-00000000001b', '66300000-0000-4000-8000-00000000001f', 'Explain key technological inventions and label primary human anatomical structures.', 1),
('66400000-0000-4000-8000-00000000001c', '66300000-0000-4000-8000-000000000020', 'Explain key technological inventions and label primary human anatomical structures.', 1),
('66400000-0000-4000-8000-00000000001d', '66300000-0000-4000-8000-000000000021', 'Explain key technological inventions and label primary human anatomical structures.', 1),
('66400000-0000-4000-8000-00000000001e', '66300000-0000-4000-8000-000000000022', 'Match diseases to deficiencies/pathogens and select appropriate measuring devices.', 1),
('66400000-0000-4000-8000-00000000001f', '66300000-0000-4000-8000-000000000023', 'Match diseases to deficiencies/pathogens and select appropriate measuring devices.', 1),
('66400000-0000-4000-8000-000000000020', '66300000-0000-4000-8000-000000000024', 'Match diseases to deficiencies/pathogens and select appropriate measuring devices.', 1),
('66400000-0000-4000-8000-000000000021', '66300000-0000-4000-8000-000000000025', 'Match diseases to deficiencies/pathogens and select appropriate measuring devices.', 1),
('66400000-0000-4000-8000-000000000022', '66300000-0000-4000-8000-000000000026', 'Solve logical relations/analogies and mentally manipulate inverted visual images.', 1),
('66400000-0000-4000-8000-000000000023', '66300000-0000-4000-8000-000000000027', 'Solve logical relations/analogies and mentally manipulate inverted visual images.', 1),
('66400000-0000-4000-8000-000000000024', '66300000-0000-4000-8000-000000000028', 'Solve logical relations/analogies and mentally manipulate inverted visual images.', 1),
('66400000-0000-4000-8000-000000000025', '66300000-0000-4000-8000-000000000029', 'Solve logical relations/analogies and mentally manipulate inverted visual images.', 1),
('66400000-0000-4000-8000-000000000026', '66300000-0000-4000-8000-00000000002a', 'Solve logical relations/analogies and mentally manipulate inverted visual images.', 1),
('66400000-0000-4000-8000-000000000027', '66300000-0000-4000-8000-00000000002d', 'Link various sports to their designated playing surfaces and prominent players.', 1),
('66400000-0000-4000-8000-000000000028', '66300000-0000-4000-8000-00000000002e', 'Link various sports to their designated playing surfaces and prominent players.', 1),
('66400000-0000-4000-8000-000000000029', '66300000-0000-4000-8000-00000000002f', 'Link various sports to their designated playing surfaces and prominent players.', 1),
('66400000-0000-4000-8000-00000000002a', '66300000-0000-4000-8000-000000000030', 'Link various sports to their designated playing surfaces and prominent players.', 1),
('66400000-0000-4000-8000-00000000002b', '66300000-0000-4000-8000-000000000031', 'Categorize musical instruments based on sound production mechanisms.', 1),
('66400000-0000-4000-8000-00000000002c', '66300000-0000-4000-8000-000000000032', 'Identify literary genres, improve vocabulary through word associations and proverbs.', 1),
('66400000-0000-4000-8000-00000000002d', '66300000-0000-4000-8000-000000000033', 'Identify literary genres, improve vocabulary through word associations and proverbs.', 1),
('66400000-0000-4000-8000-00000000002e', '66300000-0000-4000-8000-000000000034', 'Identify literary genres, improve vocabulary through word associations and proverbs.', 1),
('66400000-0000-4000-8000-00000000002f', '66300000-0000-4000-8000-000000000035', 'Identify literary genres, improve vocabulary through word associations and proverbs.', 1),
('66400000-0000-4000-8000-000000000030', '66300000-0000-4000-8000-000000000036', 'Identify literary genres, improve vocabulary through word associations and proverbs.', 1),
('66400000-0000-4000-8000-000000000031', '66300000-0000-4000-8000-000000000037', 'Apply alphabetical sequencing, solve spatial orientation, directional paths, and basic data tables.', 1),
('66400000-0000-4000-8000-000000000032', '66300000-0000-4000-8000-000000000038', 'Apply alphabetical sequencing, solve spatial orientation, directional paths, and basic data tables.', 1),
('66400000-0000-4000-8000-000000000033', '66300000-0000-4000-8000-000000000039', 'Apply alphabetical sequencing, solve spatial orientation, directional paths, and basic data tables.', 1),
('66400000-0000-4000-8000-000000000034', '66300000-0000-4000-8000-00000000003a', 'Apply alphabetical sequencing, solve spatial orientation, directional paths, and basic data tables.', 1),
('66400000-0000-4000-8000-000000000035', '66300000-0000-4000-8000-00000000003b', 'Apply alphabetical sequencing, solve spatial orientation, directional paths, and basic data tables.', 1),
('66400000-0000-4000-8000-000000000036', '66300000-0000-4000-8000-00000000003c', 'Apply alphabetical sequencing, solve spatial orientation, directional paths, and basic data tables.', 1),
('66400000-0000-4000-8000-000000000037', '66300000-0000-4000-8000-00000000003d', 'Apply alphabetical sequencing, solve spatial orientation, directional paths, and basic data tables.', 1)
) as v(id, topic_id, text, position)
cross join (select id from public.organizations order by created_at limit 1) o;
insert into public.concept_nodes (id, org_id, book_id, label, depth)
select v.id::uuid, o.id, '66000000-0000-4000-8000-000000000003'::uuid, v.label, v.depth
from (values
('66500000-0000-4000-8000-000000000001', 'Class 3 GK & Reasoning', 0),
('66500000-0000-4000-8000-000000000002', 'General Knowledge', 1),
('66500000-0000-4000-8000-000000000003', 'Biological Science', 1),
('66500000-0000-4000-8000-000000000004', 'Reasoning & Aptitude', 1),
('66500000-0000-4000-8000-000000000005', 'National Identity', 2),
('66500000-0000-4000-8000-000000000006', 'World Studies', 2),
('66500000-0000-4000-8000-000000000007', 'Culture & Arts', 2),
('66500000-0000-4000-8000-000000000008', 'Symbols', 3),
('66500000-0000-4000-8000-000000000009', 'Geography', 3),
('66500000-0000-4000-8000-00000000000a', 'States & Capitals', 3),
('66500000-0000-4000-8000-00000000000b', 'Continents', 3),
('66500000-0000-4000-8000-00000000000c', 'Currencies', 3),
('66500000-0000-4000-8000-00000000000d', 'Structures', 3),
('66500000-0000-4000-8000-00000000000e', 'Sports & Venues', 3),
('66500000-0000-4000-8000-00000000000f', 'Books & Authors', 3),
('66500000-0000-4000-8000-000000000010', 'Music & Instruments', 3),
('66500000-0000-4000-8000-000000000011', 'Flora & Botany', 2),
('66500000-0000-4000-8000-000000000012', 'Fauna & Zoology', 2),
('66500000-0000-4000-8000-000000000013', 'Human Health', 2),
('66500000-0000-4000-8000-000000000014', 'Plant Types', 3),
('66500000-0000-4000-8000-000000000015', 'Leaf Types', 3),
('66500000-0000-4000-8000-000000000016', 'Traits', 3),
('66500000-0000-4000-8000-000000000017', 'Gender Names', 3),
('66500000-0000-4000-8000-000000000018', 'Anatomy', 3),
('66500000-0000-4000-8000-000000000019', 'Diseases', 3),
('66500000-0000-4000-8000-00000000001a', 'Inventions', 3),
('66500000-0000-4000-8000-00000000001b', 'Visual / Spatial', 2),
('66500000-0000-4000-8000-00000000001c', 'Verbal Reasoning', 2),
('66500000-0000-4000-8000-00000000001d', 'Quantitative / Logical', 2),
('66500000-0000-4000-8000-00000000001e', 'Pattern Series', 3),
('66500000-0000-4000-8000-00000000001f', 'Tiling / Tiles', 3),
('66500000-0000-4000-8000-000000000020', 'Mirror Images', 3),
('66500000-0000-4000-8000-000000000021', 'Dictionary Order', 3),
('66500000-0000-4000-8000-000000000022', 'Anagrams', 3),
('66500000-0000-4000-8000-000000000023', 'Proverbs', 3),
('66500000-0000-4000-8000-000000000024', 'Number Patterns', 3),
('66500000-0000-4000-8000-000000000025', 'Ranking Tests', 3),
('66500000-0000-4000-8000-000000000026', 'Direction Sense', 3),
('66500000-0000-4000-8000-000000000027', 'Data Handling', 3)
) as v(id, label, depth)
cross join (select id from public.organizations order by created_at limit 1) o;
insert into public.concept_edges (id, org_id, book_id, parent_id, child_id)
select v.id::uuid, o.id, '66000000-0000-4000-8000-000000000003'::uuid, v.parent_id::uuid, v.child_id::uuid
from (values
('66600000-0000-4000-8000-000000000001', '66500000-0000-4000-8000-000000000001', '66500000-0000-4000-8000-000000000002'),
('66600000-0000-4000-8000-000000000002', '66500000-0000-4000-8000-000000000001', '66500000-0000-4000-8000-000000000003'),
('66600000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000001', '66500000-0000-4000-8000-000000000004'),
('66600000-0000-4000-8000-000000000004', '66500000-0000-4000-8000-000000000002', '66500000-0000-4000-8000-000000000005'),
('66600000-0000-4000-8000-000000000005', '66500000-0000-4000-8000-000000000002', '66500000-0000-4000-8000-000000000006'),
('66600000-0000-4000-8000-000000000006', '66500000-0000-4000-8000-000000000002', '66500000-0000-4000-8000-000000000007'),
('66600000-0000-4000-8000-000000000007', '66500000-0000-4000-8000-000000000005', '66500000-0000-4000-8000-000000000008'),
('66600000-0000-4000-8000-000000000008', '66500000-0000-4000-8000-000000000005', '66500000-0000-4000-8000-000000000009'),
('66600000-0000-4000-8000-000000000009', '66500000-0000-4000-8000-000000000005', '66500000-0000-4000-8000-00000000000a'),
('66600000-0000-4000-8000-00000000000a', '66500000-0000-4000-8000-000000000006', '66500000-0000-4000-8000-00000000000b'),
('66600000-0000-4000-8000-00000000000b', '66500000-0000-4000-8000-000000000006', '66500000-0000-4000-8000-00000000000c'),
('66600000-0000-4000-8000-00000000000c', '66500000-0000-4000-8000-000000000006', '66500000-0000-4000-8000-00000000000d'),
('66600000-0000-4000-8000-00000000000d', '66500000-0000-4000-8000-000000000007', '66500000-0000-4000-8000-00000000000e'),
('66600000-0000-4000-8000-00000000000e', '66500000-0000-4000-8000-000000000007', '66500000-0000-4000-8000-00000000000f'),
('66600000-0000-4000-8000-00000000000f', '66500000-0000-4000-8000-000000000007', '66500000-0000-4000-8000-000000000010'),
('66600000-0000-4000-8000-000000000010', '66500000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000011'),
('66600000-0000-4000-8000-000000000011', '66500000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000012'),
('66600000-0000-4000-8000-000000000012', '66500000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000013'),
('66600000-0000-4000-8000-000000000013', '66500000-0000-4000-8000-000000000011', '66500000-0000-4000-8000-000000000014'),
('66600000-0000-4000-8000-000000000014', '66500000-0000-4000-8000-000000000011', '66500000-0000-4000-8000-000000000015'),
('66600000-0000-4000-8000-000000000015', '66500000-0000-4000-8000-000000000012', '66500000-0000-4000-8000-000000000016'),
('66600000-0000-4000-8000-000000000016', '66500000-0000-4000-8000-000000000012', '66500000-0000-4000-8000-000000000017'),
('66600000-0000-4000-8000-000000000017', '66500000-0000-4000-8000-000000000013', '66500000-0000-4000-8000-000000000018'),
('66600000-0000-4000-8000-000000000018', '66500000-0000-4000-8000-000000000013', '66500000-0000-4000-8000-000000000019'),
('66600000-0000-4000-8000-000000000019', '66500000-0000-4000-8000-000000000013', '66500000-0000-4000-8000-00000000001a'),
('66600000-0000-4000-8000-00000000001a', '66500000-0000-4000-8000-000000000004', '66500000-0000-4000-8000-00000000001b'),
('66600000-0000-4000-8000-00000000001b', '66500000-0000-4000-8000-000000000004', '66500000-0000-4000-8000-00000000001c'),
('66600000-0000-4000-8000-00000000001c', '66500000-0000-4000-8000-000000000004', '66500000-0000-4000-8000-00000000001d'),
('66600000-0000-4000-8000-00000000001d', '66500000-0000-4000-8000-00000000001b', '66500000-0000-4000-8000-00000000001e'),
('66600000-0000-4000-8000-00000000001e', '66500000-0000-4000-8000-00000000001b', '66500000-0000-4000-8000-00000000001f'),
('66600000-0000-4000-8000-00000000001f', '66500000-0000-4000-8000-00000000001b', '66500000-0000-4000-8000-000000000020'),
('66600000-0000-4000-8000-000000000020', '66500000-0000-4000-8000-00000000001c', '66500000-0000-4000-8000-000000000021'),
('66600000-0000-4000-8000-000000000021', '66500000-0000-4000-8000-00000000001c', '66500000-0000-4000-8000-000000000022'),
('66600000-0000-4000-8000-000000000022', '66500000-0000-4000-8000-00000000001c', '66500000-0000-4000-8000-000000000023'),
('66600000-0000-4000-8000-000000000023', '66500000-0000-4000-8000-00000000001d', '66500000-0000-4000-8000-000000000024'),
('66600000-0000-4000-8000-000000000024', '66500000-0000-4000-8000-00000000001d', '66500000-0000-4000-8000-000000000025'),
('66600000-0000-4000-8000-000000000025', '66500000-0000-4000-8000-00000000001d', '66500000-0000-4000-8000-000000000026'),
('66600000-0000-4000-8000-000000000026', '66500000-0000-4000-8000-00000000001d', '66500000-0000-4000-8000-000000000027')
) as v(id, parent_id, child_id)
cross join (select id from public.organizations order by created_at limit 1) o;
insert into public.book_events (org_id, book_id, actor_id, event, detail) values
((select id from public.organizations order by created_at limit 1), '66000000-0000-4000-8000-000000000003', (select id from auth.users where email = 'admin@eduos.dev'), 'uploaded', '{"file":"Class_3_GK_Curriculum_Analysis.pdf","bytes":171200}'),
((select id from public.organizations order by created_at limit 1), '66000000-0000-4000-8000-000000000003', (select id from auth.users where email = 'admin@eduos.dev'), 'imported', '{"source":"Gemini curriculum analysis","units":6,"chapters":64,"topics":64,"outcomes":55,"concepts":39,"edges":38}');