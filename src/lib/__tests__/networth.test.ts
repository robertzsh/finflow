import { describe, it, expect } from 'vitest';
import { netWorthSeries, investmentValueAsOf } from '@/lib/finance';
import type { Transaction, Investment } from '@/types';

const inv: Investment[] = [
  { id: 'i1', name: 'ETF', kind: 'ETF', currency: 'RON', units: 1, costBasis: 1000, currentValue: 1200,
    history: [{ date: '2026-06-30', value: 1000 }, { date: '2026-08-31', value: 1200 }] },
];

describe('investmentValueAsOf', () => {
  it('uses the latest history point on/before the month end', () => {
    expect(investmentValueAsOf(inv, new Date('2026-07-15'))).toBe(1000); // only June point available
    expect(investmentValueAsOf(inv, new Date('2026-08-15'))).toBe(1200); // Aug point applies
  });
  it('falls back to currentValue when no history point precedes the date', () => {
    expect(investmentValueAsOf(inv, new Date('2026-01-15'))).toBe(1200); // currentValue fallback
  });
});

describe('netWorthSeries', () => {
  it('combines running cash balance with investment value', () => {
    const today = new Date().toISOString().slice(0, 10); // in-window regardless of run date
    const txs: Transaction[] = [
      { id: 't1', type: 'income', amount: 5000, categoryId: 'salary', merchant: 'Salary', method: 'Card',
        date: today, recurring: false, createdAt: '' },
    ];
    const s = netWorthSeries(txs, inv, 12, 1000, { RON: 1, EUR: 5, USD: 4.6, GBP: 5.9 });
    const last = s[s.length - 1];
    // cash = opening 1000 + 5000 income = 6000; invest = latest point 1200 → net 7200
    expect(last.cash).toBe(6000);
    expect(last.invest).toBe(1200);
    expect(last.value).toBe(last.cash + last.invest);
  });
});
