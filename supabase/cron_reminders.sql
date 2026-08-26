-- FinFlow — schedule the daily-reminder function to run every hour (on the hour, UTC).
-- The function itself decides who to notify based on each device's local time,
-- so hourly is enough to cover every timezone. Run this once in the SQL Editor.
--
-- Before running: replace <PROJECT_REF> with your Supabase project ref (the
-- subdomain in your project URL, e.g. abcd1234) and keep the CRON_SECRET the
-- same value you set as the function secret.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous schedule with this name, then (re)create it.
select cron.unschedule('finflow-reminders')
where exists (select 1 from cron.job where jobname = 'finflow-reminders');

select cron.schedule(
  'finflow-reminders',
  '0 * * * *',                       -- every hour, at minute 0
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'RNESMnTxS_fyjY6e7LgyilnYEGnZ4Jb8'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Handy checks:
--   select * from cron.job;                                   -- see the schedule
--   select * from cron.job_run_details order by end_time desc limit 5;  -- see recent runs
