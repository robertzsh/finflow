import { format, parseISO, startOfMonth, subMonths, isSameMonth, differenceInCalendarDays } from 'date-fns';
import type { Transaction, Category, Budget, Investment, Goal, CurrencyCode, FxRates } from '@/types';

const NO_FX: FxRates = { RON: 1, EUR: 5.0, USD: 4.6, GBP: 5.9 };

/** Convert an amount in `currency` into the base currency (lei) using fx rates. */
export function toBase(amount: number, currency: CurrencyCode | undefined, rates?: FxRates) {
  const r = rates ?? NO_FX;
  return amount * (r[currency ?? 'RON'] ?? 1);
}

export const monthKey = (d: Date | string) =>
  format(typeof d === 'string' ? parseISO(d) : d, 'yyyy-MM');

export const monthLabel = (d: Date | string) =>
  format(typeof d === 'string' ? parseISO(d) : d, 'MMM yyyy');

export function txInMonth(txs: Transaction[], ref: Date) {
  return txs.filter((t) => isSameMonth(parseISO(t.date), ref));
}

export function sumIncome(txs: Transaction[]) {
  return txs.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
}
export function sumExpense(txs: Transaction[]) {
  return txs.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
}

export interface MonthStats {
  income: number; expense: number; net: number; savingsRate: number;
}
export function monthStats(txs: Transaction[], ref: Date): MonthStats {
  const m = txInMonth(txs, ref);
  const income = sumIncome(m);
  const expense = sumExpense(m);
  const net = income - expense;
  return { income, expense, net, savingsRate: income > 0 ? (net / income) * 100 : 0 };
}

/** Per-member income & expense for a given month, keyed by the member id that logged it. */
export function memberSpending(txs: Transaction[], ref: Date) {
  const m = txInMonth(txs, ref);
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of m) {
    const k = t.createdBy ?? 'unknown';
    const e = map.get(k) ?? { income: 0, expense: 0 };
    if (t.type === 'income') e.income += t.amount; else e.expense += t.amount;
    map.set(k, e);
  }
  return map;
}

/** Per-member totals where shared ("all"/unknown) transactions are split equally. */
export const SHARED = 'all';
export function perMemberSpending(txs: Transaction[], ref: Date, memberIds: string[]) {
  const res = new Map<string, { income: number; expense: number }>(memberIds.map((id) => [id, { income: 0, expense: 0 }]));
  const n = memberIds.length || 1;
  for (const t of txInMonth(txs, ref)) {
    if (t.createdBy && res.has(t.createdBy)) {
      const e = res.get(t.createdBy)!;
      if (t.type === 'income') e.income += t.amount; else e.expense += t.amount;
    } else {
      // shared or unattributed → split equally between members
      const share = t.amount / n;
      for (const id of memberIds) {
        const e = res.get(id)!;
        if (t.type === 'income') e.income += share; else e.expense += share;
      }
    }
  }
  return res;
}

/** A member's expense breakdown by category this month (their own + split of shared), rolled up to parents. */
export function memberCategoryBreakdown(txs: Transaction[], ref: Date, memberId: string, memberIds: string[], cats: Category[]) {
  const m = txInMonth(txs, ref).filter((t) => t.type === 'expense');
  const n = memberIds.length || 1;
  const map = new Map<string, number>();
  for (const t of m) {
    let amt = 0;
    if (t.createdBy === memberId) amt = t.amount;
    else if (!t.createdBy || !memberIds.includes(t.createdBy)) amt = t.amount / n; // shared/unattributed → split
    else continue; // belongs to the other member
    const c = cats.find((x) => x.id === t.categoryId);
    const key = c?.parent ?? t.categoryId;
    map.set(key, (map.get(key) ?? 0) + amt);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return {
    total: r2(total),
    items: [...map.entries()].map(([id, value]) => {
      const c = cats.find((x) => x.id === id);
      return { id, name: c?.name ?? id, color: c?.color ?? '#94a3b8', emoji: c?.emoji, value: r2(value), pct: total > 0 ? (value / total) * 100 : 0 };
    }).sort((a, b) => b.value - a.value),
  };
}

/** Running account balance = opening balance + all net flows (income − expenses). */
export function accountBalance(txs: Transaction[], starting = 0) {
  return txs.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), starting);
}

export function cashFlowSeries(txs: Transaction[], months = 8, opening = 0) {
  const now = new Date();
  const out: { month: string; income: number; expense: number; net: number; balance: number }[] = [];
  let running = opening;
  // establish running balance up to the first shown month
  for (let m = months - 1; m >= 0; m--) {
    const ref = startOfMonth(subMonths(now, m));
    const s = monthStats(txs, ref);
    running += s.net;
    out.push({ month: format(ref, 'MMM'), income: r2(s.income), expense: r2(s.expense), net: r2(s.net), balance: r2(running) });
  }
  return out;
}

export function spendingByCategory(txs: Transaction[], cats: Category[], ref: Date) {
  const m = txInMonth(txs, ref).filter((t) => t.type === 'expense');
  const map = new Map<string, number>();
  for (const t of m) {
    const c = cats.find((x) => x.id === t.categoryId);
    const key = c?.parent ?? t.categoryId; // sub-categories roll up into their parent
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([id, value]) => {
      const c = cats.find((x) => x.id === id);
      return { id, name: c?.name ?? id, value: r2(value), color: c?.color ?? '#94a3b8' };
    })
    .sort((a, b) => b.value - a.value);
}

