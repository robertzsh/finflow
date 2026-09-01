import { describe, it, expect } from 'vitest';
import { dueOccurrences, recurrenceKeyFor } from '@/lib/recurring';
import type { Transaction } from '@/types';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 0, categoryId: 'rent',
  merchant: 'Rent', method: 'Card', date: '2026-01-10', recurring: false, createdAt: '', ...p,
});

describe('dueOccurrences', () => {
  it('backfills every missed month since the template date', () => {
    const template = tx({ merchant: 'Rent', amount: 2200, recurring: true, frequency: 'monthly', date: '2026-01-10' });
    const due = dueOccurrences([template], new Date('2026-04-15'));
    // Feb, Mar, Apr occurrences (Jan is the template itself)
    expect(due.map((d) => d.date)).toEqual(['2026-02-10', '2026-03-10', '2026-04-10']);
    expect(due.every((d) => d.amount === 2200)).toBe(true);
  });

  it('is idempotent: an already-posted month is not re-emitted', () => {
    const template = tx({ merchant: 'Rent', amount: 2200, recurring: true, frequency: 'monthly', date: '2026-01-10' });
    const posted = tx({ merchant: 'Rent', amount: 2200, recurring: true, frequency: 'monthly', date: '2026-02-10', auto: true });
    const due = dueOccurrences([template, posted], new Date('2026-02-20'));
    expect(due.length).toBe(0); // Feb already exists
  });

  it('does not duplicate when the user manually logged that month', () => {
    const template = tx({ merchant: 'Digi', categoryId: 'digi', amount: 45, recurring: true, frequency: 'monthly', date: '2026-01-05' });
    const manual = tx({ merchant: 'Digi', categoryId: 'digi', amount: 47, date: '2026-02-03' }); // manual, not recurring
    const due = dueOccurrences([template, manual], new Date('2026-02-10'));
    expect(due.length).toBe(0);
  });

  it('flags variable-amount bills so they can be confirmed', () => {
    const template = tx({ merchant: 'Digi', categoryId: 'digi', amount: 45, recurring: true, frequency: 'monthly', variableAmount: true, date: '2026-01-05' });
    const due = dueOccurrences([template], new Date('2026-02-10'));
    expect(due.length).toBe(1);
    expect(due[0].variable).toBe(true);
  });

  it('respects the skip list', () => {
    const template = tx({ merchant: 'Rent', amount: 2200, recurring: true, frequency: 'monthly', date: '2026-01-10' });
    const feb = recurrenceKeyFor(template, '2026-02-10');
    const due = dueOccurrences([template], new Date('2026-02-20'), [feb]);
    expect(due.length).toBe(0);
  });

  it('does not emit future occurrences', () => {
    const template = tx({ merchant: 'Rent', amount: 2200, recurring: true, frequency: 'monthly', date: '2026-01-10' });
    const due = dueOccurrences([template], new Date('2026-01-15')); // only 5 days after template
    expect(due.length).toBe(0);
  });
});
