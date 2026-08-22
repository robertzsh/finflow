-- FinFlow migration — per-member opening balance (household balance = sum of members)
-- Run once in Supabase → SQL Editor.

alter table profiles add column if not exists opening_balance numeric not null default 0;

-- allow each user to edit their own name + opening balance (never household_id)
grant update (name, opening_balance) on profiles to authenticated;
