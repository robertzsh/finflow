import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiggyBank, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { budgetProgress } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { format } from 'date-fns';

/** Dashboard budget summary: progress per category, over-budget in red. Fires a
 *  one-per-month local OS notification for each newly-exceeded budget (only if the
 *  user already granted notification permission — never prompts). */
export function BudgetAlertCard() {
  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const cur = useStore((s) => s.settings.currency);
  const nav = useNavigate();

  const progress = budgetProgress(budgets, transactions, categories, new Date());

  // Local notification for newly-exceeded budgets (idempotent per category per month).
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const monthK = format(new Date(), 'yyyy-MM');
    for (const p of progress) {
      if (p.spent <= p.budget.amount) continue;
      const key = `ff_budget_alert_${p.budget.categoryId}_${monthK}`;
      try {
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, '1');
        new Notification('Budget exceeded', {
          body: `${p.category?.name ?? 'A category'} is over budget: ${formatMoney(p.spent, cur)} of ${formatMoney(p.budget.amount, cur)}.`,
          icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
        });
      } catch { /* ignore storage/notification errors */ }
    }
  }, [progress, cur]);

  if (progress.length === 0) return null;
  const over = progress.filter((p) => p.spent > p.budget.amount);

  return (
    <Card className="p-5 mt-4" delay={0.1}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PiggyBank size={18} className="text-emerald-300" />
          <h3 className="font-bold">Budgets</h3>
        </div>
        <button onClick={() => nav('/budgets')} className="text-xs text-blue-400 hover:underline">Manage</button>
      </div>

      {over.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-expense/15 border border-expense/30 text-expense px-3 py-2 text-sm mb-3">
          <AlertTriangle size={15} /> {over.length} {over.length === 1 ? 'budget is' : 'budgets are'} over the limit this month.
        </div>
      )}

      <div className="space-y-2.5">
        {progress.slice(0, 6).map((p) => {
          const pct = Math.min(100, p.pct);
          const isOver = p.spent > p.budget.amount;
          const near = !isOver && p.pct >= 80;
          const bar = isOver ? '#f43f5e' : near ? '#eab308' : '#10b981';
          return (
            <div key={p.budget.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="truncate">{p.category?.emoji ? `${p.category.emoji} ` : ''}{p.category?.name ?? 'Category'}</span>
                <span className={`tabular-nums text-xs ${isOver ? 'text-expense font-medium' : 'text-white/50'}`}>
                  {formatMoney(p.spent, cur)} / {formatMoney(p.budget.amount, cur)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: bar }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
