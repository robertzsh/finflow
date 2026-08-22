# FinFlow — security overview

## What is public, and why that's safe

FinFlow is a static web app on GitHub Pages, so a few things are visible to anyone —
and all of them are **designed** to be public:

- **The app code (HTML/JS/CSS).** It's a front-end app; there are no secrets in it.
- **Your Supabase URL and the `anon` (public) key.** These are meant to live in the
  browser. On their own they let someone reach the *login door* — not your data.

**Your actual financial data is never exposed.** It sits in Supabase Postgres and is
gated by two independent layers:

1. **Authentication** — nothing is returned without a valid login token (your email +
   password).
2. **Row-Level Security (RLS)** — even with a token, the database only ever returns rows
   belonging to *your household*. Another logged-in user physically cannot read your rows.

In transit everything is **HTTPS/TLS encrypted**; at rest Supabase **encrypts the
database**. The `service_role` key (the powerful one) is **never** in the app — only the
restricted `anon` key is.

So: the door is public, but only you have the key, and even inside, the walls (RLS) keep
each household separate.

## Verify it yourself (run in Supabase → SQL Editor)

Confirm RLS is ON for every table (all should say `true`):

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

List the active security policies:

```sql
select tablename, policyname, cmd from pg_policies where schemaname = 'public';
```

## Recommended hardening (5 minutes, all optional but worth it)

### 1. Close public sign-ups once you're both in
By default anyone can create an account. That doesn't expose *your* data (a new account
gets its own empty household), but there's no reason to allow strangers to register.
After you and your partner have both signed up and joined the household:

Supabase → **Authentication → Sign In / Providers → Email** → turn **"Allow new users to
sign up"** off.

### 2. Keep email confirmation ON
Supabase → **Authentication → Email** → ensure **Confirm email** is enabled (default).
This stops someone signing up with an email that isn't theirs.

### 3. Turn on leaked-password protection + a minimum length
Supabase → **Authentication → Policies / Password** → enable **"Check against HaveIBeenPwned"**
and set a **minimum length of 8+**. Then use a strong, unique password.

### 4. Lock the household so it can't be joined by ID (defense-in-depth)
The invite code is the intended way to join. To make sure nobody can switch households by
guessing an internal ID, restrict profile edits to the name only (run once in SQL Editor):

```sql
revoke update on profiles from authenticated;
grant update (name) on profiles to authenticated;
```

Joining still works, because it goes through the secure `join_household()` function.

### 5. App-level lock (already built in)
Settings → **Security** → turn on **PIN lock**; the app also **auto-locks after inactivity**.
This protects the app on a shared or unattended device (it's convenience security on top of
the real protection above, not a replacement for your password).

## What you do NOT need to worry about
- The GitHub repo being public — it contains no secrets.
- The `anon` key being in the page source — that's expected and safe with RLS.
- Realtime sync — Supabase applies the same RLS to live updates, so it can't leak other
  households' changes.
