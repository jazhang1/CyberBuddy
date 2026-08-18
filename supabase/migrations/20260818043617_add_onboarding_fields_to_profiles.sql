-- Adds the fields collected in the post-signup onboarding step: how much
-- cybersecurity experience the user has, and their occupation.
alter table public.profiles
  add column if not exists experience_level text,
  add column if not exists occupation text,
  add column if not exists onboarding_completed_at timestamptz;

-- Users can update their own profile (needed to save onboarding answers).
-- Select policies already exist from the earlier admin/profiles migration.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
