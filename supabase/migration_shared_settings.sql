-- FinFlow migration — shared currency + category emojis (run once in Supabase SQL Editor)

-- 1. Category emoji (so emojis show on every device in cloud mode)
alter table categories add column if not exists emoji text;

-- 2. Currency + exchange rates live on the household, shared across all members/devices
alter table households add column if not exists currency text not null default 'RON';
alter table households add column if not exists fx_rates jsonb not null default '{"RON":1,"EUR":5.0,"USD":4.6,"GBP":5.9}';
