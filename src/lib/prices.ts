// Live market prices.
//  • Crypto  → CoinGecko simple-price API (free, no key, CORS-friendly)
//  • Stocks/ETFs → Finnhub /quote (free tier, needs the user's API key)
// Both are best-effort: on any failure we return nothing and the holding keeps its
// last known value, so the app never breaks when offline or rate-limited.

export interface Quote { price: number; changePct: number }

// Common ticker → CoinGecko id map (extend as needed; unknowns fall back to a slug).
const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano', XRP: 'ripple', DOGE: 'dogecoin',
  BNB: 'binancecoin', DOT: 'polkadot', MATIC: 'matic-network', LTC: 'litecoin', AVAX: 'avalanche-2',
  LINK: 'chainlink', USDT: 'tether', USDC: 'usd-coin', TRX: 'tron', SHIB: 'shiba-inu', TON: 'the-open-network',
  ATOM: 'cosmos', UNI: 'uniswap', XLM: 'stellar', ALGO: 'algorand', NEAR: 'near',
};
export function cryptoId(ticker?: string, name?: string): string | null {
  const t = (ticker ?? '').toUpperCase();
  if (CRYPTO_IDS[t]) return CRYPTO_IDS[t];
  const slug = (name ?? ticker ?? '').toLowerCase().trim().replace(/\s+/g, '-');
  return slug || null;
}

/** Batch crypto prices in one CoinGecko call, keyed by upper-case ticker. */
export async function fetchCryptoPrices(holdings: { ticker?: string; name?: string }[], vs: string): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  const idToKey = new Map<string, string>();
  for (const h of holdings) {
    const id = cryptoId(h.ticker, h.name); if (!id) continue;
    idToKey.set(id, (h.ticker ?? h.name ?? '').toUpperCase());
  }
  const ids = [...idToKey.keys()];
  if (!ids.length) return out;
  const v = vs.toLowerCase();
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=${v}&include_24hr_change=true`);
    if (!res.ok) return out;
    const data = await res.json() as Record<string, Record<string, number>>;
    for (const [id, key] of idToKey) {
      const d = data[id]; if (!d) continue;
      const price = d[v];
      if (typeof price === 'number') out.set(key, { price, changePct: d[`${v}_24h_change`] ?? 0 });
    }
  } catch { /* offline / rate-limited — keep prior values */ }
  return out;
}

/** One Finnhub quote. Returns price + day-change % in the symbol's native currency. */
export async function fetchStockQuote(symbol: string, key: string): Promise<Quote | null> {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const d = await res.json() as { c?: number; dp?: number };
    if (typeof d.c !== 'number' || d.c === 0) return null; // 0 = unknown symbol / no data
    return { price: d.c, changePct: typeof d.dp === 'number' ? d.dp : 0 };
  } catch { return null; }
}
