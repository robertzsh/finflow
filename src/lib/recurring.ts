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
export function upcomingOccurrences(txs: Transaction[], horizonDays = 45, today = new Date()): Upcoming[] {
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

// ---------------------------------------------------------------------------
// Auto-posting: turn recurring templates into real transactions once their date
// passes (with backfill for months missed), so they count in stats & balance.
// ---------------------------------------------------------------------------

/** The period a date belongs to, used to detect "already logged this occurrence".
 *  Weekly bills collide by exact day; monthly/quarterly/yearly collide by calendar month. */
export function periodKey(date: string, freq: RecurringFrequency): string {
  return freq === 'weekly' ? date : date.slice(0, 7); // yyyy-mm-dd | yyyy-mm
}

export function recurrenceKeyFor(t: Pick<Transaction, 'merchant' | 'categoryId' | 'frequency'>, occurrenceDate: string): string {
  return `${t.merchant}|${t.categoryId}|${t.frequency}|${occurrenceDate}`;
}

export interface DueOccurrence {
  base: Transaction;      // the template it came from
  date: string;           // occurrence date (yyyy-mm-dd), already due (<= today)
  amount: number;         // template amount (default; editable for variable bills)
  variable: boolean;      // needs the user to confirm the amount before posting
  recurrenceKey: string;
}

/** Recurring occurrences whose date is on/before `today` that haven't been posted yet.
 *  Idempotent: skips an occurrence if any transaction already exists in the same period
 *  for that merchant+category (covers both prior auto-posts and manual entries), or if
 *  its recurrenceKey was explicitly skipped. */
export function dueOccurrences(txs: Transaction[], today = new Date(), skipped: string[] = []): DueOccurrence[] {
  const skipSet = new Set(skipped);
  const templates = txs.filter((t) => t.recurring && t.frequency);
  // latest template per merchant|category|frequency
  const seen = new Map<string, Transaction>();
  for (const t of templates) {
    const k = `${t.merchant}|${t.categoryId}|${t.frequency}`;
    const prev = seen.get(k);
    if (!prev || parseISO(t.date) > parseISO(prev.date)) seen.set(k, t);
  }

  // index existing transactions by merchant|category → set of period keys already present
  const present = new Map<string, Set<string>>();
  for (const t of txs) {
    if (!t.frequency && !t.recurring) { /* still index one-offs so manual logs block a duplicate */ }
    const freq = (t.frequency ?? 'monthly') as RecurringFrequency;
    const mk = `${t.merchant}|${t.categoryId}`;
    if (!present.has(mk)) present.set(mk, new Set());
    present.get(mk)!.add(periodKey(t.date, freq));
  }

  const out: DueOccurrence[] = [];
  const todayStr = format(today, 'yyyy-MM-dd');
  for (const t of seen.values()) {
    const mk = `${t.merchant}|${t.categoryId}`;
    let d = nextDate(parseISO(t.date), t.frequency!); // first occurrence AFTER the template's own date
    let guard = 0;
    while (format(d, 'yyyy-MM-dd') <= todayStr && guard < 400) {
      const ds = format(d, 'yyyy-MM-dd');
      const pk = periodKey(ds, t.frequency!);
      const rk = recurrenceKeyFor(t, ds);
      const already = present.get(mk)?.has(pk);
      if (!already && !skipSet.has(rk)) {
        out.push({ base: t, date: ds, amount: t.amount, variable: !!t.variableAmount, recurrenceKey: rk });
        present.get(mk)!.add(pk); // don't emit two occurrences in the same period
      }
      d = nextDate(d, t.frequency!);
      guard++;
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
