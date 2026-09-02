import { describe, it, expect } from 'vitest';
import { budgetProgress } from '@/lib/finance';
import type { Transaction, Budget, Category } from '@/types';

const cats: Category[] = [
  { id: 'gym', name: 'Gym', kind: 'expense', icon: 'Dumbbell', color: '#000' },
  { id: 'groceries', name: 'Groceries', kind: 'expense', icon: 'ShoppingCart', color: '#000' },
];
const budgets: Budget[] = [
  { id: 'b1', categoryId: 'gym', amount: 300, month: 'all' },
  { id: 'b2', categoryId: 'groceries', amount: 2000, month: 'all' },
];
const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 0, categoryId: 'gym',
  merchant: '', method: 'Card', date: '2026-09-01', recurring: false, createdAt: '', ...p,
});

// Early in the month so the old code would wildly over-extrapolate.
const ref = new Date('2026-09-02');

describe('budgetProgress projection', () => {
  it('does NOT extrapolate a recurring monthly bill by daily run-rate', () => {
    const gym = budgetProgress(budgets, [tx({ categoryId: 'gym', amount: 155.04, recurring: true, frequency: 'monthly', date: '2026-09-01' })], cats, ref)
      .find((p) => p.budget.categoryId === 'gym')!;
    expect(gym.projected).toBe(155.04);        // not 2325.60
    expect(gym.overspending).toBe(false);      // 155 < 300 budget
  });

  it('still extrapolates variable (non-recurring) spend across the month', () => {
    const g = budgetProgress(budgets, [tx({ categoryId: 'groceries', amount: 30, recurring: false, date: '2026-09-01' })], cats, ref)
      .find((p) => p.budget.categoryId === 'groceries')!;
    // 30 spent over 2 elapsed days → ~450 projected for a 30-day month
    expect(g.projected).toBe(450);
  });

  it('projection is never below what was already spent', () => {
    const g = budgetProgress(budgets, [tx({ categoryId: 'gym', amount: 155.04, recurring: true, date: '2026-09-01' })], cats, ref)
      .find((p) => p.budget.categoryId === 'gym')!;
    expect(g.projected).toBeGreaterThanOrEqual(g.spent);
  });
});
