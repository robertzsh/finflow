import { describe, it, expect } from 'vitest';
import { accountBalance, monthStats, budgetProgress, toBase, investmentTotals } from '@/lib/finance';
import type { Transaction, Budget, Category, Investment } from '@/types';

const cats: Category[] = [
  { id: 'salary', name: 'Salary', kind: 'income', icon: 'Wallet', color: '#0f0' },
  { id: 'groceries', name: 'Groceries', kind: 'expense', icon: 'Cart', color: '#f00' },
];

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 100, categoryId: 'groceries',
  merchant: 'Shop', method: 'Card', date: '2026-07-10', recurring: false, createdAt: '', ...over,
});

describe('accountBalance', () => {
  it('adds income and subtracts expenses from the opening balance', () => {
    const txs = [tx({ type: 'income', amount: 5000, categoryId: 'salary' }), tx({ amount: 200 }), tx({ amount: 300 })];
    expect(accountBalance(txs, 1000)).toBe(1000 + 5000 - 200 - 300);
  });
  it('defaults opening balance to 0', () => {
    expect(accountBalance([tx({ type: 'income', amount: 100, categoryId: 'salary' })])).toBe(100);
  });
});

describe('monthStats', () => {
  it('computes income, expense, net and savings rate for a month', () => {
    const ref = new Date('2026-07-15');
    const txs = [
      tx({ type: 'income', amount: 10000, categoryId: 'salary', date: '2026-07-01' }),
      tx({ amount: 2000, date: '2026-07-05' }),
      tx({ amount: 3000, date: '2026-06-20' }), // different month, ignored
    ];
    const s = monthStats(txs, ref);
    expect(s.income).toBe(10000);
    expect(s.expense).toBe(2000);
    expect(s.net).toBe(8000);
    expect(Math.round(s.savingsRate)).toBe(80);
  });
});

describe('budgetProgress', () => {
  it('flags a budget as over when spending exceeds the limit', () => {
    const ref = new Date('2026-07-28');
    const budgets: Budget[] = [{ id: 'b1', categoryId: 'groceries', amount: 500, month: 'all' }];
    const txs = [tx({ amount: 600, date: '2026-07-02' })];
    const [p] = budgetProgress(budgets, txs, cats, ref);
    expect(p.spent).toBe(600);
    expect(p.remaining).toBe(-100);
    expect(p.pct).toBeGreaterThan(100);
  });
});

describe('toBase (multi-currency)', () => {
  it('converts using fx rates, RON is identity', () => {
    const fx = { RON: 1, EUR: 5, USD: 4.5, GBP: 6 };
    expect(toBase(100, 'RON', fx)).toBe(100);
    expect(toBase(100, 'EUR', fx)).toBe(500);
    expect(toBase(10, 'USD', fx)).toBe(45);
    expect(toBase(100, undefined, fx)).toBe(100); // undefined => base
  });
});

describe('investmentTotals', () => {
  it('sums holdings converted to base currency', () => {
    const fx = { RON: 1, EUR: 5, USD: 4.5, GBP: 6 };
    const inv: Investment[] = [
      { id: '1', name: 'A', kind: 'ETF', currency: 'EUR', units: 1, costBasis: 100, currentValue: 120, history: [] },
      { id: '2', name: 'B', kind: 'Savings', currency: 'RON', units: 1, costBasis: 1000, currentValue: 1000, history: [] },
    ];
    const t = investmentTotals(inv, fx);
    expect(t.value).toBe(120 * 5 + 1000);
    expect(t.cost).toBe(100 * 5 + 1000);
    expect(t.gain).toBe(100); // (120-100)*5
  });
});
