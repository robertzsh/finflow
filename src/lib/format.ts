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

export function formatPct(n: number, digits = 0) {
  return `${n >= 0 ? '' : ''}${n.toFixed(digits)}%`;
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
