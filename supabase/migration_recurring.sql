-- FinFlow — auto-posting of recurring bills.
-- Adds columns so a recurring "template" can be flagged as variable-amount, and so
-- auto-posted instances are tagged + idempotent. Safe to run more than once.
alter table public.transactions
  add column if not exists variable_amount boolean default false,
  add column if not exists auto            boolean default false,
  add column if not exists recurrence_key  text,
  -- original foreign currency + amount, so bills re-convert at the right day's rate
  add column if not exists orig_currency   text,
  add column if not exists orig_amount     numeric;

-- Helps the app avoid re-posting the same occurrence across devices.
create index if not exists transactions_recurrence_key_idx
  on public.transactions (household_id, recurrence_key);
