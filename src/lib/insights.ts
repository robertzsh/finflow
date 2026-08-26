import { parseISO, startOfMonth, subMonths, differenceInCalendarDays } from 'date-fns';
import type { Transaction, Category } from '@/types';
import { txInMonth, monthStats, spendingByCategory, r2 } from './finance';

export interface Insight {
  id: string;
  title: string;
  detail: string;
  tone: 'income' | 'expense' | 'savings' | 'invest' | 'goal' | 'neutral';
  icon: string;
  value?: string;
}

export function buildInsights(txs: Transaction[], cats: Category[], ref: Date, balance: number): Insight[] {
  const out: Insight[] = [];
  const m = txInMonth(txs, ref);
  const stats = monthStats(txs, ref);
  const byCat = spendingByCategory(txs, cats, ref);
  const dayOfMonth = differenceInCalendarDays(ref, startOfMonth(ref)) + 1;
  const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(0, daysInMonth - dayOfMonth);
  const burn = dayOfMonth > 0 ? stats.expense / dayOfMonth : 0;

  // --- Savings estimates & advice for this month (lead with these) ---
  const projSpend = burn * daysInMonth;
  const projNet = stats.income - projSpend;
  const projRate = stats.income > 0 ? (projNet / stats.income) * 100 : 0;
  out.push({
    id: 'proj-savings', title: 'Projected savings this month', tone: projNet >= 0 ? 'savings' : 'expense', icon: 'PiggyBank', value: money(projNet),
    detail: daysLeft > 0
      ? `At your current pace you'll set aside about ${money(projNet)} — roughly ${projRate.toFixed(0)}% of income — by month-end.`
      : `You saved ${money(stats.net)} this month.`,
  });

  // advice to hit a 20% savings target
  const TARGET = 0.20;
  const roomLeft = stats.income * (1 - TARGET) - stats.expense;
  if (stats.income > 0) {
    if (roomLeft >= 0) {
      out.push({
        id: 'save-advice', title: 'On track for a 20% save', tone: 'income', icon: 'Sparkles', value: money(roomLeft),
        detail: daysLeft > 0
          ? `You can still spend ${money(roomLeft)} over the next ${daysLeft} day${daysLeft === 1 ? '' : 's'} and keep a 20% savings rate — about ${money(roomLeft / Math.max(1, daysLeft))}/day.`
          : 'You stayed within the 20% savings target this month — nicely done.',
      });
    } else {
      out.push({
        id: 'save-advice', title: 'A little over your savings target', tone: 'expense', icon: 'AlertTriangle', value: money(-roomLeft),
        detail: `You're ${money(-roomLeft)} past the line for a 20% save. Easing off ${byCat[0]?.name ?? 'your top category'} would bring it back.`,
      });
    }
  }

  // savings vs the same point last month
  const prevM = monthStats(txs, startOfMonth(subMonths(ref, 1)));
  if (prevM.income > 0 || prevM.net !== 0) {
    const diff = stats.net - prevM.net;
    out.push({
      id: 'save-vs-last', title: diff >= 0 ? 'Saving more than last month' : 'Behind last month', tone: diff >= 0 ? 'income' : 'expense', icon: diff >= 0 ? 'TrendingUp' : 'TrendingDown', value: `${diff >= 0 ? '+' : ''}${money(diff)}`,
      detail: diff >= 0 ? `You've set aside ${money(diff)} more than by this point last month. Keep it up ✨` : `You're ${money(-diff)} behind last month's pace — a small trim gets you back on track.`,
    });
  }

  // highest spending category
  if (byCat[0]) {
    out.push({ id: 'top-cat', title: 'Top spending category', detail: `${byCat[0].name} is your biggest expense this month.`, tone: 'expense', icon: 'Flame', value: byCat[0].name });
  }

  // savings rate so far
  out.push({ id: 'savings-rate', title: 'Savings rate so far', detail: stats.savingsRate >= 20 ? 'Great — you\'re saving a healthy share of income.' : 'Below the 20% target — small cuts add up.', tone: 'savings', icon: 'Percent', value: `${stats.savingsRate.toFixed(0)}%` });

  // projected month-end balance
  const projected = balance - burn * daysLeft;
  out.push({ id: 'projected', title: 'Projected month-end balance', detail: 'Extrapolated from your current spending rate.', tone: projected >= balance ? 'income' : 'expense', icon: 'Target', value: money(projected) });

  // subscription costs
  const subs = m.filter((t) => t.categoryId === 'subscriptions');
  const subTotal = subs.reduce((a, t) => a + t.amount, 0);
  if (subTotal > 0) out.push({ id: 'subs', title: 'Subscription costs', detail: `${subs.length} active subscriptions detected.`, tone: 'invest', icon: 'RefreshCw', value: money(subTotal) });

  // largest purchase
  const largest = [...m].filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];
  if (largest) out.push({ id: 'largest', title: 'Largest purchase', detail: `${largest.merchant} on ${largest.date}.`, tone: 'expense', icon: 'ShoppingBag', value: money(largest.amount) });

  // spending trend vs last month
  const prev = monthStats(txs, startOfMonth(subMonths(ref, 1)));
  if (prev.expense > 0) {
    const delta = ((stats.expense - prev.expense) / prev.expense) * 100;
    out.push({ id: 'trend', title: 'Spending trend', detail: delta >= 0 ? 'Spending up vs last month.' : 'Spending down vs last month — nice.', tone: delta >= 0 ? 'expense' : 'income', icon: delta >= 0 ? 'TrendingUp' : 'TrendingDown', value: `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%` });
  }

  // unusual expense detection (> 2.5x category average)
  const unusual = detectUnusual(txs, ref);
  if (unusual) out.push({ id: 'unusual', title: 'Unusual expense', detail: `${unusual.merchant} is ~${unusual.factor.toFixed(1)}x your typical ${unusual.cat} spend.`, tone: 'expense', icon: 'AlertTriangle', value: money(unusual.amount) });

  // monthly average expense (trailing)
  const trailing = averageMonthlyExpense(txs, 3);
  out.push({ id: 'avg-month', title: 'Monthly average spend', detail: 'Average over the last 3 months.', tone: 'neutral', icon: 'BarChart3', value: money(trailing) });

  return out;
}

function detectUnusual(txs: Transaction[], ref: Date) {
  const m = txInMonth(txs, ref).filter((t) => t.type === 'expense');
  const avgByCat = new Map<string, { sum: number; n: number }>();
  for (const t of txs.filter((x) => x.type === 'expense')) {
    const a = avgByCat.get(t.categoryId) ?? { sum: 0, n: 0 };
    a.sum += t.amount; a.n += 1; avgByCat.set(t.categoryId, a);
  }
  let best: { merchant: string; amount: number; factor: number; cat: string } | null = null;
  for (const t of m) {
    const a = avgByCat.get(t.categoryId);
    if (!a || a.n < 4) continue;
    const avg = a.sum / a.n;
    const factor = t.amount / avg;
    if (factor > 2.5 && (!best || factor > best.factor)) best = { merchant: t.merchant, amount: t.amount, factor, cat: t.categoryId };
  }
  return best;
}

function averageMonthlyExpense(txs: Transaction[], months: number) {
  const now = new Date();
  let total = 0;
  for (let i = 1; i <= months; i++) total += monthStats(txs, startOfMonth(subMonths(now, i))).expense;
  return r2(total / months);
}

let _cur = '£';
export function setInsightCurrency(sym: string) { _cur = sym; }
function money(n: number) { return `${_cur}${Math.round(n).toLocaleString('en-GB')}`; }
