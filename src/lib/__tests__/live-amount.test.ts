import { describe, it, expect } from 'vitest';
import { liveAmount, recurringSummary } from '@/lib/finance';
import type { Transaction, Category, FxRates } from '@/types';

const fx = (eur: number): FxRates => ({ RON: 1, EUR: eur, USD: 4.6, GBP: 5.9 });

describe('liveAmount', () => {
  it('re-converts a foreign bill at the current rate', () => {
    const rent = { amount: 2100, origCurrency: 'EUR' as const, origAmount: 420 };
    expect(liveAmount(rent, fx(5.0))).toBe(2100); // 420 × 5.0
    expect(liveAmount(rent, fx(5.1))).toBe(2142); // moves with the rate
  });
  it('falls back to the stored amount for base-currency transactions', () => {
    expect(liveAmount({ amount: 155 }, fx(5.0))).toBe(155);
  });
});

describe('recurringSummary uses live FX for foreign bills', () => {
  const cats: Category[] = [{ id: 'rent', name: 'Rent', kind: 'expense', icon: 'Home', color: '#000' }];
  const tx = (p: Partial<Transaction>): Transaction => ({
    id: 'r', type: 'expense', amount: 0, categoryId: 'rent', merchant: 'Rent', method: 'Card',
    date: '2026-08-10', recurring: true, frequency: 'monthly', createdAt: '', ...p,
  });

  it('a EUR rent contributes its live-converted monthly figure', () => {
    const r = recurringSummary([tx({ amount: 2100, origCurrency: 'EUR', origAmount: 420, createdBy: 'all' })], ['a', 'b'], cats, fx(5.2));
    expect(r.householdMonthly).toBe(2184); // 420 × 5.2, not the stored 2100
    expect(r.perMember.get('a')).toBe(1092); // half
  });
});
