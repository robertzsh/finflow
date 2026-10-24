import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertTriangle, TrendingUp, Pencil, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/aura/components/PageTransition';
import { PageHeader } from '@/aura/components/layout/PageHeader';
import { Card } from '@/aura/components/ui/Card';
import { Button, IconButton } from '@/aura/components/ui/Button';
import { Callout } from '@/aura/components/ui/Callout';
import { Badge } from '@/aura/components/ui/Badge';
import { staggered } from '@/aura/lib/motion';
import { Input, Select, Label } from '@/aura/components/ui/Field';
import { ProgressBar } from '@/aura/components/ui/Progress';
import { CategoryIcon } from '@/aura/components/ui/CategoryIcon';
import { Modal } from '@/aura/components/ui/Modal';
import { EmptyState } from '@/aura/components/ui/EmptyState';
import { budgetProgress } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { useToday } from '@/hooks/useToday';

export default function Budgets() {
  const { budgets, transactions, categories, settings, setBudget, removeBudget } = useStore();
  const REF = useToday();
  const cur = settings.currency;
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const progress = useMemo(() => budgetProgress(budgets, transactions, categories, REF), [budgets, transactions, categories, REF]);

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
      {/* The reference's "! monthly limit" callout */}
      <Callout className="mb-3" icon={<span className="block w-4 text-center text-lg font-bold leading-5 text-ink">!</span>}>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">Total budget:</span>
          <span className="metric-value font-display text-lg">{formatMoney(totalBudget, cur)}</span>
          <span className="text-ink-muted text-sm">· {formatMoney(totalSpent, cur)} spent · {overallPct.toFixed(0)}% used</span>
        </div>
        <div className="mt-2.5 max-w-xl"><ProgressBar value={overallPct} danger={overallPct > 100} /></div>
      </Callout>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 sm:p-5" delay={0.05}>
          <p className="metric-label">Remaining</p>
          <p className="metric-value font-display text-2xl font-semibold mt-2 text-income">{formatMoney(Math.max(0, totalBudget - totalSpent), cur)}</p>
          <p className="text-xs text-ink-muted mt-2">Across {progress.length} budgets</p>
        </Card>
        <Card className="p-4 sm:p-5" delay={0.1}>
          <p className="metric-label">Alerts</p>
          <div className="flex items-center gap-5 mt-2">
            <div><p className="metric-value font-display text-2xl font-semibold text-expense">{overCount}</p><p className="text-xs text-ink-muted">over budget</p></div>
            <div><p className="metric-value font-display text-2xl font-semibold text-invest">{warnCount}</p><p className="text-xs text-ink-muted">projected over</p></div>
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
              <motion.div key={p.budget.id} {...staggered(i)}>
                <Card hover className="p-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#94a3b8'} size={18} emoji={c?.emoji} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c?.name ?? p.budget.categoryId}</span>
                        {over && <Badge tone="red"><AlertTriangle size={12} /> Over</Badge>}
                        {!over && p.overspending && <Badge tone="yellow"><TrendingUp size={12} /> Trending over</Badge>}
                      </div>
                      <p className="text-xs text-ink-muted">{formatMoney(p.spent, cur)} of {formatMoney(p.budget.amount, cur)}</p>
                    </div>
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)} className="!w-24 !py-1.5" autoFocus />
                        <IconButton size="sm" aria-label="Save budget" onClick={() => { setBudget(p.budget.categoryId, Number(editVal) || 0); setEditId(null); }}
                          className="!bg-income/15 !text-income"><Check size={15} /></IconButton>
                      </div>
                    ) : (
                      <IconButton size="sm" aria-label="Edit budget" onClick={() => { setEditId(p.budget.id); setEditVal(String(p.budget.amount)); }}><Pencil size={15} /></IconButton>
                    )}
                  </div>
                  <div className="mt-3"><ProgressBar value={p.pct} color={c?.color} danger={over} /></div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className={over ? 'text-expense' : 'text-ink-muted'}>{p.pct.toFixed(0)}% used</span>
                    <span className={p.remaining < 0 ? 'text-expense' : 'text-income'}>
                      {p.remaining >= 0 ? `${formatMoney(p.remaining, cur)} left` : `${formatMoney(Math.abs(p.remaining), cur)} over`}
                    </span>
                  </div>
                  {p.overspending && (
                    <p className="text-2xs text-invest mt-2 flex items-center gap-1">
                      <TrendingUp size={11} /> Projected {formatMoney(p.projected, cur)} by month end
                    </p>
                  )}
                  <button onClick={() => removeBudget(p.budget.id)} className="text-2xs text-ink-muted hover:text-expense mt-2 transition-colors">Remove budget</button>
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
          <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
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
