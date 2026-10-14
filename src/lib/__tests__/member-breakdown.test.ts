import { describe, it, expect } from 'vitest';
import { memberMonthBreakdown, perMemberSpending, memberShareLines, flowSummary } from '@/lib/finance';
import type { Transaction } from '@/types';

const ref = new Date('2026-10-14');
const R = 'robert', I = 'iulia';
let n = 0;
const tx = (p: Partial<Transaction>): Transaction => ({
  id: `t${n++}`, type: 'expense', amount: 0, categoryId: 'misc', merchant: '', method: 'Card', date: '2026-10-05', recurring: false, createdAt: '', ...p,
});
const txs = [
  tx({ type: 'income', amount: 6000, createdBy: R }),
  tx({ type: 'income', amount: 5000, createdBy: I }),
  tx({ amount: 2200, createdBy: 'all' }),
  tx({ amount: 345.13, createdBy: 'all' }),
  tx({ amount: 1500, createdBy: R }),
  tx({ amount: 700, createdBy: I }),
  tx({ amount: 99.99 }),                          // unattributed → split
  tx({ amount: 999, createdBy: R, date: '2026-09-30' }), // other month
];

describe('memberMonthBreakdown', () => {
  const b = memberMonthBreakdown(txs, ref, R, [R, I]);
  it('splits income, own expenses and the member\'s half of shared ones', () => {
    expect(b.incomeTotal).toBe(6000);
    expect(b.ownTotal).toBe(1500);
    expect(b.sharedTotal).toBe(1322.56); // (2200 + 345.13 + 99.99) / 2
    expect(b.shared).toHaveLength(3);
    expect(b.own.map((l) => l.tx.amount)).toEqual([1500]); // excludes Iulia's own + other months
  });
  it('net matches the per-person Saved figure on the dashboard', () => {
    const m = perMemberSpending(txs, ref, [R, I]).get(R)!;
    expect(b.net).toBeCloseTo(m.income - m.expense, 2);
  });
});

describe('memberShareLines / flowSummary', () => {
  const oct = txs.filter((t) => t.date.startsWith('2026-10'));
  it('drops the partner\'s own transactions and halves shared ones', () => {
    const lines = memberShareLines(oct, R, [R, I]);
    expect(lines.some((l) => l.tx.createdBy === I)).toBe(false);
    expect(lines.find((l) => l.tx.amount === 2200)).toMatchObject({ share: 1100, shared: true });
    expect(lines.find((l) => l.tx.amount === 1500)).toMatchObject({ share: 1500, shared: false });
  });
  it('member summaries add up to the household summary', () => {
    const r = flowSummary(memberShareLines(oct, R, [R, I]));
    const i = flowSummary(memberShareLines(oct, I, [R, I]));
    const hh = flowSummary(memberShareLines(oct, null, [R, I]));
    expect(r.income + i.income).toBeCloseTo(hh.income, 2);
    expect(r.spent + i.spent).toBeCloseTo(hh.spent, 2);
    expect(r.saved + i.saved).toBeCloseTo(hh.saved, 2);
  });
  it('a member\'s month summary equals the dashboard breakdown', () => {
    const r = flowSummary(memberShareLines(oct, R, [R, I]));
    expect(r.saved).toBeCloseTo(memberMonthBreakdown(txs, ref, R, [R, I]).net, 2);
    expect(r.sharedCount).toBe(3);
    expect(r.sharedSpent).toBe(1322.56);
  });
});
