-- Adds the fields needed to gate the schedule feature behind a
-- subscription: which tier the currently-stored steps represent, the
-- lifetime free-generation marker, and a separate timestamp for the paid
-- regenerate-from-scratch cooldown (kept distinct from `updated_at` because
-- the free->paid extension must not count against that cooldown).
alter table public.schedules
  add column if not exists tier text not null default 'free',
  add column if not exists free_generation_used_at timestamptz,
  add column if not exists last_regenerated_at timestamptz;
