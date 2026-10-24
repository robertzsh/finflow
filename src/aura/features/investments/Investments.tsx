import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Upload, RefreshCw, Pencil, KeyRound } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/aura/components/PageTransition';
import { PageHeader, SectionCardHeader } from '@/aura/components/layout/PageHeader';
import { Card } from '@/aura/components/ui/Card';
import { Button, IconButton } from '@/aura/components/ui/Button';
import { Callout } from '@/aura/components/ui/Callout';
import type { TagTone } from '@/aura/components/ui/Badge';
import { Input, Label, Select } from '@/aura/components/ui/Field';
import { Modal } from '@/aura/components/ui/Modal';
import { Badge } from '@/aura/components/ui/Badge';
import { EmptyState } from '@/aura/components/ui/EmptyState';
import { MarketWatch } from '@/aura/components/MarketWatch';
import { PortfolioCard } from '@/aura/components/PortfolioCard';
import { DonutChart, InvestHistory, LegendList } from '@/aura/components/charts/ChartKit';
import { investmentAllocation, investmentHistory, toBase } from '@/lib/finance';
import { formatMoney, cx, localDateKey } from '@/lib/format';
import { parseInvestmentsCSV } from '@/lib/export';
import type { Investment, InvestmentKind, CurrencyCode } from '@/types';

const KINDS: InvestmentKind[] = ['Stock', 'ETF', 'Crypto', 'Savings', 'Pension'];
const LIVE_KINDS = new Set<InvestmentKind>(['Stock', 'ETF', 'Crypto']);
const KIND_TONE: Record<string, TagTone> = { Stock: 'blue', ETF: 'purple', Crypto: 'orange', Savings: 'green', Pension: 'brown' };

