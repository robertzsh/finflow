-- FinFlow — daily reminder push notifications.
-- Run once in Supabase → SQL Editor. Idempotent.

create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  hour         int  not null default 21,               -- local hour (0-23) to send the reminder
  tz           text not null default 'Europe/Bucharest',
  enabled      boolean not null default true,
  last_sent    date,                                    -- guards against sending twice in one day
  created_at   timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- Each user manages only their own subscriptions.
drop policy if exists "own push subs" on push_subscriptions;
create policy "own push subs" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on push_subscriptions to authenticated;
