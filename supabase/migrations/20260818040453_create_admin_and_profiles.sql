-- Adds an admin role and a public mirror of auth.users so admins can list
-- everyone who has signed up (auth.users itself isn't exposed via the API).

-- Public mirror of auth.users, kept in sync by a trigger below.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Marks which users are admins. There is no self-service way to become an
-- admin -- rows are added manually (SQL editor / migration / service role).
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- A user may check whether *they* are an admin, nothing else.
drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
  on public.admin_users
  for select
  to authenticated
  using (auth.uid() = user_id);

-- security definer helper so RLS policies elsewhere can check admin status
-- without needing their own access to admin_users.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Profiles: admins can see everyone, everyone can see their own profile.
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Let admins read every user's background answers (their "cards").
drop policy if exists "background_answers_select_admin" on public.background_answers;
create policy "background_answers_select_admin"
  on public.background_answers
  for select
  to authenticated
  using (public.is_admin());

-- Keep public.profiles in sync with auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that already exist.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;
