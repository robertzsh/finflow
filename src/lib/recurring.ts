import { addWeeks, addMonths, addQuarters, addYears, parseISO, isAfter, format } from 'date-fns';
import type { Transaction, RecurringFrequency, Category } from '@/types';

export function nextDate(from: Date, freq: RecurringFrequency): Date {
  switch (freq) {
    case 'weekly': return addWeeks(from, 1);
    case 'monthly': return addMonths(from, 1);
    case 'quarterly': return addQuarters(from, 1);
    case 'yearly': return addYears(from, 1);
  }
}

// Subscription-type categories (Netflix/Spotify/Claude Pro/Crunchyroll + Digi) count
// as monthly bills even without the "Recurring" flag — so they project & post too.
function subscriptionLikeIds(categories: Category[]): Set<string> {
  const ids = new Set<string>(['subscriptions', 'digi']);
  for (const c of categories) if (c.parent === 'subscriptions') ids.add(c.id);
  return ids;
}

/** A transaction that should be treated as a recurring template, with its effective
 *  frequency (subscription categories default to monthly when no frequency is set). */
function recurringTemplates(txs: Transaction[], categories: Category[]): { t: Transaction; freq: RecurringFrequency }[] {
  const sub = subscriptionLikeIds(categories);
  const seen = new Map<string, { t: Transaction; freq: RecurringFrequency }>();
  for (const t of txs) {
    if (t.type !== 'expense' && !(t.recurring && t.frequency)) continue; // income can still be a flagged recurring
    const isRecur = (t.recurring && t.frequency) || sub.has(t.categoryId);
    if (!isRecur) continue;
    const freq = (t.frequency ?? 'monthly') as RecurringFrequency;
    const k = `${t.merchant}|${t.categoryId}|${freq}`;
    const prev = seen.get(k);
    if (!prev || parseISO(t.date) > parseISO(prev.t.date)) seen.set(k, { t, freq });
  }
  return [...seen.values()];
}

export interface Upcoming {
  base: Transaction;
  date: string;
  amount: number;
}

/** Project the next N occurrences of every recurring transaction after `today`.
 *  Pass `categories` so subscription-type expenses project even without the flag. */
export function upcomingOccurrences(txs: Transaction[], horizonDays = 45, today = new Date(), categories: Category[] = []): Upcoming[] {
  const out: Upcoming[] = [];
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + horizonDays);

  for (const { t, freq } of recurringTemplates(txs, categories)) {
    let d = parseISO(t.date);
    let guard = 0;
    while (!isAfter(d, today) && guard < 400) { d = nextDate(d, freq); guard++; }
    while (d <= horizon && guard < 400) {
      out.push({ base: t, date: format(d, 'yyyy-MM-dd'), amount: t.amount });
      d = nextDate(d, freq);
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
export function dueOccurrences(txs: Transaction[], today = new Date(), skipped: string[] = [], categories: Category[] = []): DueOccurrence[] {
  const skipSet = new Set(skipped);
  const templates = recurringTemplates(txs, categories); // includes subscription categories

  // index existing transactions by merchant|category → set of period keys already present
  const present = new Map<string, Set<string>>();
  for (const t of txs) {
    const freq = (t.frequency ?? 'monthly') as RecurringFrequency;
    const mk = `${t.merchant}|${t.categoryId}`;
    if (!present.has(mk)) present.set(mk, new Set());
    present.get(mk)!.add(periodKey(t.date, freq));
  }

  const out: DueOccurrence[] = [];
  const todayStr = format(today, 'yyyy-MM-dd');
  for (const { t, freq } of templates) {
    const mk = `${t.merchant}|${t.categoryId}`;
    let d = nextDate(parseISO(t.date), freq); // first occurrence AFTER the template's own date
    let guard = 0;
    while (format(d, 'yyyy-MM-dd') <= todayStr && guard < 400) {
      const ds = format(d, 'yyyy-MM-dd');
      const pk = periodKey(ds, freq);
      const rk = `${t.merchant}|${t.categoryId}|${freq}|${ds}`;
      const already = present.get(mk)?.has(pk);
      if (!already && !skipSet.has(rk)) {
        out.push({ base: t, date: ds, amount: t.amount, variable: !!t.variableAmount, recurrenceKey: rk });
        present.get(mk)!.add(pk); // don't emit two occurrences in the same period
      }
      d = nextDate(d, freq);
      guard++;
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
