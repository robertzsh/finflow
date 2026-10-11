-- FinFlow — cumulative migration (safe to run anytime; all statements are idempotent).
-- Run once in Supabase → SQL Editor to bring your project fully up to date.

-- Category emoji
alter table categories add column if not exists emoji text;

-- Household-shared currency + exchange rates
alter table households add column if not exists currency text not null default 'RON';
alter table households add column if not exists fx_rates jsonb not null default '{"RON":1,"EUR":5.0,"USD":4.6,"GBP":5.9}';

-- Allow "Everyone (split)" as payer: created_by becomes text (drop the UUID FK)
alter table transactions drop constraint if exists transactions_created_by_fkey;
alter table transactions alter column created_by type text using created_by::text;

-- Per-person figures: balance + standing monthly income
alter table profiles add column if not exists opening_balance numeric not null default 0;
alter table profiles add column if not exists salary numeric not null default 0;
alter table profiles add column if not exists vouchers numeric not null default 0;

-- Column-level update grant (users can edit only these fields on their own profile)
grant update (name, opening_balance, salary, vouchers) on profiles to authenticated;

-- Sub-categories (e.g. grocery stores roll up under Groceries)
alter table categories add column if not exists parent text;

-- Goals: personal vs family scope + contribution log (amounts stored in base currency)
alter table goals add column if not exists owner text;
alter table goals add column if not exists contributions jsonb not null default '[]';

-- Economii: savings pots (balance + movement log; movements stored as jsonb like goal contributions)
create table if not exists savings_pots (
  id text primary key default gen_random_uuid()::text,
  household_id uuid not null references households(id) on delete cascade,
  name text not null, icon text, color text, currency text, owner text,
  start_balance numeric not null default 0, movements jsonb not null default '[]',
  auto_save jsonb, created_at date, created_by text
);
alter table savings_pots enable row level security;
drop policy if exists "hh read savings_pots"   on savings_pots;
drop policy if exists "hh write savings_pots"  on savings_pots;
drop policy if exists "hh update savings_pots" on savings_pots;
drop policy if exists "hh delete savings_pots" on savings_pots;
create policy "hh read savings_pots"   on savings_pots for select using (household_id = current_household());
create policy "hh write savings_pots"  on savings_pots for insert with check (household_id = current_household());
create policy "hh update savings_pots" on savings_pots for update using (household_id = current_household());
create policy "hh delete savings_pots" on savings_pots for delete using (household_id = current_household());
grant select, insert, update, delete on savings_pots to authenticated;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'savings_pots') then
    alter publication supabase_realtime add table savings_pots;
  end if;
end $$;

-- Per-person monthly savings target
alter table profiles add column if not exists savings_target numeric not null default 0;
grant update (name, opening_balance, salary, vouchers, savings_target) on profiles to authenticated;
