-- FinFlow — home-screen widget access tokens. Run once in the SQL Editor. Idempotent.
-- A token maps to a household; the widget-summary function returns that household's
-- summary for whoever holds the token (it's a personal read-only secret).

create extension if not exists pgcrypto;

create table if not exists widget_tokens (
  token        text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  label        text default 'Home screen widget',
  created_at   timestamptz not null default now()
);

alter table widget_tokens enable row level security;
drop policy if exists "own widget tokens" on widget_tokens;
create policy "own widget tokens" on widget_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on widget_tokens to authenticated;
