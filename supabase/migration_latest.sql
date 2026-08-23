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
