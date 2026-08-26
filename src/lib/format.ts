import type { CurrencyCode } from '@/types';

const SYMBOL: Record<CurrencyCode, string> = { RON: 'lei', GBP: '£', USD: '$', EUR: '€' };

// Locale per currency so numbers read naturally (RON → "1.234,56 lei").
const LOCALE: Record<CurrencyCode, string> = { RON: 'ro-RO', GBP: 'en-GB', USD: 'en-US', EUR: 'de-DE' };

export function currencySymbol(c: CurrencyCode) { return SYMBOL[c]; }

// Presentation / privacy mode: when on, every money value renders as a mask.
let _privacy = (() => { try { return localStorage.getItem('ff_privacy') === '1'; } catch { return false; } })();
export function setMoneyPrivacy(v: boolean) { _privacy = v; }
export const MONEY_MASK = '••••';

export function formatMoney(n: number, currency: CurrencyCode = 'RON', opts?: { compact?: boolean; sign?: boolean }) {
  if (_privacy) return MONEY_MASK;
  const sign = opts?.sign && n > 0 ? '+' : '';
  return sign + new Intl.NumberFormat(LOCALE[currency] ?? 'en-GB', {
    style: 'currency', currency,
    notation: opts?.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts?.compact ? 1 : 2,
    minimumFractionDigits: opts?.compact ? 0 : 2,
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

export function formatPct(n: number, digits = 0) {
  return `${n >= 0 ? '' : ''}${n.toFixed(digits)}%`;
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
