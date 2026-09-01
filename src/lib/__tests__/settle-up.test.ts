import { describe, it, expect } from 'vitest';
import { settleUp } from '@/lib/finance';
import type { Transaction } from '@/types';

const ref = new Date('2026-08-15');
const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 0, categoryId: 'misc',
  merchant: '', method: 'Card', date: '2026-08-10', recurring: false, createdAt: '', ...p,
});
const A = 'iulia', B = 'robert';

describe('settleUp', () => {
  it('returns null unless there are exactly two members', () => {
    expect(settleUp([], ref, [A])).toBeNull();
    expect(settleUp([], ref, [A, B, 'c'])).toBeNull();
  });

  it('balances when both fronted equally', () => {
    const r = settleUp([tx({ amount: 100, createdBy: A }), tx({ amount: 100, createdBy: B })], ref, [A, B])!;
    expect(r.total).toBe(200);
    expect(r.fairShare).toBe(100);
    expect(r.owe).toBeNull();
  });

  it('the one who paid more is owed half the difference', () => {
    // Iulia paid 300, Robert 100 → total 400, fair 200 each → Robert owes 100.
    const r = settleUp([tx({ amount: 300, createdBy: A }), tx({ amount: 100, createdBy: B })], ref, [A, B])!;
    expect(r.owe).toEqual({ fromId: B, toId: A, amount: 100 });
  });

  it('splits shared/unattributed expenses half-and-half (no imbalance)', () => {
    const r = settleUp([tx({ amount: 400, createdBy: 'all' })], ref, [A, B])!;
    expect(r.paid[A]).toBe(200);
    expect(r.paid[B]).toBe(200);
    expect(r.owe).toBeNull();
  });

  it('ignores income and other months', () => {
    const r = settleUp([
      tx({ amount: 300, createdBy: A }),
      tx({ type: 'income', amount: 9000, createdBy: A }),
      tx({ amount: 500, createdBy: B, date: '2026-07-10' }),
    ], ref, [A, B])!;
    expect(r.total).toBe(300);
    expect(r.owe).toEqual({ fromId: B, toId: A, amount: 150 });
  });
});
