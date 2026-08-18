-- Stores each user's answers to the 3 background questions asked after sign-up.
-- One row per user; answers start blank and are edited in place.
create table if not exists public.background_answers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  question_1 text not null default '',
  question_2 text not null default '',
  question_3 text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.background_answers enable row level security;

-- authenticated users may only read their own row
create policy if not exists "background_answers_select_own"
  on public.background_answers
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated users may only create their own row
create policy if not exists "background_answers_insert_own"
  on public.background_answers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated users may only update their own row
create policy if not exists "background_answers_update_own"
  on public.background_answers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated users may only delete their own row
create policy if not exists "background_answers_delete_own"
  on public.background_answers
  for delete
  to authenticated
  using (auth.uid() = user_id);
