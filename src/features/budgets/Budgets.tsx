import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertTriangle, TrendingUp, Pencil, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/Progress';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { budgetProgress } from '@/lib/finance';
import { formatMoney } from '@/lib/format';

const REF = new Date('2026-07-28');

export default function Budgets() {
  const { budgets, transactions, categories, settings, setBudget, removeBudget } = useStore();
  const cur = settings.currency;
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const progress = useMemo(() => budgetProgress(budgets, transactions, categories, REF), [budgets, transactions, categories]);

  const totalBudget = progress.reduce((a, p) => a + p.budget.amount, 0);
  const totalSpent = progress.reduce((a, p) => a + p.spent, 0);
  const overCount = progress.filter((p) => p.spent > p.budget.amount).length;
  const warnCount = progress.filter((p) => p.overspending && p.spent <= p.budget.amount).length;
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const budgetedCatIds = new Set(budgets.map((b) => b.categoryId));
  const availableCats = categories.filter((c) => c.kind === 'expense' && !budgetedCatIds.has(c.id));

  return (
    <Page>
      <PageHeader title="Budgets" subtitle="Monthly spending limits by category"
        action={<Button onClick={() => setAddOpen(true)}><Plus size={16} /> New budget</Button>} />

      {/* Overview */}
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-5" delay={0}>
          <p className="text-xs uppercase tracking-wider text-white/50">Total budget</p>
          <p className="text-2xl font-bold mt-2">{formatMoney(totalBudget, cur)}</p>
          <div className="mt-3"><ProgressBar value={overallPct} color="#3b82f6" danger={overallPct > 100} /></div>
          <p className="text-xs text-white/40 mt-2">{formatMoney(totalSpent, cur)} spent · {overallPct.toFixed(0)}% used</p>
        </Card>
        <Card className="p-5" delay={0.05}>
          <p className="text-xs uppercase tracking-wider text-white/50">Remaining</p>
          <p className="text-2xl font-bold mt-2 text-income">{formatMoney(Math.max(0, totalBudget - totalSpent), cur)}</p>
          <p className="text-xs text-white/40 mt-3">Across {progress.length} budgets</p>
        </Card>
        <Card className="p-5" delay={0.1}>
          <p className="text-xs uppercase tracking-wider text-white/50">Alerts</p>
          <div className="flex items-center gap-4 mt-2">
            <div><p className="text-2xl font-bold text-expense">{overCount}</p><p className="text-xs text-white/40">over budget</p></div>
            <div><p className="text-2xl font-bold text-invest">{warnCount}</p><p className="text-xs text-white/40">projected over</p></div>
          </div>
        </Card>
      </div>

      {progress.length === 0 ? (
        <Card><EmptyState icon="Wallet" title="No budgets yet" subtitle="Set monthly limits to keep spending on track."
          action={<Button onClick={() => setAddOpen(true)}><Plus size={16} /> Create budget</Button>} /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {progress.map((p, i) => {
            const c = p.category;
            const over = p.spent > p.budget.amount;
            const editing = editId === p.budget.id;
            return (
              <motion.div key={p.budget.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card hover className="p-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#888'} size={20} emoji={c?.emoji} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c?.name ?? p.budget.categoryId}</span>
                        {over && <span className="text-expense flex items-center gap-1 text-xs"><AlertTriangle size={12} /> Over</span>}
                        {!over && p.overspending && <span className="text-invest flex items-center gap-1 text-xs"><TrendingUp size={12} /> Trending over</span>}
                      </div>
                      <p className="text-xs text-white/40">{formatMoney(p.spent, cur)} of {formatMoney(p.budget.amount, cur)}</p>
                    </div>
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)} className="!w-24 !py-1.5" autoFocus />
                        <button onClick={() => { setBudget(p.budget.categoryId, Number(editVal) || 0); setEditId(null); }}
                          className="rounded-lg bg-income/20 text-income p-1.5"><Check size={15} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditId(p.budget.id); setEditVal(String(p.budget.amount)); }}
                        className="text-white/30 hover:text-white p-1"><Pencil size={15} /></button>
                    )}
                  </div>
                  <div className="mt-3"><ProgressBar value={p.pct} color={c?.color ?? '#3b82f6'} danger={over} /></div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className={over ? 'text-expense' : 'text-white/50'}>{p.pct.toFixed(0)}% used</span>
                    <span className={p.remaining < 0 ? 'text-expense' : 'text-income'}>
                      {p.remaining >= 0 ? `${formatMoney(p.remaining, cur)} left` : `${formatMoney(Math.abs(p.remaining), cur)} over`}
                    </span>
                  </div>
                  {p.overspending && (
                    <p className="text-[11px] text-invest mt-2 flex items-center gap-1">
                      <TrendingUp size={11} /> Projected {formatMoney(p.projected, cur)} by month end
                    </p>
                  )}
                  <button onClick={() => removeBudget(p.budget.id)} className="text-[11px] text-white/30 hover:text-expense mt-2">Remove budget</button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <NewBudgetModal open={addOpen} onClose={() => setAddOpen(false)} cats={availableCats}
        onSave={(catId, amt) => { setBudget(catId, amt); setAddOpen(false); }} />
    </Page>
  );
}

function NewBudgetModal({ open, onClose, cats, onSave }: { open: boolean; onClose: () => void; cats: any[]; onSave: (c: string, a: number) => void }) {
  const [cat, setCat] = useState('');
  const [amt, setAmt] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="New budget">
      <div className="space-y-4">
        <div><Label>Category</Label>
          <Select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Select category…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div><Label>Monthly limit</Label><Input type="number" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} /></div>
        <Button className="w-full" disabled={!cat || !amt} onClick={() => onSave(cat, Number(amt))}>Create budget</Button>
      </div>
    </Modal>
  );
}
