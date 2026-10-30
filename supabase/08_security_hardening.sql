-- Security hardening for existing Jo1 databases.
-- Apply once in Supabase SQL Editor after reviewing the project backup.
begin;

-- Profiles contain private financial/admin fields. Users can read only their own row.
drop policy if exists p1 on public.profiles;
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- Remove the recursive policy that queried profiles from its own policy expression.
drop policy if exists p3 on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- A signed-in user may edit profile presentation fields, never wallet/admin fields.
create or replace function public.guard_profile_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    if new.coins is distinct from old.coins
      or new.diamonds is distinct from old.diamonds
      or new.bonus is distinct from old.bonus
      or new.is_admin is distinct from old.is_admin
      or new.banned is distinct from old.banned then
      raise exception 'PROTECTED_PROFILE_FIELDS';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_sensitive_columns on public.profiles;
create trigger protect_profile_sensitive_columns
before update on public.profiles
for each row execute function public.guard_profile_sensitive_columns();

commit;
