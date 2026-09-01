import type { CurrencyCode } from '@/types';

const SYMBOL: Record<CurrencyCode, string> = { RON: 'lei', GBP: '£', USD: '$', EUR: '€' };

// Locale per currency so numbers read naturally (RON → "1.234,56 lei").
const LOCALE: Record<CurrencyCode, string> = { RON: 'ro-RO', GBP: 'en-GB', USD: 'en-US', EUR: 'de-DE' };

export function currencySymbol(c: CurrencyCode) { return SYMBOL[c]; }

// Presentation / privacy mode: when on, every money value renders as a mask.
let _privacy = (() => { try { return localStorage.getItem('ff_privacy') === '1'; } catch { return false; } })();
export function setMoneyPrivacy(v: boolean) { _privacy = v; }
export const MONEY_MASK = '••••';

export function formatMoney(n: number, currency: CurrencyCode = 'RON', opts?: { compact?: boolean; sign?: boolean; cents?: boolean }) {
  if (_privacy) return MONEY_MASK;
  const sign = opts?.sign && n > 0 ? '+' : '';
  // Consistent strategy: whole amounts show no decimals ("7.600 RON"); only show
  // the two decimals when there's an actual fractional part ("49,99 RON"). This
  // keeps the dashboard calm and scannable instead of ".,00" everywhere.
  const hasCents = opts?.cents ?? (Math.round(Math.abs(n) * 100) % 100 !== 0);
  return sign + new Intl.NumberFormat(LOCALE[currency] ?? 'en-GB', {
    style: 'currency', currency,
    notation: opts?.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts?.compact ? 1 : (hasCents ? 2 : 0),
    minimumFractionDigits: opts?.compact ? 0 : (hasCents ? 2 : 0),
  }).format(n);
}

/** Parse a user-typed amount that may use a comma as the decimal separator
 *  (iPhone number keypads only offer a comma in many locales). Handles
 *  "12,50" → 12.5, "1.234,56" → 1234.56, "1,234.56" → 1234.56. */
export function parseAmount(input: string | number | undefined | null): number {
  if (typeof input === 'number') return input;
  if (input == null) return NaN;
  let s = String(input).trim().replace(/\s/g, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) {
    // whichever separator comes last is the decimal point
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Semantic accent colours as inline hex, theme-aware. In the pink theme green/red/blue
 *  become mint-teal / coral / berry so "plus and minus" feel soft, not alarming. */
export function accentHex(accent: string, theme: string): string {
  const pink = theme === 'pink';
  const map: Record<string, string> = {
    income: pink ? '#0891b2' : '#10b981',
    expense: pink ? '#f43f5e' : '#ef4444',
    savings: pink ? '#db2777' : '#3b82f6',
    invest: pink ? '#f59e0b' : '#eab308',
    goal: pink ? '#db2777' : '#a855f7',
    neutral: '#94a3b8',
  };
  return map[accent] ?? map.neutral;
}

export function formatPct(n: number, digits = 0) {
  return `${n >= 0 ? '' : ''}${n.toFixed(digits)}%`;
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
