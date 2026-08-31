import { describe, it, expect } from 'vitest';
import { recurringSummary } from '@/lib/finance';
import type { Transaction, Category } from '@/types';

const cats: Category[] = [
  { id: 'rent', name: 'Rent', kind: 'expense', icon: 'Home', color: '#000' },
  { id: 'gym', name: 'Gym', kind: 'expense', icon: 'Dumbbell', color: '#000' },
  { id: 'subscriptions', name: 'Subscriptions', kind: 'expense', icon: 'RefreshCw', color: '#000' },
  { id: 'spotify', name: 'Spotify', kind: 'expense', icon: 'Music', color: '#000', parent: 'subscriptions' },
];

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 0, categoryId: 'misc',
  merchant: '', method: 'Card', date: '2026-08-10', recurring: false, createdAt: '', ...p,
});

const A = 'iulia', B = 'robert';

describe('recurringSummary', () => {
  it('splits a shared bill 50/50 between members', () => {
    const r = recurringSummary(
      [tx({ merchant: 'Rent', categoryId: 'rent', amount: 2200, recurring: true, frequency: 'monthly', createdBy: 'all' })],
      [A, B], cats,
    );
    expect(r.householdMonthly).toBe(2200);
    expect(r.perMember.get(A)).toBe(1100);
    expect(r.perMember.get(B)).toBe(1100);
    // each member's itemised line shows the half, flagged shared
    expect(r.perMemberItems.get(A)![0]).toMatchObject({ monthly: 1100, shared: true });
  });

  it('keeps each person\'s own same-category bill separate (no cross-payer collapse)', () => {
    const r = recurringSummary(
      [
        tx({ merchant: 'Gym', categoryId: 'gym', amount: 155, recurring: true, frequency: 'monthly', createdBy: A }),
        tx({ merchant: 'Gym', categoryId: 'gym', amount: 155, recurring: true, frequency: 'monthly', createdBy: B }),
      ],
      [A, B], cats,
    );
    expect(r.items.length).toBe(2);            // both Gyms survive
    expect(r.perMember.get(A)).toBe(155);
    expect(r.perMember.get(B)).toBe(155);
  });

  it('auto-counts subscription-category items even without the recurring flag', () => {
    const r = recurringSummary(
      [tx({ merchant: 'Spotify', categoryId: 'spotify', amount: 26, recurring: false, createdBy: A })],
      [A, B], cats,
    );
    expect(r.householdMonthly).toBe(26);
    expect(r.perMember.get(A)).toBe(26);
    expect(r.perMember.get(B)).toBe(0);
  });

  it('normalises non-monthly frequencies to a monthly figure', () => {
    const r = recurringSummary(
      [tx({ merchant: 'Yearly thing', categoryId: 'rent', amount: 1200, recurring: true, frequency: 'yearly', createdBy: A })],
      [A, B], cats,
    );
    expect(r.perMember.get(A)).toBe(100); // 1200 / 12
  });

  it('ignores income transactions', () => {
    const r = recurringSummary(
      [tx({ type: 'income', merchant: 'Salary', categoryId: 'salary', amount: 9000, recurring: true, frequency: 'monthly', createdBy: A })],
      [A, B], cats,
    );
    expect(r.householdMonthly).toBe(0);
  });
});
