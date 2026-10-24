import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Plus, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { SectionCardHeader } from '@/components/layout/PageHeader';
import { Input, Select } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { fetchCryptoPrices, fetchStockQuote, cryptoId } from '@/lib/prices';
import { formatMoney, cx } from '@/lib/format';

interface WatchItem { s: string; k: 'stock' | 'crypto'; n: string }
interface Q { price: number; changePct: number }

const DEFAULTS: WatchItem[] = [
  { s: 'AAPL', k: 'stock', n: 'Apple' }, { s: 'MSFT', k: 'stock', n: 'Microsoft' },
  { s: 'NVDA', k: 'stock', n: 'NVIDIA' }, { s: 'TSLA', k: 'stock', n: 'Tesla' },
  { s: 'AMZN', k: 'stock', n: 'Amazon' }, { s: 'GOOGL', k: 'stock', n: 'Alphabet' },
  { s: 'BTC', k: 'crypto', n: 'Bitcoin' }, { s: 'ETH', k: 'crypto', n: 'Ethereum' },
];
const KEY = 'ff_watchlist';
const load = (): WatchItem[] => { try { return JSON.parse(localStorage.getItem(KEY) || '') || DEFAULTS; } catch { return DEFAULTS; } };
const save = (l: WatchItem[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* */ } };

/** Yahoo-Finance-style live quotes strip: popular stocks + crypto, prices in USD.
 *  Crypto is free (CoinGecko); stocks need the user's Finnhub key. */
export function MarketWatch() {
  const finnhubKey = useStore((s) => s.settings.finnhubKey);
  const [list, setList] = useState<WatchItem[]>(load);
  const [quotes, setQuotes] = useState<Record<string, Q>>({});
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState('');
  const [kindAdd, setKindAdd] = useState<'stock' | 'crypto'>('stock');
  const ranAt = useRef(0);

  async function refresh() {
    setLoading(true);
    const next: Record<string, Q> = {};
    try {
      const cryptos = list.filter((w) => w.k === 'crypto');
      if (cryptos.length) {
        const m = await fetchCryptoPrices(cryptos.map((w) => ({ ticker: w.s, name: w.n })), 'USD');
        for (const w of cryptos) { const q = m.get(w.s.toUpperCase()); if (q) next[w.s] = q; }
      }
      if (finnhubKey) {
        for (const w of list.filter((x) => x.k === 'stock')) {
          const q = await fetchStockQuote(w.s, finnhubKey); if (q) next[w.s] = q;
        }
      }
    } catch { /* keep prior */ }
    setQuotes((prev) => ({ ...prev, ...next }));
    setLoading(false);
  }

  // Auto-load once per hour on mount.
  useEffect(() => {
    const last = Number(localStorage.getItem('ff-watch-ts') || 0);
    if (Date.now() - last > 60 * 60 * 1000) { localStorage.setItem('ff-watch-ts', String(Date.now())); refresh(); }
    else if (Date.now() - ranAt.current > 1000) refresh();
    ranAt.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add() {
    const s = adding.trim().toUpperCase(); if (!s) return;
    if (list.some((w) => w.s === s)) { setAdding(''); return; }
    const next = [...list, { s, k: kindAdd, n: kindAdd === 'crypto' ? (cryptoId(s) ?? s) : s }];
    setList(next); save(next); setAdding('');
    setTimeout(refresh, 0);
  }
  function remove(s: string) { const next = list.filter((w) => w.s !== s); setList(next); save(next); }

  const needKey = list.some((w) => w.k === 'stock') && !finnhubKey;

  return (
    <Card className="p-5 mb-4">
      <SectionCardHeader title="Markets" hint="Live prices · USD"
        action={<IconButton aria-label="Refresh markets" onClick={refresh} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></IconButton>} />
      <div className="divide-y divide-line -mx-1">
        {list.map((w) => {
          const q = quotes[w.s];
          return (
            <div key={w.s} className="group flex items-center gap-3 px-1 py-2">
              <div className="w-11 shrink-0 text-sm font-semibold">{w.s}</div>
              <div className="flex-1 min-w-0 text-xs text-ink-muted truncate">{w.n}{w.k === 'crypto' ? ' · crypto' : ''}</div>
              {q ? (
                <>
                  <div className="tabular-nums font-semibold text-sm w-24 text-right">{formatMoney(q.price, 'USD')}</div>
                  <div className={cx('tabular-nums text-xs w-16 text-right', q.changePct >= 0 ? 'text-income' : 'text-expense')}>
                    {q.changePct >= 0 ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className="text-xs text-ink-muted w-40 text-right">{w.k === 'stock' && !finnhubKey ? 'needs Finnhub key' : loading ? 'loading…' : '—'}</div>
              )}
              <IconButton size="sm" onClick={() => remove(w.s)} className="can-hover:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:!text-expense" aria-label={`Remove ${w.s}`}><X size={14} /></IconButton>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-3">
        <Select aria-label="Market type" value={kindAdd} onChange={(e) => setKindAdd(e.target.value as 'stock' | 'crypto')} className="!w-auto">
          <option value="stock">Stock</option><option value="crypto">Crypto</option>
        </Select>
        <Input value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder={kindAdd === 'crypto' ? 'Add ticker e.g. SOL' : 'Add ticker e.g. META'} className="flex-1" />
        <Button variant="ghost" onClick={add} disabled={!adding.trim()} aria-label="Add ticker"><Plus size={16} /></Button>
      </div>
      {needKey && <p className="text-2xs text-ink-muted mt-2">Add a free Finnhub key (below in Holdings) to see live stock prices. Crypto is already live.</p>}
    </Card>
  );
}
