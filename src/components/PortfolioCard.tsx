import { useStore } from '@/store/useStore';
import { investmentTotals, investmentAllocation, toBase } from '@/lib/finance';
import { formatMoney, cx } from '@/lib/format';

/** Hero portfolio card for the Investments tab — a terminal/mono "account card" style:
 *  big value, four metric tiles, and a live top-movers activity list. */
export function PortfolioCard() {
  const investments = useStore((s) => s.investments);
  const settings = useStore((s) => s.settings);
  const quotes = useStore((s) => s.quotes);
  const name = useStore((s) => s.settings.name) || 'You';
  const cur = settings.currency;
  const fx = settings.fxRates;

  const totals = investmentTotals(investments, fx);
  const alloc = investmentAllocation(investments, fx);
  const topKind = [...alloc].sort((a, b) => b.value - a.value)[0]?.name ?? '—';

  // Value-weighted day change from live quotes.
  let dayBase = 0, dayDelta = 0;
  for (const i of investments) {
    const q = quotes[i.id]; if (!q) continue;
    const v = toBase(i.currentValue, i.currency, fx);
    dayBase += v; dayDelta += v * (q.changePct / 100);
  }
  const dayPct = dayBase > 0 ? (dayDelta / dayBase) * 100 : 0;
  const hasDay = dayBase > 0;

  // Activity = top movers today if we have quotes, else the largest holdings.
  const movers = investments
    .map((i) => ({ i, q: quotes[i.id], base: toBase(i.currentValue, i.currency, fx) }))
    .sort((a, b) => (Math.abs((b.q?.changePct ?? 0)) - Math.abs((a.q?.changePct ?? 0))) || (b.base - a.base))
    .slice(0, 4);

  const money = (n: number, opts?: Parameters<typeof formatMoney>[2]) => formatMoney(n, cur, opts);
  const Tile = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</span>
      <span className={cx('font-mono text-sm font-semibold tabular-nums truncate', tone)}>{value}</span>
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e17] p-5 sm:p-6 mb-4 font-mono">
      {/* dotted grid texture + soft glow */}
      <div aria-hidden className="absolute inset-0 opacity-[0.5] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none bg-emerald-500/40" />

      <div className="relative">
        <div className="flex items-center justify-between text-[11px] tracking-[0.14em]">
          <span className="font-semibold">FINFLOW · PORTFOLIO</span>
          <span className="text-income font-semibold">INVESTMENTS</span>
        </div>
        <div className="text-[11px] tracking-[0.12em] text-white/40 mt-0.5">{name.toUpperCase()}</div>

        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">Portfolio value</div>
          <div className="text-3xl sm:text-4xl font-semibold tabular-nums mt-1">{money(totals.value)}</div>
          <div className={cx('text-sm mt-1 tabular-nums', totals.gain >= 0 ? 'text-income' : 'text-expense')}>
            {totals.gain >= 0 ? '+' : ''}{money(totals.gain)} ({totals.gainPct >= 0 ? '+' : ''}{totals.gainPct.toFixed(1)}%) all-time
            {hasDay && <span className="text-white/40"> · </span>}
            {hasDay && <span className={dayDelta >= 0 ? 'text-income' : 'text-expense'}>{dayDelta >= 0 ? '+' : ''}{money(dayDelta)} today</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <Tile label="Invested" value={money(totals.cost)} />
          <Tile label="Return" value={`${totals.gainPct >= 0 ? '+' : ''}${totals.gainPct.toFixed(1)}%`} tone={totals.gain >= 0 ? 'text-income' : 'text-expense'} />
          <Tile label="Today" value={hasDay ? `${dayPct >= 0 ? '+' : ''}${dayPct.toFixed(2)}%` : '—'} tone={hasDay ? (dayDelta >= 0 ? 'text-income' : 'text-expense') : 'text-white/50'} />
          <Tile label="Holdings" value={`${investments.length} · ${topKind}`} />
        </div>

        {movers.length > 0 && (
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">{Object.keys(quotes).length ? 'Top movers today' : 'Largest holdings'}</div>
            <div className="space-y-1.5">
              {movers.map(({ i, q, base }) => (
                <div key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="font-semibold truncate">{i.ticker ?? i.name}</span>
                  <span className="text-white/40 text-xs truncate flex-1">{i.name !== (i.ticker ?? i.name) ? i.name : i.kind}</span>
                  {q
                    ? <span className={cx('tabular-nums shrink-0', q.changePct >= 0 ? 'text-income' : 'text-expense')}>{q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%</span>
                    : <span className="tabular-nums shrink-0 text-white/70">{money(base, { compact: base > 9999 })}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