/** Breakdown of a parent category into the sub-categories (stores) actually used this month. */
export function subCategoryBreakdown(txs: Transaction[], cats: Category[], ref: Date, parentId: string) {
  const m = txInMonth(txs, ref).filter((t) => t.type === 'expense');
  const childIds = new Set(cats.filter((c) => c.parent === parentId).map((c) => c.id));
  const map = new Map<string, number>();
  for (const t of m) if (childIds.has(t.categoryId)) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return {
    total: r2(total),
    items: [...map.entries()].map(([id, value]) => {
      const c = cats.find((x) => x.id === id);
      return { id, name: c?.name ?? id, value: r2(value), color: c?.color ?? '#94a3b8', emoji: c?.emoji, pct: total > 0 ? (value / total) * 100 : 0 };
    }).sort((a, b) => b.value - a.value),
  };
}

export function incomeBySource(txs: Transaction[], cats: Category[], ref: Date) {
  const m = txInMonth(txs, ref).filter((t) => t.type === 'income');
  const map = new Map<string, number>();
  for (const t of m) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  return [...map.entries()].map(([id, value]) => {
    const c = cats.find((x) => x.id === id);
    return { id, name: c?.name ?? id, value: r2(value), color: c?.color ?? '#10b981' };
  }).sort((a, b) => b.value - a.value);
}

export function savingsTrend(txs: Transaction[], months = 8) {
  return cashFlowSeries(txs, months).map((r) => ({ month: r.month, savings: r.net > 0 ? r.net : 0, net: r.net }));
}

export interface BudgetProgress {
  budget: Budget; category?: Category; spent: number; pct: number; remaining: number;
  projected: number; overspending: boolean;
}
export function budgetProgress(budgets: Budget[], txs: Transaction[], cats: Category[], ref: Date): BudgetProgress[] {
  const m = txInMonth(txs, ref).filter((t) => t.type === 'expense');
  const dayOfMonth = differenceInCalendarDays(ref, startOfMonth(ref)) + 1;
  const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const elapsed = Math.max(dayOfMonth, 1);
  return budgets.map((b) => {
    const childIds = new Set(cats.filter((c) => c.parent === b.categoryId).map((c) => c.id));
    const spent = m.filter((t) => t.categoryId === b.categoryId || childIds.has(t.categoryId)).reduce((a, t) => a + t.amount, 0);
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const projected = (spent / elapsed) * daysInMonth;
    return {
      budget: b, category: cats.find((c) => c.id === b.categoryId),
      spent: r2(spent), pct, remaining: r2(b.amount - spent),
      projected: r2(projected), overspending: projected > b.amount * 1.02,
    };
  }).sort((a, b) => b.pct - a.pct);
}

export function investmentTotals(inv: Investment[], rates?: FxRates) {
  const value = inv.reduce((a, i) => a + toBase(i.currentValue, i.currency, rates), 0);
  const cost = inv.reduce((a, i) => a + toBase(i.costBasis, i.currency, rates), 0);
  const gain = value - cost;
  return { value: r2(value), cost: r2(cost), gain: r2(gain), gainPct: cost > 0 ? (gain / cost) * 100 : 0 };
}

export function investmentAllocation(inv: Investment[], rates?: FxRates) {
  const map = new Map<string, number>();
  for (const i of inv) map.set(i.kind, (map.get(i.kind) ?? 0) + toBase(i.currentValue, i.currency, rates));
  const palette: Record<string, string> = {
    Stock: '#eab308', ETF: '#f59e0b', Crypto: '#fbbf24', Savings: '#3b82f6', Pension: '#a855f7',
  };
  return [...map.entries()].map(([name, value]) => ({ name, value: r2(value), color: palette[name] ?? '#eab308' }));
}

export function investmentHistory(inv: Investment[], rates?: FxRates) {
  const byMonth = new Map<string, number>();
  for (const i of inv) for (const p of i.history) byMonth.set(p.date, (byMonth.get(p.date) ?? 0) + toBase(p.value, i.currency, rates));
  return [...byMonth.entries()].sort().map(([date, value]) => ({ month: format(parseISO(date), 'MMM'), value: r2(value) }));
}

export function goalETA(g: Goal): string {
  const remaining = g.target - g.saved;
  if (remaining <= 0) return 'Completed';
  if (g.monthlyContribution <= 0) return '—';
  const months = Math.ceil(remaining / g.monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return format(d, 'MMM yyyy');
}

/** Financial health score 0-100 from savings rate, budget adherence, emergency buffer, spending stability. */
export function healthScore(txs: Transaction[], budgets: Budget[], cats: Category[], goals: Goal[], balance: number, ref: Date) {
  const s = monthStats(txs, ref);
  // savings rate component (0-40)
  const sr = Math.max(0, Math.min(40, (s.savingsRate / 30) * 40));
  // budget adherence (0-25)
  const bp = budgetProgress(budgets, txs, cats, ref);
  const overCount = bp.filter((b) => b.spent > b.budget.amount).length;
  const adherence = bp.length ? Math.max(0, 25 - (overCount / bp.length) * 25) : 20;
  // emergency buffer: months of expenses covered (0-20)
  const buffer = s.expense > 0 ? Math.min(20, (balance / s.expense) * 6.6) : 15;
  // goals progress (0-15)
  const goalPct = goals.length ? goals.reduce((a, g) => a + Math.min(1, g.saved / g.target), 0) / goals.length : 0;
  const goalScore = goalPct * 15;
  const score = Math.round(sr + adherence + buffer + goalScore);
  return Math.max(0, Math.min(100, score));
}

export function r2(n: number) { return Math.round(n * 100) / 100; }

export function scoreLabel(score: number) {
  if (score >= 80) return { label: 'Excellent', color: '#10b981' };
  if (score >= 65) return { label: 'Good', color: '#3b82f6' };
  if (score >= 50) return { label: 'Fair', color: '#eab308' };
  return { label: 'Needs work', color: '#ef4444' };
}
