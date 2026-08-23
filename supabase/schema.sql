-- FinFlow — Supabase schema for shared "household" finances
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- It creates the tables, security rules, and the auto-profile trigger.

-- ---------------------------------------------------------------------------
-- 1. Households & profiles
-- ---------------------------------------------------------------------------
create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our household',
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  currency    text not null default 'RON',
  fx_rates    jsonb not null default '{"RON":1,"EUR":5.0,"USD":4.6,"GBP":5.9}',
  created_at  timestamptz not null default now()
);

create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text,
  household_id    uuid references households(id) on delete set null,
  opening_balance numeric not null default 0,
  salary          numeric not null default 0,
  vouchers        numeric not null default 0,
  created_at      timestamptz not null default now()
);

-- Helper: the household of the currently-authenticated user.
create or replace function current_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from profiles where id = auth.uid();
$$;

-- On signup, create a profile + a personal household so the user is never orphaned.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  insert into households (name) values ('Household') returning id into hid;
  insert into profiles (id, name, household_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), hid);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Data tables (all scoped to a household)
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id text primary key default gen_random_uuid()::text,
  household_id uuid not null references households(id) on delete cascade,
  name text not null, kind text not null, icon text, color text, emoji text, parent text, custom boolean default true
);

create table if not exists transactions (
  id text primary key default gen_random_uuid()::text,
  household_id uuid not null references households(id) on delete cascade,
  created_by text,   -- member id, or 'all' for a shared/split expense
  type text not null, amount numeric not null, category_id text,
  merchant text, method text, date date not null, notes text,
  recurring boolean default false, frequency text, receipt text,
  created_at timestamptz not null default now()
);

create table if not exists budgets (
  id text primary key default gen_random_uuid()::text,
  household_id uuid not null references households(id) on delete cascade,
  category_id text not null, amount numeric not null, month text default 'all'
);

create table if not exists goals (
  id text primary key default gen_random_uuid()::text,
  household_id uuid not null references households(id) on delete cascade,
  name text not null, target numeric, saved numeric, monthly_contribution numeric,
  color text, icon text, currency text, created_at date
);

create table if not exists investments (
  id text primary key default gen_random_uuid()::text,
  household_id uuid not null references households(id) on delete cascade,
  name text not null, ticker text, kind text, currency text,
  units numeric, cost_basis numeric, current_value numeric, history jsonb default '[]'
);

-- ---------------------------------------------------------------------------
-- 3. Row-Level Security — a user only ever sees their household's rows
-- ---------------------------------------------------------------------------
alter table households   enable row level security;
alter table profiles     enable row level security;
alter table categories   enable row level security;
alter table transactions enable row level security;
alter table budgets      enable row level security;
alter table goals        enable row level security;
alter table investments  enable row level security;

-- profiles: you can read/update your own; read others in your household
create policy "own profile"      on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "household mates"  on profiles for select using (household_id = current_household());

-- households: members can see & rename their household
create policy "member household" on households for select using (id = current_household());
create policy "update household" on households for update using (id = current_household());

-- generic household-scoped policy for the data tables
do $$
declare t text;
begin
  foreach t in array array['categories','transactions','budgets','goals','investments'] loop
    execute format('create policy "hh read %1$s"   on %1$s for select using (household_id = current_household());', t);
    execute format('create policy "hh write %1$s"  on %1$s for insert with check (household_id = current_household());', t);
    execute format('create policy "hh update %1$s" on %1$s for update using (household_id = current_household());', t);
    execute format('create policy "hh delete %1$s" on %1$s for delete using (household_id = current_household());', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Realtime (so both partners see changes live)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table transactions, budgets, goals, investments, categories;

-- ---------------------------------------------------------------------------
-- 5. Join a household by invite code (used by the "join" screen)
-- ---------------------------------------------------------------------------
create or replace function join_household(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select id into hid from households where invite_code = code;
  if hid is null then raise exception 'Invalid invite code'; end if;
  update profiles set household_id = hid where id = auth.uid();
  return hid;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Grants — RLS decides WHICH rows; these grant table access to logged-in users.
--    Without these you get "permission denied for table ...".
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

-- Hardening: users may only edit their own display name, never re-point their
-- household_id directly (joining goes through the secure join_household() function).
revoke update on profiles from authenticated;
grant update (name, opening_balance, salary, vouchers) on profiles to authenticated;
