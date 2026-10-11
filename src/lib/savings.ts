import { format, startOfMonth, subMonths, isSameMonth, parseISO } from 'date-fns';
import type { SavingsPot, SavingsMovement, FxRates } from '@/types';
import { toBase, r2 } from './finance';

// ---------------------------------------------------------------------------
// Savings pots: real places where saved money sits. Moving money into a pot is a
// transfer OUT of the main account (lowers the balance) but never an expense, so
// spending stats and the savings rate are unaffected. Each movement keeps its lei
// value at the time (`base`), which is what left / came back to the main account.
// ---------------------------------------------------------------------------

/** Current balance of a pot, in the pot's own currency. */
export function potBalance(pot: SavingsPot): number {
  return r2(pot.startBalance + pot.movements.reduce((a, m) => a + m.amount, 0));
}

/** Total saved across pots in lei, split into joint and per-owner. */
export function savingsTotals(pots: SavingsPot[], rates?: FxRates) {
  let total = 0, joint = 0;
  const perOwner = new Map<string, number>();
  for (const p of pots) {
    const v = toBase(potBalance(p), p.currency, rates);
    total += v;
    if (p.owner) perOwner.set(p.owner, r2((perOwner.get(p.owner) ?? 0) + v));
    else joint += v;
  }
  return { total: r2(total), joint: r2(joint), perOwner };
}

/** Net lei moved out of the main account into pots (deposits − withdrawals), optionally up to a date. */
export function transferredOut(pots: SavingsPot[], upTo?: string): number {
  let sum = 0;
  for (const p of pots) for (const m of p.movements) if (!upTo || m.date <= upTo) sum += m.base;
  return r2(sum);
}

/** Who a movement counts for: the pot owner for a personal pot, else whoever moved it. */
const creditedTo = (p: SavingsPot, m: SavingsMovement) => p.owner ?? m.by;

/** Net lei saved into pots during the month of `ref` — household-wide, or for one member. */
export function savedInMonth(pots: SavingsPot[], ref: Date, memberId?: string): number {
  let sum = 0;
  for (const p of pots) for (const m of p.movements) {
    if (!isSameMonth(parseISO(m.date), ref)) continue;
    if (memberId && creditedTo(p, m) !== memberId) continue;
    sum += m.base;
  }
  return r2(sum);
}

/** Net change of one pot during the month of `ref`, in the pot's currency. */
export function potChangeInMonth(pot: SavingsPot, ref: Date): number {
  return r2(pot.movements.filter((m) => isSameMonth(parseISO(m.date), ref)).reduce((a, m) => a + m.amount, 0));
}

export interface SavingsMonth { month: string; key: string; deposited: number; withdrawn: number; net: number; cumulative: number }

/** Per-month deposits / withdrawals / net, plus the total in pots (lei) at each month's end. */
export function savingsSeries(pots: SavingsPot[], months = 12, ref = new Date(), rates?: FxRates): SavingsMonth[] {
  const starting = pots.reduce((a, p) => a + toBase(p.startBalance, p.currency, rates), 0);
  const all = pots.flatMap((p) => p.movements);
  const out: SavingsMonth[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const mRef = startOfMonth(subMonths(ref, i));
    const key = format(mRef, 'yyyy-MM');
    let deposited = 0, withdrawn = 0, upTo = 0;
    for (const m of all) {
      const mk = m.date.slice(0, 7);
      if (mk <= key) upTo += m.base;
      if (mk !== key) continue;
      if (m.base >= 0) deposited += m.base; else withdrawn += -m.base;
    }
    out.push({ month: format(mRef, 'MMM'), key, deposited: r2(deposited), withdrawn: r2(withdrawn), net: r2(deposited - withdrawn), cumulative: r2(starting + upTo) });
  }
  return out;
}

/** Progress toward a monthly target, 0-100+ (0 when no target). */
export function targetProgress(saved: number, target: number): number {
  return target > 0 ? (saved / target) * 100 : 0;
}

export interface DueAutoSave { potId: string; movement: SavingsMovement }
interface AutoSaveCtx {
  userId: string | null;                         // null = local mode (this device posts everything)
  salaryOf: (memberId?: string) => number;       // lei — for percent-of-salary rules
  rates?: FxRates;
}

/** Auto-save movements due this month that haven't been posted yet.
 *  Idempotent via `autoKey`; in a household only the pot's owner (or, for a
 *  joint pot, its creator) posts, so two devices never both move the money. */
export function dueAutoSaves(pots: SavingsPot[], today: Date, ctx: AutoSaveCtx): DueAutoSave[] {
  const mk = format(today, 'yyyy-MM');
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const out: DueAutoSave[] = [];
  for (const p of pots) {
    const rule = p.autoSave;
    if (!rule?.enabled || !(rule.value > 0)) continue;
    const poster = p.owner ?? p.createdBy;
    if (ctx.userId && poster && poster !== ctx.userId) continue;
    const day = Math.min(Math.max(1, Math.round(rule.day) || 1), daysInMonth);
    if (today.getDate() < day) continue;
    const date = `${mk}-${String(day).padStart(2, '0')}`;
    if (p.createdAt && date < p.createdAt.slice(0, 10)) continue; // rule date fell before the pot existed
    const autoKey = `${p.id}|${mk}`;
    if (p.movements.some((m) => m.autoKey === autoKey)) continue;
    const rate = toBase(1, p.currency, ctx.rates);
    let base: number, amount: number;
    if (rule.mode === 'percent') {
      base = r2(ctx.salaryOf(poster ?? undefined) * rule.value / 100);
      amount = r2(base / rate);
    } else {
      amount = r2(rule.value);
      base = r2(amount * rate);
    }
    if (!(amount > 0)) continue;
    out.push({ potId: p.id, movement: { id: `as-${autoKey}`, date, amount, base, by: poster ?? undefined, note: 'Auto-save', autoKey } });
  }
  return out;
}
