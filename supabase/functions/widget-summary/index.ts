// FinFlow — read-only summary for the iOS (Scriptable) home-screen widget.
// GET /functions/v1/widget-summary?token=XYZ  → { currency, spentThisMonth, goal, recent }
// The token (from widget_tokens) authorises access to one household. Deploy with
// --no-verify-jwt; auth is the token itself. Free: a few calls/day per widget.
import { createClient } from 'npm:@supabase/supabase-js@2';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
  });
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const token = u.searchParams.get('token') || req.headers.get('x-widget-token');
  if (!token) return json({ error: 'missing token' }, 401);

  const sb = createClient(URL_, SVC);
  const { data: tok } = await sb.from('widget_tokens').select('household_id').eq('token', token).maybeSingle();
  if (!tok?.household_id) return json({ error: 'invalid token' }, 403);
  const hh = tok.household_id;

  const [{ data: household }, { data: txs }, { data: goals }, { data: cats }] = await Promise.all([
    sb.from('households').select('currency').eq('id', hh).single(),
    sb.from('transactions').select('type, amount, category_id, merchant, date').eq('household_id', hh).order('date', { ascending: false }).limit(400),
    sb.from('goals').select('name, target, saved, currency').eq('household_id', hh),
    sb.from('categories').select('id, name, emoji').eq('household_id', hh),
  ]);

  const currency = household?.currency || 'RON';
  const ym = new Date().toISOString().slice(0, 7);
  const catMap = new Map((cats || []).map((c: any) => [c.id, c]));

  const spentThisMonth = (txs || [])
    .filter((t: any) => t.type === 'expense' && (t.date || '').slice(0, 7) === ym)
    .reduce((a: number, t: any) => a + Number(t.amount || 0), 0);

  // Top savings goal: the incomplete one closest to its target (else the fullest).
  let goal: any = null;
  for (const g of goals || []) {
    const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
    const cand = { name: g.name, saved: Number(g.saved || 0), target: Number(g.target || 0), currency: g.currency || currency, pct: Math.min(100, Math.round(pct)) };
    if (!goal) goal = cand;
    else if (cand.pct < 100 && (goal.pct >= 100 || cand.pct > goal.pct)) goal = cand;
    else if (goal.pct >= 100 && cand.pct >= 100 && cand.saved > goal.saved) goal = cand;
  }

  const recent = (txs || []).slice(0, 4).map((t: any) => {
    const c: any = catMap.get(t.category_id);
    return { label: t.merchant || c?.name || 'Transaction', emoji: c?.emoji || '', amount: Number(t.amount || 0), type: t.type, date: t.date };
  });

  return json({ currency, spentThisMonth: Math.round(spentThisMonth), goal, recent });
});
