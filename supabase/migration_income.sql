-- FinFlow migration — per-person standing monthly income (salary + vouchers)
alter table profiles add column if not exists salary numeric not null default 0;
alter table profiles add column if not exists vouchers numeric not null default 0;

-- allow each user to edit their own name, balance and income figures
grant update (name, opening_balance, salary, vouchers) on profiles to authenticated;