/** Tiny inline sparkline from a holding's value history. */
function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return <div className="w-16 h-6" />;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const w = 64, h = 24;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / span) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline points={d} fill="none" stroke={up ? 'rgb(var(--income))' : 'rgb(var(--expense))'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export default function Investments() {
  const { investments, settings, addInvestment, updateInvestment, deleteInvestment, importInvestments, refreshPrices, quotes, pricesState, updateSettings } = useStore();
  const cur = settings.currency;
  const fx = settings.fxRates;
  const [open, setOpen] = useState(false);
  const [editInv, setEditInv] = useState<Investment | null>(null);
  const [msg, setMsg] = useState('');
  const [keyInput, setKeyInput] = useState(settings.finnhubKey ?? '');
  const [showKey, setShowKey] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  function onCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const holdings = parseInvestmentsCSV(r.result as string);
      if (!holdings.length) setMsg('No holdings found in that CSV. Make sure it’s a Trading 212 (or similar) export.');
      else { const n = importInvestments(holdings); setMsg(`Imported ${n} holdings. Tap Refresh to pull live prices.`); }
      setTimeout(() => setMsg(''), 6000);
    };
    r.readAsText(f);
    e.target.value = '';
  }

  // Portfolio value / P&L now live in <PortfolioCard/>; here we keep allocation + history.
  const alloc = useMemo(() => investmentAllocation(investments, fx), [investments, fx]);
  const history = useMemo(() => investmentHistory(investments, fx), [investments, fx]);
  const allocTotal = alloc.reduce((a, b) => a + b.value, 0);

  const hasLive = investments.some((i) => LIVE_KINDS.has(i.kind) && i.ticker);
  const needsKey = investments.some((i) => (i.kind === 'Stock' || i.kind === 'ETF') && i.ticker) && !settings.finnhubKey;

  const doRefresh = () => { try { localStorage.setItem('ff-prices-ts', String(Date.now())); } catch { /* */ } refreshPrices(); };

  // Auto-refresh live prices on open, at most once per hour (cached via localStorage)
  // so opening the page feels current without hammering the free APIs.
  useEffect(() => {
    if (!hasLive) return;
    try {
      const last = Number(localStorage.getItem('ff-prices-ts') || 0);
      if (Date.now() - last > 60 * 60 * 1000) doRefresh();
    } catch { /* ignore */ }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Page>
      <PageHeader title="Investments" subtitle="Portfolio value, allocation and live performance"
        action={<div className="flex gap-2">
          {hasLive && <Button variant="ghost" onClick={doRefresh} disabled={pricesState === 'loading'}>
            <RefreshCw size={16} className={pricesState === 'loading' ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
          </Button>}
          <Button variant="ghost" onClick={() => csvRef.current?.click()}><Upload size={16} /><span className="hidden sm:inline">Import</span></Button>
          <Button aria-label="Add holding" onClick={() => setOpen(true)}><Plus size={16} /> Add</Button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={onCSV} />
        </div>} />

      {msg && <Callout tone="yellow" icon={<Upload size={16} />} className="mb-4">{msg}</Callout>}

      {/* Hero portfolio card (terminal/mono style) */}
      <PortfolioCard />

      {needsKey && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-2"><KeyRound size={16} className="text-accent" /><span className="text-sm font-medium">Live stock & ETF prices</span></div>
          <p className="text-xs text-ink-muted mb-3">Add a free <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" className="font-medium text-accent-ink hover:underline underline-offset-2">Finnhub</a> API key to pull live stock/ETF quotes. Crypto is already live (free, no key).</p>
          <div className="flex gap-2">
            <Input type={showKey ? 'text' : 'password'} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Finnhub API key" className="flex-1" />
            <Button variant="ghost" onClick={() => setShowKey((v) => !v)}>{showKey ? 'Hide' : 'Show'}</Button>
            <Button disabled={!keyInput.trim()} onClick={() => { updateSettings({ finnhubKey: keyInput.trim() }); doRefresh(); }}>Save & refresh</Button>
          </div>
        </Card>
      )}

      <MarketWatch />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5">
          <SectionCardHeader title="Allocation" hint="By asset type" />
          <DonutChart data={alloc} height={200} />
          <div className="mt-3"><LegendList data={alloc} total={allocTotal} currency={cur} /></div>
        </Card>
        <Card className="p-5 lg:col-span-2 flex flex-col">
          <SectionCardHeader title="Portfolio value" hint="Last 12 months" />
          <div className="flex-1 min-h-[200px]"><InvestHistory data={history} /></div>
        </Card>
      </div>

      {investments.length === 0 ? (
        <Card><EmptyState icon="LineChart" title="No holdings yet" subtitle="Add stocks, ETFs, crypto, savings or pensions — then tap Refresh for live prices."
          action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Add holding</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-5 pt-5"><SectionCardHeader title="Holdings" hint={hasLive ? 'Prices update on Refresh · crypto free, stocks via Finnhub' : undefined} /></div>
          <div className="divide-y divide-line border-t border-line">
            {investments.map((inv, i) => {
              const gain = inv.currentValue - inv.costBasis;
              const gp = inv.costBasis > 0 ? (gain / inv.costBasis) * 100 : 0;
              const ic = inv.currency ?? cur;
              const price = inv.units > 0 ? inv.currentValue / inv.units : inv.currentValue;
              const q = quotes[inv.id];
              const share = allocTotal > 0 ? (toBase(inv.currentValue, inv.currency, fx) / allocTotal) * 100 : 0;
              const spark = (inv.history ?? []).map((p) => p.value);
              return (
                <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-hover group">
                  <div className="w-9 h-9 rounded-control bg-tag-yellow-bg text-tag-yellow-fg flex items-center justify-center font-semibold text-2xs shrink-0">
                    {(inv.ticker ?? inv.name.slice(0, 3)).toUpperCase().slice(0, 4)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium truncate">{inv.name}</span><Badge tone={KIND_TONE[inv.kind] ?? 'gray'}>{inv.kind}</Badge></div>
                    <div className="text-xs text-ink-muted tabular-nums">{inv.units} @ {formatMoney(price, ic)}{q ? <span className={cx('ml-1.5', q.changePct >= 0 ? 'text-income' : 'text-expense')}>{q.changePct >= 0 ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%</span> : null}</div>
                  </div>
                  <Sparkline points={spark} up={gain >= 0} />
                  <div className="text-right shrink-0 w-28">
                    <div className="metric-value font-semibold">{formatMoney(inv.currentValue, ic)}</div>
                    <div className={cx('text-xs metric-value', gain >= 0 ? 'text-income' : 'text-expense')}>{gain >= 0 ? '+' : ''}{gp.toFixed(1)}% · {share.toFixed(0)}%</div>
                  </div>
                  <div className="flex items-center can-hover:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <IconButton size="sm" onClick={() => setEditInv(inv)} aria-label="Edit holding"><Pencil size={15} /></IconButton>
                    <IconButton size="sm" onClick={() => deleteInvestment(inv.id)} aria-label="Delete holding" className="hover:!text-expense"><Trash2 size={15} /></IconButton>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}

      <InvestmentModal open={open || !!editInv} existing={editInv ?? undefined}
        onClose={() => { setOpen(false); setEditInv(null); }}
        onSave={(inv) => { if (editInv) updateInvestment(editInv.id, inv); else addInvestment(inv); setOpen(false); setEditInv(null); }} />
    </Page>
  );
}

const CURRENCIES: CurrencyCode[] = ['RON', 'EUR', 'USD', 'GBP'];
function InvestmentModal({ open, onClose, onSave, existing }: { open: boolean; onClose: () => void; onSave: (i: Omit<Investment, 'id'>) => void; existing?: Investment }) {
  const base = useStore((s) => s.settings.currency);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [kind, setKind] = useState<InvestmentKind>('Stock');
  const [currency, setCurrency] = useState<CurrencyCode>(base);
  const [units, setUnits] = useState('');
  const [cost, setCost] = useState('');
  const [value, setValue] = useState('');
  useEffect(() => {
    if (existing) {
      setName(existing.name); setTicker(existing.ticker ?? ''); setKind(existing.kind);
      setCurrency((existing.currency ?? base) as CurrencyCode); setUnits(String(existing.units));
      setCost(String(existing.costBasis)); setValue(String(existing.currentValue));
    } else { setName(''); setTicker(''); setKind('Stock'); setCurrency(base); setUnits(''); setCost(''); setValue(''); }
  }, [existing, open, base]);
  const live = LIVE_KINDS.has(kind);
  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit holding' : 'Add holding'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple Inc." /></div>
          <div><Label>Ticker {live ? '(for live price)' : '(optional)'}</Label><Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder={kind === 'Crypto' ? 'BTC' : 'AAPL'} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Type</Label><Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as InvestmentKind)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</Select></div>
          <div><Label>Currency</Label><Select aria-label="Holding currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Units</Label><Input type="number" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" /></div>
          <div><Label>Invested</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" /></div>
          <div><Label>Current value</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" /></div>
        </div>
        {live && <p className="text-2xs text-ink-muted">With a ticker set, tap Refresh on the Investments page to update the value from the live price × units.</p>}
        <Button className="w-full" disabled={!name || !value} onClick={() => onSave({
          name, ticker: ticker || undefined, kind, currency, units: Number(units) || 1,
          costBasis: Number(cost) || 0, currentValue: Number(value) || 0,
          history: existing?.history ?? [{ date: localDateKey(), value: Number(value) || 0 }],
        })}>{existing ? 'Save changes' : 'Add holding'}</Button>
      </div>
    </Modal>
  );
}
