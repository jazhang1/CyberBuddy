-- Stores the AI-generated learning schedule produced from a user's
-- background answers. One row per user; regenerating overwrites in place.
create table if not exists public.schedules (
  user_id uuid primary key references auth.users (id) on delete cascade,
  steps jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schedules enable row level security;

-- authenticated users may only read their own row
drop policy if exists "schedules_select_own" on public.schedules;
create policy "schedules_select_own"
  on public.schedules
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated users may only create their own row
drop policy if exists "schedules_insert_own" on public.schedules;
create policy "schedules_insert_own"
  on public.schedules
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated users may only update their own row
drop policy if exists "schedules_update_own" on public.schedules;
create policy "schedules_update_own"
  on public.schedules
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated users may only delete their own row
drop policy if exists "schedules_delete_own" on public.schedules;
create policy "schedules_delete_own"
  on public.schedules
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- admins can view everyone's generated schedule, consistent with their
-- existing visibility into profiles and background_answers.
drop policy if exists "schedules_select_admin" on public.schedules;
create policy "schedules_select_admin"
  on public.schedules
  for select
  to authenticated
  using (public.is_admin());
