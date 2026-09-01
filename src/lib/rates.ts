import type { FxRates, CurrencyCode } from '@/types';

// ---------------------------------------------------------------------------
// Historical FX: we snapshot the daily rates we fetch, keyed by date, so a
// transaction dated in the past can convert at the rate from *that* day rather
// than today's. The free endpoint only returns "latest", so history only covers
// days the app actually ran — older dates fall back to the nearest earlier
// snapshot, then to the current rate.
// ---------------------------------------------------------------------------
const FX_HISTORY_KEY = 'ff_fx_history';
type FxHistory = Record<string, FxRates>; // yyyy-mm-dd → rates

export function loadFxHistory(): FxHistory {
  try { return JSON.parse(localStorage.getItem(FX_HISTORY_KEY) || '{}'); } catch { return {}; }
}

export function snapshotRates(rates: FxRates, date = new Date().toISOString().slice(0, 10)) {
  try {
    const h = loadFxHistory();
    h[date] = { ...rates };
    // keep the most recent ~400 days
    const keys = Object.keys(h).sort();
    while (keys.length > 400) { delete h[keys.shift()!]; }
    localStorage.setItem(FX_HISTORY_KEY, JSON.stringify(h));
  } catch { /* ignore */ }
}

/** lei-per-unit for `currency` as of `date`: the latest snapshot on/before that
 *  date, else the provided current rates. */
export function rateForDate(date: string, currency: CurrencyCode, current: FxRates): number {
  if (currency === 'RON') return 1;
  const h = loadFxHistory();
  const days = Object.keys(h).filter((d) => d <= date).sort();
  for (let i = days.length - 1; i >= 0; i--) {
    const r = h[days[i]]?.[currency];
    if (typeof r === 'number') return r;
  }
  return current[currency] ?? 1;
}

// Live FX rates from the free, no-key, CORS-friendly exchangerate-api open endpoint.
// Base RON; the API returns "units per 1 RON", so lei-per-unit = 1 / rate.
export async function fetchFxRates(): Promise<Partial<Record<'EUR' | 'USD' | 'GBP', number>> | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/RON');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== 'success' || !data.rates) return null;
    const r = data.rates as Record<string, number>;
    const round = (n: number) => Math.round(n * 10000) / 10000;
    const out: Partial<Record<'EUR' | 'USD' | 'GBP', number>> = {};
    if (r.EUR) out.EUR = round(1 / r.EUR);
    if (r.USD) out.USD = round(1 / r.USD);
    if (r.GBP) out.GBP = round(1 / r.GBP);
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}
