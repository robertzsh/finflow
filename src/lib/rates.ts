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
