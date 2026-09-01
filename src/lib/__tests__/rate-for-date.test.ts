import { describe, it, expect, beforeEach } from 'vitest';
import { rateForDate, snapshotRates, loadFxHistory } from '@/lib/rates';
import type { FxRates } from '@/types';

// minimal in-memory localStorage for the node test environment
beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const current: FxRates = { RON: 1, EUR: 5.0, USD: 4.6, GBP: 5.9 };

describe('rateForDate', () => {
  it('returns 1 for the base currency', () => {
    expect(rateForDate('2026-08-01', 'RON', current)).toBe(1);
  });

  it('falls back to the current rate when there is no history', () => {
    expect(rateForDate('2026-08-01', 'EUR', current)).toBe(5.0);
  });

  it('uses the snapshot on/before the transaction date', () => {
    snapshotRates({ RON: 1, EUR: 4.90, USD: 4.5, GBP: 5.8 }, '2026-06-01');
    snapshotRates({ RON: 1, EUR: 5.10, USD: 4.7, GBP: 6.0 }, '2026-08-01');
    // a July date should use the June snapshot (latest on/before)
    expect(rateForDate('2026-07-15', 'EUR', current)).toBe(4.90);
    // an August date uses the August snapshot
    expect(rateForDate('2026-08-15', 'EUR', current)).toBe(5.10);
    // before any snapshot → current
    expect(rateForDate('2026-01-01', 'EUR', current)).toBe(5.0);
  });

  it('snapshotRates keeps history keyed by date', () => {
    snapshotRates(current, '2026-09-01');
    expect(loadFxHistory()['2026-09-01'].EUR).toBe(5.0);
  });
});
