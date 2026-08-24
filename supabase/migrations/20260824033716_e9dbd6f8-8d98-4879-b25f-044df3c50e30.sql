
-- Sprint 6: Book upload & curriculum extraction

create table public.books (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  title text not null,
  grade int not null check (grade between 1 and 12),
  subject text not null,
  file_names text[] not null default '{}',
  storage_paths text[] not null default '{}',
  mime_types text[] not null default '{}',
  file_size_bytes bigint not null default 0,
  status text not null default 'uploaded' check (status in ('uploaded','processing','processed','failed')),
  processing_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.books to authenticated;
grant all on public.books to service_role;
alter table public.books enable row level security;

create policy books_select on public.books for select to authenticated
  using (org_id = private.current_org_id() and (private.is_staff() or private.is_reviewer()));
create policy books_insert on public.books for insert to authenticated
  with check (org_id = private.current_org_id() and private.is_staff() and uploaded_by = auth.uid());
create policy books_update on public.books for update to authenticated
  using (org_id = private.current_org_id() and private.is_staff())
  with check (org_id = private.current_org_id() and private.is_staff());
create policy books_delete on public.books for delete to authenticated
  using (org_id = private.current_org_id() and private.is_staff());

create table public.curriculum_units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  position int not null default 0,
  status text not null default 'suggested' check (status in ('suggested','approved')),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.curriculum_units to authenticated;
grant all on public.curriculum_units to service_role;
alter table public.curriculum_units enable row level security;

create policy units_select on public.curriculum_units for select to authenticated
  using (org_id = private.current_org_id() and (private.is_staff() or private.is_reviewer()));
create policy units_insert on public.curriculum_units for insert to authenticated
  with check (org_id = private.current_org_id() and private.is_staff());
create policy units_update on public.curriculum_units for update to authenticated
  using (org_id = private.current_org_id() and private.is_staff())
  with check (org_id = private.current_org_id() and private.is_staff());
create policy units_delete on public.curriculum_units for delete to authenticated
  using (org_id = private.current_org_id() and private.is_staff());

create table public.curriculum_chapters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  unit_id uuid not null references public.curriculum_units(id) on delete cascade,
  title text not null,
  position int not null default 0,
  status text not null default 'suggested' check (status in ('suggested','approved')),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.curriculum_chapters to authenticated;
grant all on public.curriculum_chapters to service_role;
alter table public.curriculum_chapters enable row level security;

create policy chapters_select on public.curriculum_chapters for select to authenticated
  using (org_id = private.current_org_id() and (private.is_staff() or private.is_reviewer()));
create policy chapters_insert on public.curriculum_chapters for insert to authenticated
  with check (org_id = private.current_org_id() and private.is_staff());
create policy chapters_update on public.curriculum_chapters for update to authenticated
  using (org_id = private.current_org_id() and private.is_staff())
  with check (org_id = private.current_org_id() and private.is_staff());
create policy chapters_delete on public.curriculum_chapters for delete to authenticated
  using (org_id = private.current_org_id() and private.is_staff());

create table public.curriculum_topics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.curriculum_chapters(id) on delete cascade,
  title text not null,
  position int not null default 0,
  status text not null default 'suggested' check (status in ('suggested','approved')),
  learning_outcomes jsonb not null default '[]',
  key_concepts jsonb not null default '[]',
  question_opportunities jsonb not null default '[]',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.curriculum_topics to authenticated;
grant all on public.curriculum_topics to service_role;
alter table public.curriculum_topics enable row level security;

create policy topics_select on public.curriculum_topics for select to authenticated
  using (org_id = private.current_org_id() and (private.is_staff() or private.is_reviewer()));
create policy topics_insert on public.curriculum_topics for insert to authenticated
  with check (org_id = private.current_org_id() and private.is_staff());
create policy topics_update on public.curriculum_topics for update to authenticated
  using (org_id = private.current_org_id() and private.is_staff())
  with check (org_id = private.current_org_id() and private.is_staff());
create policy topics_delete on public.curriculum_topics for delete to authenticated
  using (org_id = private.current_org_id() and private.is_staff());

-- Storage policies for the private 'books' bucket: files live under <org_id>/<book_id>/...
create policy books_files_read on storage.objects for select to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = private.current_org_id()::text and (private.is_staff() or private.is_reviewer()));
create policy books_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'books' and (storage.foldername(name))[1] = private.current_org_id()::text and private.is_staff());
create policy books_files_update on storage.objects for update to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = private.current_org_id()::text and private.is_staff())
  with check (bucket_id = 'books' and (storage.foldername(name))[1] = private.current_org_id()::text and private.is_staff());
create policy books_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = private.current_org_id()::text and private.is_staff());
