# FinFlow daily reminders — one-time setup

This turns on the in-app "Daily reminder" toggle (Settings → Daily reminder).
Everything below is on Supabase's **free** tier — no card, no per-message cost.
You only do this once. After that, you and Iulia just flip the toggle in the app.

Your pre-generated keys (already wired into the app + files):

Generate your own keys — nothing key-related is committed:

```bash
npx web-push generate-vapid-keys   # → a public + private key
```

- **VAPID public key** → set as the GitHub Actions repo secret `VITE_VAPID_PUBLIC_KEY`
  (and in local `.env` for dev). It's safe to expose. Without it, reminders are disabled.
- **VAPID private key** → Supabase function secret only (step 3). Never commit it.
- **CRON_SECRET** → any random string (`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`); function secret + the cron SQL.

---

## 1. Create the table

Supabase → **SQL Editor** → paste the contents of `supabase/migration_push.sql` → **Run**.

## 2. Deploy the edge function

Easiest via the **Supabase CLI** (from the `finflow` folder):

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy send-reminders --no-verify-jwt
```

`--no-verify-jwt` is required because the hourly cron calls it without a user
login — it authenticates with the `x-cron-secret` header instead.

(No CLI? You can also create the function in Dashboard → Edge Functions → Deploy,
pasting `supabase/functions/send-reminders/index.ts`.)

## 3. Set the function secrets

Supabase → **Edge Functions → send-reminders → Secrets** (or via CLI). Add:

| Name                 | Value                                        |
| -------------------- | -------------------------------------------- |
| `VAPID_PUBLIC_KEY`   | `BEN9kgA8-…OBNWhkI` (the public key above)    |
| `VAPID_PRIVATE_KEY`  | `<YOUR_VAPID_PRIVATE_KEY>` |
| `CRON_SECRET`        | `<YOUR_CRON_SECRET>`            |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function
automatically — you don't set those.

CLI equivalent:

```bash
supabase secrets set VAPID_PUBLIC_KEY='BEN9kgA8-NiPWYttBZnCLhPmtyOqa_QBiT_Yc87d7j_tQ5_O8jmlcLFY7OWCbtLKqSg7HKkYNZ73lOOJOBNWhkI'
supabase secrets set VAPID_PRIVATE_KEY='<YOUR_VAPID_PRIVATE_KEY>'
supabase secrets set CRON_SECRET='<YOUR_CRON_SECRET>'
```

## 4. Schedule the hourly run

Open `supabase/cron_reminders.sql`, replace `<PROJECT_REF>` with your project ref,
then run it in the **SQL Editor**. It enables `pg_cron` + `pg_net` and schedules
the function every hour.

## 5. Turn it on in the app

On your **iPhone**: open FinFlow from the **Home Screen icon** (not the Safari tab —
iOS only allows push for installed PWAs). Go to **Settings → Daily reminder**,
flip it on (accept the notification prompt), and pick a time. Iulia does the same
on her phone.

---

### Test it without waiting a day

Temporarily set your reminder time to the **next whole hour**, then either wait
for the top of the hour, or trigger the function once manually:

```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders' \
  -H 'x-cron-secret: <YOUR_CRON_SECRET>'
```

It replies `{"sent":N,"cleaned":M}`. If your current local hour matches your
chosen time and you haven't been reminded today, the notification arrives.

### Notes

- **Cost:** free. Web Push has no fees; the cron is ~720 runs/month vs Supabase's
  500,000/month free allowance.
- **Free-tier pause:** a Supabase project pauses after ~7 days of *no* activity,
  which would pause reminders too. Normal daily use keeps it awake; if it ever
  pauses, reopening the app resumes everything.
- **Rotating keys:** if you ever regenerate VAPID keys, update the function
  secrets and set `VITE_VAPID_PUBLIC_KEY` in the build (GitHub secret), and every
  device must toggle the reminder off/on to re-subscribe.
