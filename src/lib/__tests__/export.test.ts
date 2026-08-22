import { describe, it, expect } from 'vitest';
import { parseBankCSV } from '@/lib/export';
import type { Category } from '@/types';

const cats: Category[] = [];

describe('parseBankCSV', () => {
  it('parses a simple bank CSV, sign decides income vs expense', () => {
    const csv = 'Date,Description,Amount\n05/07/2026,Kaufland,-120.50\n12/07/2026,Salariu,9500';
    const rows = parseBankCSV(csv, cats);
    expect(rows.length).toBe(2);
    expect(rows[0]).toMatchObject({ merchant: 'Kaufland', type: 'expense', amount: 120.5, date: '2026-07-05' });
    expect(rows[1]).toMatchObject({ merchant: 'Salariu', type: 'income', amount: 9500 });
  });
});
