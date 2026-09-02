import { format, parseISO, startOfMonth, subMonths, isSameMonth, differenceInCalendarDays } from 'date-fns';
import type { Transaction, Category, Budget, Investment, Goal, CurrencyCode, FxRates } from '@/types';

const NO_FX: FxRates = { RON: 1, EUR: 5.0, USD: 4.6, GBP: 5.9 };

/** Convert an amount in `currency` into the base currency (lei) using fx rates. */
export function toBase(amount: number, currency: CurrencyCode | undefined, rates?: FxRates) {
  const r = rates ?? NO_FX;
  return amount * (r[currency ?? 'RON'] ?? 1);
}

/** The base-currency value of a transaction/bill *right now*: if it was entered in a
 *  foreign currency, re-convert its original amount at the given rates; else its stored amount. */
export function liveAmount(t: { origCurrency?: CurrencyCode; origAmount?: number; amount: number }, rates?: FxRates): number {
  if (t.origCurrency && t.origAmount != null) return Math.round(toBase(t.origAmount, t.origCurrency, rates) * 100) / 100;
  return t.amount;
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
      return { id, name: c?.name ?? 'Other', color: c?.color ?? '#94a3b8', emoji: c?.emoji, value: r2(value), pct: total > 0 ? (value / total) * 100 : 0 };
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
      return { id, name: c?.name ?? 'Other', value: r2(value), color: c?.color ?? '#94a3b8' };
    })
    .sort((a, b) => b.value - a.value);
}

/** Which people spent in each (rolled-up) category this month. Values are member ids or 'all'. */
export function categoryPayers(txs: Transaction[], cats: Category[], ref: Date) {
  const m = txInMonth(txs, ref).filter((t) => t.type === 'expense');
  const map = new Map<string, Set<string>>();
  for (const t of m) {
    const c = cats.find((x) => x.id === t.categoryId);
    const key = c?.parent ?? t.categoryId;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(t.createdBy ?? 'all');
  }
  return map;
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
      return { id, name: c?.name ?? 'Other', value: r2(value), color: c?.color ?? '#94a3b8', emoji: c?.emoji, pct: total > 0 ? (value / total) * 100 : 0 };
    }).sort((a, b) => b.value - a.value),
  };
}

