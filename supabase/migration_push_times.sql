-- FinFlow — allow multiple reminder times per device (e.g. 10:00 and 22:00),
-- each de-duplicated independently per day. Run once in the SQL Editor. Idempotent.

-- List of local hours (0-23) to remind at. Default: morning + evening.
alter table push_subscriptions add column if not exists hours int[] not null default '{10,22}';

-- Per-slot "last sent" map, e.g. {"10":"2026-08-26","22":"2026-08-25"} so each
-- time fires at most once a day without blocking the other.
alter table push_subscriptions add column if not exists sent_log jsonb not null default '{}'::jsonb;

-- Backfill existing rows that still use the old single `hour` column.
update push_subscriptions set hours = array[hour]
where hours = '{10,22}' and hour is not null and hour not in (10, 22);
