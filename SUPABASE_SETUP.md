# FinFlow — cloud database & family sharing (Supabase)

This turns FinFlow from a browser-only app into a shared, cloud-synced one:
you and your partner each log in with your own email, both see the same
household finances, and your data persists everywhere (no more re-entering your
name, no data stuck on one device). GitHub Pages still hosts the app for free —
Supabase just holds the data.

You do the 3 setup steps below (about 5 minutes). Then send me the two keys from
Step 2 and I'll wire the app to it (login screen, sync, invite-your-partner flow).

---

## Step 1 — Create a free Supabase project
1. Go to https://supabase.com and sign up (free tier is plenty).
2. Click **New project**. Pick a name (e.g. `finflow`), a strong database
   password (save it somewhere), and the region closest to you (e.g. Frankfurt).
3. Wait ~2 minutes for it to finish provisioning.

## Step 2 — Grab your two keys
In the project: **Project Settings (gear) → API**. Copy these two values:
- **Project URL** — looks like `https://abcdxyz.supabase.co`
- **anon public key** — a long string under "Project API keys" (the `anon` one,
  NOT the `service_role` one).

These two are safe to put in a frontend app. Send them to me and I'll finish the wiring.

## Step 3 — Create the tables
1. In the project sidebar open **SQL Editor → New query**.
2. Open the file `supabase/schema.sql` from this project, copy everything, paste
   it into the editor, and click **Run**.
3. You should see "Success. No rows returned." That's correct — it just built the
   tables, security rules, and the auto-profile trigger.

## Step 4 — (optional) turn on email logins
**Authentication → Providers → Email** is on by default. If you'd rather skip
email-confirmation while testing, go to **Authentication → Providers → Email**
and toggle **Confirm email** off. (You can turn it back on later.)

---

## What I'll build once you send the keys

- A **login / sign-up screen** (email + password) replacing the local-only onboarding.
- Your **name and settings persist** in the cloud, tied to your account.
- A **household** model: when you sign up you get your own household; you invite your
  partner by sharing a short **invite code** (Settings → Household), they enter it and
  you're both on the same books.
- Every transaction records **who added it**, so you can see "who paid" and filter by person.
- **Live sync** — when one of you adds an expense, it appears for the other within a second.
- The current **local/offline mode stays as a fallback** if no keys are configured, so the
  app still runs without a backend.

## How the pieces fit

```
Your browser (GitHub Pages)  ──►  Supabase Auth   (who you are)
        │                          Supabase Postgres (your household's data)
        └── live updates ◄──────── Supabase Realtime (both partners in sync)
```

Security note: Supabase **Row-Level Security** (set up by the schema) guarantees each
account can only ever read or write its own household's rows — even though the app is
public, nobody can see your data without logging into your household.
