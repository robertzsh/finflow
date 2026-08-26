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

const MORNING = [
  'Good morning ☕ Log yesterday’s spending before the day runs away.',
  'Morning check-in 💸 Add any transactions you haven’t recorded yet.',
  'Rise & track 🌅 A quick minute to log what you spent recently.',
  'Coffee + finances ☕ Did every purchase make it into FinFlow?',
];
const EVENING = [
  'Evening wrap-up 🌙 Did you record everything you spent today?',
  'Before bed ✅ Add today’s transactions so nothing slips through.',
  'End of day 💤 Log today’s spending while it’s still fresh.',
  'Quick review 🌆 Any purchases today that aren’t in FinFlow yet?',
];
const MIDDAY = [
  'Midday nudge 💸 Log any spending from this morning.',
  'Quick check ⏱️ Add the transactions you’ve made so far today.',
];

function dayOfYear(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = Date.UTC(y, 0, 0);
  return Math.floor((Date.UTC(y, m - 1, d) - start) / 86400000);
}
function messageFor(hour: number, date: string): string {
  const pool = hour < 12 ? MORNING : hour >= 18 ? EVENING : MIDDAY;
  return pool[dayOfYear(date) % pool.length];
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
  let sent = 0, cleaned = 0;

  for (const s of subs ?? []) {
    let where;
    try { where = localParts(s.tz || 'UTC', now); } catch { continue; }

    // A device can have several reminder times (e.g. 10 and 22). Fire the one
    // whose hour matches now and that hasn't already been sent today.
    const hours: number[] = Array.isArray(s.hours) && s.hours.length ? s.hours : (s.hour != null ? [s.hour] : []);
    if (!hours.includes(where.hour)) continue;

    const log: Record<string, string> = s.sent_log && typeof s.sent_log === 'object' ? s.sent_log : {};
    if (log[String(where.hour)] === where.date) continue; // already reminded for this slot today

    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: 'FinFlow', body: messageFor(where.hour, where.date), url: './' }),
      );
      log[String(where.hour)] = where.date;
      await supabase.from('push_subscriptions').update({ sent_log: log }).eq('id', s.id);
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
