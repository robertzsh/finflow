import { describe, it, expect } from 'vitest';
import {
  potBalance, savingsTotals, transferredOut, savedInMonth, potChangeInMonth, savingsSeries, targetProgress, dueAutoSaves,
} from '@/lib/savings';
import type { SavingsPot, SavingsMovement, FxRates } from '@/types';

const FX: FxRates = { RON: 1, EUR: 5, USD: 4.6, GBP: 5.9 };
const A = 'iulia', B = 'robert';
let n = 0;
const mv = (p: Partial<SavingsMovement>): SavingsMovement => ({ id: `m${n++}`, date: '2026-08-10', amount: 0, base: 0, ...p });
const pot = (p: Partial<SavingsPot>): SavingsPot => ({
  id: `p${n++}`, name: 'Pot', icon: 'PiggyBank', color: '#000', startBalance: 0, movements: [], createdAt: '2026-01-01', ...p,
});

describe('potBalance / totals', () => {
  it('is the starting balance plus all movements, in the pot currency', () => {
    const p = pot({ startBalance: 1000, movements: [mv({ amount: 500, base: 500 }), mv({ amount: -200, base: -200 })] });
    expect(potBalance(p)).toBe(1300);
  });

  it('totals convert foreign pots to lei and split joint vs per-owner', () => {
    const pots = [
      pot({ startBalance: 1000 }),                                 // joint, RON
      pot({ startBalance: 100, currency: 'EUR', owner: A }),       // 500 lei
      pot({ startBalance: 300, owner: B }),
    ];
    const t = savingsTotals(pots, FX);
    expect(t.total).toBe(1800);
    expect(t.joint).toBe(1000);
    expect(t.perOwner.get(A)).toBe(500);
    expect(t.perOwner.get(B)).toBe(300);
  });
});

describe('transferredOut', () => {
  it('sums the lei value of movements and ignores starting balances', () => {
    const pots = [
      pot({ startBalance: 9999, movements: [mv({ amount: 500, base: 500 }), mv({ amount: -100, base: -100, date: '2026-09-02' })] }),
      pot({ currency: 'EUR', movements: [mv({ amount: 100, base: 497 })] }),
    ];
    expect(transferredOut(pots)).toBe(897);
    expect(transferredOut(pots, '2026-08-31')).toBe(997);
  });
});

describe('savedInMonth', () => {
  const pots = [
    pot({ movements: [mv({ base: 500, amount: 500, by: A }), mv({ base: 300, amount: 300, by: B }), mv({ base: 100, amount: 100, by: A, date: '2026-07-30' })] }),
    pot({ owner: B, movements: [mv({ base: 200, amount: 200, by: A })] }), // personal pot → credited to its owner
  ];
  const ref = new Date('2026-08-15');
  it('counts only the given month', () => expect(savedInMonth(pots, ref)).toBe(1000));
  it('splits by member, crediting personal pots to their owner', () => {
    expect(savedInMonth(pots, ref, A)).toBe(500);
    expect(savedInMonth(pots, ref, B)).toBe(500);
  });
  it('potChangeInMonth is in the pot currency', () => {
    expect(potChangeInMonth(pots[0], ref)).toBe(800);
  });
});

describe('savingsSeries', () => {
  it('gives deposits, withdrawals, net and running total per month', () => {
    const pots = [pot({ startBalance: 1000, movements: [
      mv({ date: '2026-07-05', amount: 400, base: 400 }),
      mv({ date: '2026-08-05', amount: 600, base: 600 }),
      mv({ date: '2026-08-20', amount: -100, base: -100 }),
    ] })];
    const s = savingsSeries(pots, 3, new Date('2026-08-15'), FX);
    expect(s.map((r) => r.key)).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(s[0]).toMatchObject({ net: 0, cumulative: 1000 });
    expect(s[1]).toMatchObject({ deposited: 400, net: 400, cumulative: 1400 });
    expect(s[2]).toMatchObject({ deposited: 600, withdrawn: 100, net: 500, cumulative: 1900 });
  });
});

describe('targetProgress', () => {
  it('is 0 without a target', () => expect(targetProgress(500, 0)).toBe(0));
  it('is a percentage of the target', () => expect(targetProgress(500, 2000)).toBe(25));
});

describe('dueAutoSaves', () => {
  const ctx = { userId: null, salaryOf: () => 8000, rates: FX };
  const rule = { mode: 'fixed' as const, value: 500, day: 10, enabled: true };

  it('posts a fixed amount once the day is reached', () => {
    const p = pot({ id: 'p1', autoSave: rule });
    expect(dueAutoSaves([p], new Date('2026-08-09'), ctx)).toEqual([]);
    const due = dueAutoSaves([p], new Date('2026-08-10'), ctx);
    expect(due).toHaveLength(1);
    expect(due[0].movement).toMatchObject({ date: '2026-08-10', amount: 500, base: 500, autoKey: 'p1|2026-08' });
  });

  it('is idempotent within a month', () => {
    const p = pot({ id: 'p1', autoSave: rule, movements: [mv({ autoKey: 'p1|2026-08', amount: 500, base: 500 })] });
    expect(dueAutoSaves([p], new Date('2026-08-20'), ctx)).toEqual([]);
    expect(dueAutoSaves([p], new Date('2026-09-10'), ctx)).toHaveLength(1);
  });

  it('percent mode takes a share of the salary and converts into the pot currency', () => {
    const p = pot({ currency: 'EUR', autoSave: { ...rule, mode: 'percent', value: 10 } });
    const [d] = dueAutoSaves([p], new Date('2026-08-12'), ctx);
    expect(d.movement.base).toBe(800);
    expect(d.movement.amount).toBe(160);
  });

  it('skips disabled rules and dates before the pot existed', () => {
    expect(dueAutoSaves([pot({ autoSave: { ...rule, enabled: false } })], new Date('2026-08-12'), ctx)).toEqual([]);
    expect(dueAutoSaves([pot({ autoSave: rule, createdAt: '2026-08-11' })], new Date('2026-08-12'), ctx)).toEqual([]);
  });

  it('clamps the day to the month length', () => {
    const [d] = dueAutoSaves([pot({ autoSave: { ...rule, day: 31 } })], new Date('2026-02-28'), ctx);
    expect(d.movement.date).toBe('2026-02-28');
  });

  it('in a household only the owner (or the joint pot creator) posts', () => {
    const mine = pot({ owner: A, autoSave: rule });
    const theirs = pot({ owner: B, autoSave: rule });
    const joint = pot({ createdBy: B, autoSave: rule });
    const due = dueAutoSaves([mine, theirs, joint], new Date('2026-08-12'), { ...ctx, userId: A });
    expect(due.map((d) => d.potId)).toEqual([mine.id]);
  });
});
