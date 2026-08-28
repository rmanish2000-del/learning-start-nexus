create or replace function private.profile_org_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = _user_id
$$;

revoke all on function private.profile_org_id(uuid) from public, anon, authenticated;

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id and org_id is null);

drop policy if exists "Users update own profile; admins update org profiles" on public.profiles;
create policy "Users update own profile; admins update org profiles"
on public.profiles
for update
to authenticated
using (
  (auth.uid() = id)
  or (private.has_role(auth.uid(), 'admin'::app_role) and org_id = private.current_org_id())
)
with check (
  (
    auth.uid() = id
    and org_id is not distinct from private.profile_org_id(auth.uid())
  )
  or (
    private.has_role(auth.uid(), 'admin'::app_role)
    and org_id = private.current_org_id()
  )
);