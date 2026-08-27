# FinFlow home-screen widget (iPhone) — setup

A medium (4×2) widget showing **spent this month**, your **top savings goal**, and
your **recent transactions**. Runs in the free **Scriptable** app, reading a tiny
free Supabase endpoint. No costs, no Apple Developer account.

You do steps 1–4 once. After that the widget refreshes itself.

---

## 1. Create the token table

Supabase → **SQL Editor** → paste `supabase/migration_widget.sql` → **Run**.

## 2. Deploy the endpoint

`npx supabase functions deploy widget-summary --no-verify-jwt`

(or Dashboard → Edge Functions → Deploy a new function named `widget-summary`,
paste `supabase/functions/widget-summary/index.ts`, and turn **Verify JWT OFF**).

No new secrets needed — it uses the built-in `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY`.

## 3. Mint your personal token

Run this in the **SQL Editor** — it returns one `token` value; copy it:

```sql
insert into widget_tokens (token, user_id, household_id)
select encode(gen_random_bytes(18), 'hex'), p.id, p.household_id
from profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('cirtina.robert99@gmail.com')
returning token;
```

(Change the email for Iulia to give her her own token — or reuse the same one;
it's the same family data either way.)

Test it in a browser:
`https://xfxwvdywjcimmyaokbba.supabase.co/functions/v1/widget-summary?token=YOUR_TOKEN`
You should get JSON with `spentThisMonth`, `goal`, and `recent`.

## 4. Add the widget

1. Install **Scriptable** (App Store, free).
2. Open it → **＋** (new script) → paste all of `widget/FinFlowWidget.js`.
3. At the top, set `TOKEN` to the token from step 3 (`PROJECT_REF` is already
   filled in). Tap **Done**. Run it once (▶) to preview.
4. Home Screen → long-press empty space → **＋** → search **Scriptable** →
   pick the **Medium** size → **Add Widget**.
5. Long-press the new widget → **Edit Widget** → **Script** → choose **FinFlow**.

Done. It updates every ~30 minutes (iOS decides the exact timing).

---

### Notes

- **Cost:** free. Scriptable is free; the endpoint runs on Supabase's free tier
  (a few calls a day). A free project pauses after ~7 days of no activity — normal
  use keeps it awake.
- **Security:** the token is a read-only secret for your household's summary only.
  To revoke a token: `delete from widget_tokens where token = '…';`
- **Change what it shows:** tell me and I'll tweak `FinFlowWidget.js` /
  `widget-summary` (e.g. add balance, savings rate, or a specific goal).
