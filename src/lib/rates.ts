// Live FX rates from the free, no-key Frankfurter API (European Central Bank data).
// Returns "lei per 1 unit" for EUR/USD/GBP so it plugs straight into settings.fxRates.
export async function fetchFxRates(): Promise<Partial<Record<'EUR' | 'USD' | 'GBP', number>> | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=RON&to=EUR,USD,GBP');
    if (!res.ok) return null;
    const data = await res.json();
    const r = (data.rates ?? {}) as Record<string, number>;
    const round = (n: number) => Math.round(n * 10000) / 10000;
    const out: Partial<Record<'EUR' | 'USD' | 'GBP', number>> = {};
    if (r.EUR) out.EUR = round(1 / r.EUR); // 1 RON = r.EUR euros → lei per euro = 1/r.EUR
    if (r.USD) out.USD = round(1 / r.USD);
    if (r.GBP) out.GBP = round(1 / r.GBP);
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}
