import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { localDateKey, localMonthKey } from '@/lib/format';

// Pin the time zone so the test means the same thing on a dev Mac and on CI (UTC).
// Node picks up a runtime TZ change for every Date created afterwards.
const prevTZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Europe/Bucharest'; });
afterAll(() => { process.env.TZ = prevTZ; });
afterEach(() => { vi.useRealTimers(); });

describe('local date keys', () => {
  it('00:30 on Oct 1 in Bucharest is still Sep 30 in UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T21:30:00Z')); // = 2026-10-01 00:30 EEST
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-09-30'); // the old, wrong way
    expect(localDateKey()).toBe('2026-10-01');
    expect(localMonthKey()).toBe('2026-10');
  });

  it('agrees with UTC in the middle of the day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T09:00:00Z'));
    expect(localDateKey()).toBe('2026-10-15');
    expect(localMonthKey()).toBe('2026-10');
  });

  it('formats a local-midnight Date as that day, not the day before', () => {
    expect(localDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});
