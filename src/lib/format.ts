import type { CurrencyCode } from '@/types';

const SYMBOL: Record<CurrencyCode, string> = { GBP: '£', USD: '$', EUR: '€' };

export function currencySymbol(c: CurrencyCode) { return SYMBOL[c]; }

export function formatMoney(n: number, currency: CurrencyCode = 'GBP', opts?: { compact?: boolean; sign?: boolean }) {
  const sign = opts?.sign && n > 0 ? '+' : '';
  return sign + new Intl.NumberFormat('en-GB', {
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
