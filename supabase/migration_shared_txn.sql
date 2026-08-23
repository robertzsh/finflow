-- FinFlow migration — allow "Everyone (split)" as the payer on a transaction.
-- created_by held a user UUID with a foreign key; shared expenses need to store 'all',
-- so we drop the FK and make it plain text (still holds member ids as strings).
alter table transactions drop constraint if exists transactions_created_by_fkey;
alter table transactions alter column created_by type text using created_by::text;
