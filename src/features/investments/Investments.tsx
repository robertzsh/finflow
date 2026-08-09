import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader, SectionCardHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DonutChart, InvestHistory, LegendList } from '@/components/charts/ChartKit';
import { investmentTotals, investmentAllocation, investmentHistory } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import type { Investment, InvestmentKind } from '@/types';

const KINDS: InvestmentKind[] = ['Stock', 'ETF', 'Crypto', 'Savings', 'Pension'];

export default function Investments() {
  const { investments, settings, addInvestment, deleteInvestment } = useStore();
  const cur = settings.currency;
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => investmentTotals(investments), [investments]);
  const alloc = useMemo(() => investmentAllocation(investments), [investments]);
  const history = useMemo(() => investmentHistory(investments), [investments]);
  const allocTotal = alloc.reduce((a, b) => a + b.value, 0);

  return (
    <Page>
      <PageHeader title="Investments" subtitle="Portfolio value, allocation and performance"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Add holding</Button>} />

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-white/50">Portfolio value</p><p className="text-2xl font-bold mt-2">{formatMoney(totals.value, cur)}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-white/50">Total invested</p><p className="text-2xl font-bold mt-2">{formatMoney(totals.cost, cur)}</p></Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-white/50">Total gain / loss</p>
          <p className={`text-2xl font-bold mt-2 flex items-center gap-2 ${totals.gain >= 0 ? 'text-income' : 'text-expense'}`}>
            {totals.gain >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            {formatMoney(totals.gain, cur, { sign: true })}
            <span className="text-sm">({totals.gainPct >= 0 ? '+' : ''}{totals.gainPct.toFixed(1)}%)</span>
          </p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5">
          <SectionCardHeader title="Allocation" hint="By asset type" />
          <DonutChart data={alloc} height={200} />
          <div className="mt-3"><LegendList data={alloc} total={allocTotal} currency={cur} /></div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <SectionCardHeader title="Historical value" hint="Total portfolio, last 12 months" />
          <InvestHistory data={history} />
        </Card>
      </div>

      {investments.length === 0 ? (
        <Card><EmptyState icon="LineChart" title="No holdings yet" subtitle="Add stocks, ETFs, crypto, savings or pensions."
          action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Add holding</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <SectionCardHeader title="Holdings" />
          <div className="divide-y divide-white/5 -mx-5 -mb-5">
            {investments.map((inv, i) => {
              const gain = inv.currentValue - inv.costBasis;
              const gp = inv.costBasis > 0 ? (gain / inv.costBasis) * 100 : 0;
              return (
                <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03]">
                  <div className="w-9 h-9 rounded-xl bg-invest/15 border border-invest/20 flex items-center justify-center text-invest font-bold text-xs">
                    {inv.ticker ?? inv.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium truncate">{inv.name}</span><Badge color="#eab308">{inv.kind}</Badge></div>
                    <div className="text-xs text-white/40">{inv.units} units · {formatMoney(inv.costBasis, cur)} invested</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{formatMoney(inv.currentValue, cur)}</div>
                    <div className={`text-xs ${gain >= 0 ? 'text-income' : 'text-expense'}`}>{gain >= 0 ? '+' : ''}{formatMoney(gain, cur)} ({gp >= 0 ? '+' : ''}{gp.toFixed(1)}%)</div>
                  </div>
                  <button onClick={() => deleteInvestment(inv.id)} className="text-white/25 hover:text-expense p-1"><Trash2 size={15} /></button>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}

      <AddInvestmentModal open={open} onClose={() => setOpen(false)}
        onSave={(inv) => { addInvestment(inv); setOpen(false); }} />
    </Page>
  );
}

function AddInvestmentModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (i: Omit<Investment, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [kind, setKind] = useState<InvestmentKind>('Stock');
  const [units, setUnits] = useState('');
  const [cost, setCost] = useState('');
  const [value, setValue] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Add holding">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple Inc." /></div>
          <div><Label>Ticker (optional)</Label><Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" /></div>
        </div>
        <div><Label>Type</Label><Select value={kind} onChange={(e) => setKind(e.target.value as InvestmentKind)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</Select></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Units</Label><Input type="number" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" /></div>
          <div><Label>Invested</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" /></div>
          <div><Label>Current value</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" /></div>
        </div>
        <Button className="w-full" disabled={!name || !value} onClick={() => onSave({
          name, ticker: ticker || undefined, kind, units: Number(units) || 1,
          costBasis: Number(cost) || 0, currentValue: Number(value) || 0,
          history: [{ date: '2026-07-01', value: Number(value) || 0 }],
        })}>Add holding</Button>
      </div>
    </Modal>
  );
}
