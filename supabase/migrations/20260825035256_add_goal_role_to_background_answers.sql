-- Adds a goal-role question, separate from the 3 free-text background
-- questions: which path the person is aiming for, picked from 4 fixed
-- options (or "not sure yet").
alter table public.background_answers
  add column if not exists goal_role text not null default '';
