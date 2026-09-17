import { describe, it, expect } from 'vitest';
import { accountBalance, lifetimeTotals } from '@/lib/finance';
import type { Transaction } from '@/types';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 0, categoryId: 'misc',
  merchant: '', method: 'Card', date: '2026-09-01', recurring: false, createdAt: '', ...p,
});

describe('balance composition', () => {
  const txs = [
    tx({ type: 'income', amount: 7000 }),
    tx({ type: 'income', amount: 600 }),
    tx({ type: 'expense', amount: 2200 }),
    tx({ type: 'expense', amount: 155.04 }),
  ];

  it('lifetimeTotals sums income and expense across all transactions', () => {
    const t = lifetimeTotals(txs);
    expect(t.income).toBe(7600);
    expect(t.expense).toBe(2355.04);
  });

  it('balance = opening + income − expense (the exact figure the breakdown shows)', () => {
    const opening = 7000; // e.g. sum of members' starting balances
    const bal = accountBalance(txs, opening);
    const t = lifetimeTotals(txs);
    expect(bal).toBeCloseTo(opening + t.income - t.expense, 2); // 7000 + 7600 − 2355.04 = 12244.96
    expect(bal).toBeCloseTo(12244.96, 2);
  });

  it('a duplicate income inflates the balance by exactly that amount (why de-duping fixes it)', () => {
    const withDupe = [...txs, tx({ type: 'income', amount: 7000 })];
    expect(accountBalance(withDupe, 0) - accountBalance(txs, 0)).toBeCloseTo(7000, 2);
  });
});
