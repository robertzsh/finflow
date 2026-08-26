// FinFlow — daily reminder sender (Supabase Edge Function, Deno).
// Triggered hourly by pg_cron. For each enabled push subscription whose chosen
// local hour matches "now" (and that hasn't been sent today), it delivers a
// Web Push notification. Costs nothing: Web Push is free and this runs ~720x/mo.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

webpush.setVapidDetails('mailto:cirtina.robert99@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

function localParts(tz: string, now: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, hourCycle: 'h23', hour: '2-digit',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value])) as Record<string, string>;
  return { hour: parseInt(p.hour, 10), date: `${p.year}-${p.month}-${p.day}` };
}

Deno.serve(async (req) => {
  // Only pg_cron (which knows the secret) may trigger this.
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('enabled', true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const now = new Date();
  const payload = JSON.stringify({
    title: 'FinFlow',
    body: 'Did you spend anything today? Add it before you forget 💸',
    url: './',
  });

  let sent = 0, cleaned = 0;
  for (const s of subs ?? []) {
    let where;
    try { where = localParts(s.tz || 'UTC', now); } catch { continue; }
    if (where.hour !== s.hour) continue;      // not this device's hour yet
    if (s.last_sent === where.date) continue; // already reminded today

    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      await supabase.from('push_subscriptions').update({ last_sent: where.date }).eq('id', s.id);
      sent++;
    } catch (e: any) {
      // 404/410 → the browser dropped this subscription; remove it.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id);
        cleaned++;
      }
    }
  }
  return new Response(JSON.stringify({ sent, cleaned }), { headers: { 'content-type': 'application/json' } });
});
