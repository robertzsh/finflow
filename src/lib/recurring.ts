import { addWeeks, addMonths, addQuarters, addYears, parseISO, isAfter, format } from 'date-fns';
import type { Transaction, RecurringFrequency } from '@/types';

export function nextDate(from: Date, freq: RecurringFrequency): Date {
  switch (freq) {
    case 'weekly': return addWeeks(from, 1);
    case 'monthly': return addMonths(from, 1);
    case 'quarterly': return addQuarters(from, 1);
    case 'yearly': return addYears(from, 1);
  }
}

export interface Upcoming {
  base: Transaction;
  date: string;
  amount: number;
}

/** Project the next N occurrences of every recurring transaction after `today`. */
export function upcomingOccurrences(txs: Transaction[], horizonDays = 45, today = new Date('2026-07-28')): Upcoming[] {
  const out: Upcoming[] = [];
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + horizonDays);

  const recur = txs.filter((t) => t.recurring && t.frequency);
  // dedupe by merchant+category to avoid multiple historical copies
  const seen = new Map<string, Transaction>();
  for (const t of recur) {
    const k = `${t.merchant}|${t.categoryId}|${t.frequency}`;
    const prev = seen.get(k);
    if (!prev || parseISO(t.date) > parseISO(prev.date)) seen.set(k, t);
  }

  for (const t of seen.values()) {
    let d = parseISO(t.date);
    // advance to first future date
    let guard = 0;
    while (!isAfter(d, today) && guard < 400) { d = nextDate(d, t.frequency!); guard++; }
    while (d <= horizon && guard < 400) {
      out.push({ base: t, date: format(d, 'yyyy-MM-dd'), amount: t.amount });
      d = nextDate(d, t.frequency!);
      guard++;
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
