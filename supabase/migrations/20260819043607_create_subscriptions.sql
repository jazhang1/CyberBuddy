-- Tracks each user's Stripe subscription status for the $8/month schedule
-- paywall. One row per user, written only by the Stripe webhook (via a
-- service-role client) -- there is deliberately no insert/update policy for
-- `authenticated`, so a signed-in user can never self-grant subscription
-- status by calling the table directly.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- webhook events (customer.subscription.updated/.deleted) carry the Stripe
-- subscription id, not our user_id, so lookups happen by this column.
create index if not exists subscriptions_stripe_subscription_id_idx
  on public.subscriptions (stripe_subscription_id);

-- authenticated users may only read their own row
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- admins can view everyone's subscription status, consistent with their
-- existing visibility into profiles, background_answers, and schedules.
drop policy if exists "subscriptions_select_admin" on public.subscriptions;
create policy "subscriptions_select_admin"
  on public.subscriptions
  for select
  to authenticated
  using (public.is_admin());