export function incomeBySource(txs: Transaction[], cats: Category[], ref: Date) {
  const m = txInMonth(txs, ref).filter((t) => t.type === 'income');
  const map = new Map<string, number>();
  for (const t of m) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  return [...map.entries()].map(([id, value]) => {
    const c = cats.find((x) => x.id === id);
    return { id, name: c?.name ?? 'Other', value: r2(value), color: c?.color ?? '#10b981' };
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
    const catTx = m.filter((t) => t.categoryId === b.categoryId || childIds.has(t.categoryId));
    const spent = catTx.reduce((a, t) => a + t.amount, 0);
    // Recurring bills (e.g. Gym) are charged once a month — they must NOT be scaled by
    // the daily run-rate. Only extrapolate the *variable* spend across the month.
    const recurringSpent = catTx.filter((t) => t.recurring).reduce((a, t) => a + t.amount, 0);
    const variableSpent = spent - recurringSpent;
    const projectedVariable = elapsed > 0 ? (variableSpent / elapsed) * daysInMonth : variableSpent;
    const projected = Math.max(spent, recurringSpent + projectedVariable);
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
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

/** Total investment value as of the END of month `ref`: each holding's latest
 *  history point dated on/before that month (converted to base). */
export function investmentValueAsOf(inv: Investment[], ref: Date, rates?: FxRates): number {
  const cutoff = format(new Date(ref.getFullYear(), ref.getMonth() + 1, 0), 'yyyy-MM-dd'); // last day of month
  let total = 0;
  for (const i of inv) {
    const pts = [...(i.history ?? [])].filter((p) => p.date <= cutoff).sort((a, b) => (a.date < b.date ? -1 : 1));
    const v = pts.length ? pts[pts.length - 1].value : i.currentValue;
    total += toBase(v, i.currency, rates);
  }
  return total;
}

/** Net worth per month = running account balance + investment value that month. */
export function netWorthSeries(txs: Transaction[], inv: Investment[], months = 12, opening = 0, rates?: FxRates) {
  const now = new Date();
  const out: { month: string; value: number; cash: number; invest: number }[] = [];
  let running = opening;
  for (let m = months - 1; m >= 0; m--) {
    const ref = startOfMonth(subMonths(now, m));
    running += monthStats(txs, ref).net;
    const invest = investmentValueAsOf(inv, ref, rates);
    out.push({ month: format(ref, 'MMM'), value: r2(running + invest), cash: r2(running), invest: r2(invest) });
  }
  return out;
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

// ---------------------------------------------------------------------------
// Settle-up: for a two-person household where costs are shared 50/50, figure out
// who fronted more this month and how much the other owes to even it out.
// Each expense is "paid" by whoever logged it (createdBy); 'all'/unattributed is
// treated as fronted half-and-half. Fair share = total household expense / 2.
// ---------------------------------------------------------------------------
export interface SettleUp {
  total: number;
  fairShare: number;
  paid: Record<string, number>;
  net: Record<string, number>;            // paid − fairShare (positive = is owed)
  owe: { fromId: string; toId: string; amount: number } | null;
}
export function settleUp(txs: Transaction[], ref: Date, memberIds: string[]): SettleUp | null {
  if (memberIds.length !== 2) return null;  // only meaningful for a two-person split
  const [a, b] = memberIds;
  const m = txInMonth(txs, ref).filter((t) => t.type === 'expense');
  const paid: Record<string, number> = { [a]: 0, [b]: 0 };
  let total = 0;
  for (const t of m) {
    total += t.amount;
    if (t.createdBy && memberIds.includes(t.createdBy)) paid[t.createdBy] += t.amount;
    else { paid[a] += t.amount / 2; paid[b] += t.amount / 2; } // shared/unattributed → both fronted half
  }
  const fairShare = total / 2;
  const net: Record<string, number> = { [a]: r2(paid[a] - fairShare), [b]: r2(paid[b] - fairShare) };
  let owe: SettleUp['owe'] = null;
  const diff = r2(Math.abs(net[a]));
  if (diff >= 0.01) {
    owe = net[a] < 0 ? { fromId: a, toId: b, amount: diff } : { fromId: b, toId: a, amount: diff };
  }
  return { total: r2(total), fairShare: r2(fairShare), paid: { [a]: r2(paid[a]), [b]: r2(paid[b]) }, net, owe };
}

export function scoreLabel(score: number) {
  if (score >= 80) return { label: 'Excellent', color: '#10b981' };
  if (score >= 65) return { label: 'Good', color: '#3b82f6' };
  if (score >= 50) return { label: 'Fair', color: '#eab308' };
  return { label: 'Needs work', color: '#ef4444' };
}

// ---------------------------------------------------------------------------
// Recurring commitments — normalised to a monthly figure, per household + person.
// Distinct commitments are keyed by merchant + category + frequency (latest wins),
// so re-logging the same subscription each month doesn't double-count it.
// ---------------------------------------------------------------------------
export interface RecurringItem { id: string; merchant: string; categoryId: string; frequency: string; monthly: number; by?: string }
// A line as it appears under one person: their full own bills + half of each shared bill.
export interface RecurringMemberItem { id: string; merchant: string; categoryId: string; frequency: string; monthly: number; shared: boolean }
export interface RecurringSummary {
  items: RecurringItem[];
  householdMonthly: number;
  perMember: Map<string, number>;
  perMemberItems: Map<string, RecurringMemberItem[]>;
}

function perMonth(amount: number, frequency?: string): number {
  switch (frequency) {
    case 'weekly': return amount * (52 / 12);
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
    default: return amount; // monthly
  }
}

// Categories that are recurring by their nature (subscriptions + phone/internet),
// so their transactions count as monthly bills even if "Recurring" wasn't ticked.
function subscriptionLikeIds(categories: Category[]): Set<string> {
  const ids = new Set<string>(['subscriptions', 'digi']);
  for (const c of categories) if (c.parent === 'subscriptions') ids.add(c.id);
  return ids;
}

export function recurringSummary(txs: Transaction[], memberIds: string[], categories: Category[] = [], rates?: FxRates): RecurringSummary {
  const subLike = subscriptionLikeIds(categories);
  const map = new Map<string, Transaction>();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    // Count a transaction as a bill if it's flagged Recurring, OR it's in a
    // subscription-type category (Spotify/Netflix/Claude Pro/Crunchyroll/Digi…).
    if (!t.recurring && !subLike.has(t.categoryId)) continue;
    // Key by payer too, so each person's own Gym/Spotify/etc. is tracked separately
    // (otherwise two people with the same monthly bill collapse into one).
    const key = `${t.createdBy ?? 'all'}|${t.merchant}|${t.categoryId}|${t.frequency ?? 'monthly'}`;
    const prev = map.get(key);
    if (!prev || t.date > prev.date) map.set(key, t);
  }
  const items: RecurringItem[] = [...map.values()]
    .map((t) => ({ id: t.id, merchant: t.merchant, categoryId: t.categoryId, frequency: t.frequency ?? 'monthly', monthly: r2(perMonth(liveAmount(t, rates), t.frequency)), by: t.createdBy }))
    .sort((a, b) => b.monthly - a.monthly);

  const perMember = new Map<string, number>();
  const perMemberItems = new Map<string, RecurringMemberItem[]>();
  for (const id of memberIds) { perMember.set(id, 0); perMemberItems.set(id, []); }
  const n = Math.max(1, memberIds.length);
  for (const it of items) {
    const isShared = it.by === 'all' || !it.by || !memberIds.includes(it.by);
    if (isShared) {
      // shared bill: each member carries an equal split (e.g. rent 2200 → 1100 each)
      const share = r2(it.monthly / n);
      for (const id of memberIds) {
        perMember.set(id, r2((perMember.get(id) ?? 0) + share));
        perMemberItems.get(id)!.push({ id: `${it.id}:${id}`, merchant: it.merchant, categoryId: it.categoryId, frequency: it.frequency, monthly: share, shared: true });
      }
    } else {
      const by = it.by as string;
      perMember.set(by, r2((perMember.get(by) ?? 0) + it.monthly));
      perMemberItems.get(by)!.push({ id: it.id, merchant: it.merchant, categoryId: it.categoryId, frequency: it.frequency, monthly: it.monthly, shared: false });
    }
  }
  for (const id of memberIds) perMemberItems.get(id)!.sort((a, b) => b.monthly - a.monthly);
  return { items, householdMonthly: r2(items.reduce((a, i) => a + i.monthly, 0)), perMember, perMemberItems };
}
