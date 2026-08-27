-- Adds a third onboarding question: how many hours per week the person can
-- spend. Stored as a bucket ('1-3' | '4-7' | '8+') rather than a raw number
-- since that's all the UI offers. Not used in any matching/generation logic
-- yet -- that's for a later version.
alter table public.profiles
  add column if not exists hours_per_week text;
