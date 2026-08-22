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

import { parseInvestmentsCSV } from '@/lib/export';
describe('parseInvestmentsCSV (Trading 212 style)', () => {
  it('aggregates buys per ticker into holdings', () => {
    const csv = [
      'Action,Time,Ticker,Name,No. of shares,Price / share,Total,Currency (Total)',
      'Market buy,2026-01-01,AAPL,Apple Inc,2,150,300,USD',
      'Market buy,2026-02-01,AAPL,Apple Inc,1,160,160,USD',
      'Market buy,2026-01-05,VUSA,Vanguard S&P 500 ETF,10,80,800,EUR',
      'Deposit,2026-01-01,,,,,,',
    ].join('\n');
    const h = parseInvestmentsCSV(csv);
    const aapl = h.find((x) => x.ticker === 'AAPL')!;
    expect(aapl.units).toBe(3);
    expect(aapl.costBasis).toBe(460);
    expect(aapl.currency).toBe('USD');
    const etf = h.find((x) => x.ticker === 'VUSA')!;
    expect(etf.kind).toBe('ETF');
    expect(etf.units).toBe(10);
  });
});
