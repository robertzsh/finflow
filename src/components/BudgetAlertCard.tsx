import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiggyBank, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { Callout } from '@/components/ui/Callout';
import { ProgressBar } from '@/components/ui/Progress';
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
          <PiggyBank size={18} className="text-accent" />
          <h3 className="section-title">Budgets</h3>
        </div>
        <button onClick={() => nav('/budgets')} className="text-xs font-medium text-accent-ink hover:underline underline-offset-2">Manage</button>
      </div>

      {over.length > 0 && (
        <Callout tone="red" icon={<AlertTriangle size={15} />} className="mb-3">
          <span className="text-expense">{over.length} {over.length === 1 ? 'budget is' : 'budgets are'} over the limit this month.</span>
        </Callout>
      )}

      <div className="space-y-2.5">
        {progress.slice(0, 6).map((p) => {
          const pct = Math.min(100, p.pct);
          const isOver = p.spent > p.budget.amount;
          const near = !isOver && p.pct >= 80;
          const bar = isOver ? 'rgb(var(--expense))' : near ? 'rgb(var(--warn))' : 'rgb(var(--income))';
          return (
            <div key={p.budget.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="truncate">{p.category?.emoji ? `${p.category.emoji} ` : ''}{p.category?.name ?? 'Category'}</span>
                <span className={`tabular-nums text-xs ${isOver ? 'text-expense font-medium' : 'text-ink-muted'}`}>
                  {formatMoney(p.spent, cur)} / {formatMoney(p.budget.amount, cur)}
                </span>
              </div>
              <ProgressBar value={pct} color={bar} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
