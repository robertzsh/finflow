import { describe, it, expect } from 'vitest';
import { upcomingOccurrences, nextDate } from '@/lib/recurring';
import type { Transaction } from '@/types';

const base: Transaction = {
  id: 'r1', type: 'expense', amount: 55, categoryId: 'subscriptions', merchant: 'Netflix',
  method: 'Card', date: '2026-07-05', recurring: true, frequency: 'monthly', createdAt: '',
};

describe('nextDate', () => {
  it('advances by frequency', () => {
    expect(nextDate(new Date('2026-07-05'), 'monthly').toISOString().slice(0, 10)).toBe('2026-08-05');
    expect(nextDate(new Date('2026-07-05'), 'weekly').toISOString().slice(0, 10)).toBe('2026-07-12');
  });
});

describe('upcomingOccurrences', () => {
  it('projects future recurring transactions within the horizon', () => {
    const today = new Date('2026-07-28');
    const up = upcomingOccurrences([base], 45, today);
    expect(up.length).toBeGreaterThan(0);
    expect(up.every((u) => u.date > '2026-07-28')).toBe(true);
    expect(up[0].amount).toBe(55);
  });
  it('ignores non-recurring transactions', () => {
    const oneOff: Transaction = { ...base, id: 'x', recurring: false, frequency: undefined };
    expect(upcomingOccurrences([oneOff], 45, new Date('2026-07-28')).length).toBe(0);
  });
});
