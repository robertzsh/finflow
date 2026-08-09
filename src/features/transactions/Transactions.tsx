import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, SlidersHorizontal, ArrowUpDown, Trash2, Pencil, X, CheckSquare, Square, Download } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { TransactionModal } from '@/components/TransactionModal';
import { formatMoney } from '@/lib/format';
import { exportCSV } from '@/lib/export';
import type { Transaction } from '@/types';
import { format, parseISO, isSameDay } from 'date-fns';

type SortKey = 'date' | 'amount' | 'merchant';

export default function Transactions() {
  const { transactions, categories, settings, deleteTransactions, bulkUpdate } = useStore();
  const cur = settings.currency;

  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [cat, setCat] = useState('all');
  const [method, setMethod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [adding, setAdding] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const methods = useMemo(() => [...new Set(transactions.map((t) => t.method))], [transactions]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    let list = transactions.filter((t) => {
      const c = categories.find((x) => x.id === t.categoryId)?.name.toLowerCase() ?? '';
      const matchesQ = !s || t.merchant.toLowerCase().includes(s) || (t.notes ?? '').toLowerCase().includes(s) || c.includes(s) || String(t.amount).includes(s);
      const matchesType = type === 'all' || t.type === type;
      const matchesCat = cat === 'all' || t.categoryId === cat;
      const matchesMethod = method === 'all' || t.method === method;
      const matchesFrom = !from || t.date >= from;
      const matchesTo = !to || t.date <= to;
      return matchesQ && matchesType && matchesCat && matchesMethod && matchesFrom && matchesTo;
    });
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortKey === 'date') r = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      if (sortKey === 'amount') r = a.amount - b.amount;
      if (sortKey === 'merchant') r = a.merchant.localeCompare(b.merchant);
      return sortDir === 'asc' ? r : -r;
    });
    return list;
  }, [transactions, categories, q, type, cat, method, from, to, sortKey, sortDir]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const k = t.date;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()];
  }, [filtered]);

  const totalIn = filtered.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const totalOut = filtered.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id)));
  }
  function clearFilters() { setQ(''); setType('all'); setCat('all'); setMethod('all'); setFrom(''); setTo(''); }
  const activeFilters = [type !== 'all', cat !== 'all', method !== 'all', !!from, !!to].filter(Boolean).length;

  return (
    <Page>
      <PageHeader title="Transactions" subtitle={`${filtered.length} shown · ${formatMoney(totalIn, cur)} in · ${formatMoney(totalOut, cur)} out`}
        action={<div className="flex gap-2">
          <Button variant="ghost" onClick={() => exportCSV(filtered, categories, 'transactions')}><Download size={16} /><span className="hidden sm:inline">Export</span></Button>
          <Button onClick={() => setAdding(true)}><Plus size={16} /> Add</Button>
        </div>} />

      {/* Controls */}
      <Card className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl bg-white/5 border border-white/10 px-3">
            <Search size={16} className="text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchants, notes, categories, amounts…"
              className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-white/30" />
            {q && <button onClick={() => setQ('')}><X size={14} className="text-white/40" /></button>}
          </div>
          <Button variant="ghost" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal size={16} /> Filters {activeFilters > 0 && <span className="ml-1 rounded-full bg-blue-500 text-white text-[10px] px-1.5">{activeFilters}</span>}
          </Button>
          <button onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/70">
            <ArrowUpDown size={15} />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} onClick={(e) => e.stopPropagation()}
              className="bg-transparent outline-none text-sm">
              <option value="date">Date</option><option value="amount">Amount</option><option value="merchant">Merchant</option>
            </select>
            <span className="text-white/40 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-3">
                <Select value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option>
                </Select>
                <Select value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="all">All methods</option>
                  {methods.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              {activeFilters > 0 && <button onClick={clearFilters} className="text-xs text-blue-400 mt-2">Clear all filters</button>}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
            className="glass rounded-xl px-4 py-2.5 mb-3 flex items-center gap-3 border border-blue-500/30">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setBulkOpen(true)}><Pencil size={14} /> Bulk edit</Button>
            <Button variant="danger" onClick={() => { deleteTransactions([...selected]); setSelected(new Set()); }}><Trash2 size={14} /> Delete</Button>
            <button onClick={() => setSelected(new Set())}><X size={16} className="text-white/50" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><EmptyState icon="SearchX" title="No transactions found" subtitle="Try adjusting your search or filters."
          action={<Button onClick={() => setAdding(true)}><Plus size={16} /> Add transaction</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 text-xs text-white/40">
            <button onClick={toggleAll} className="text-white/50 hover:text-white">
              {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
            <span>Select all</span>
          </div>
          <div className="divide-y divide-white/5">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <div className="px-4 py-2 text-xs font-medium text-white/40 bg-white/[0.02] sticky top-0">
                  {isSameDay(parseISO(date), new Date('2026-07-28')) ? 'Today' : format(parseISO(date), 'EEEE, d MMM yyyy')}
                </div>
                {items.map((t) => {
                  const c = categories.find((x) => x.id === t.categoryId);
                  const sel = selected.has(t.id);
                  return (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition ${sel ? 'bg-blue-500/5' : ''}`}>
                      <button onClick={() => toggle(t.id)} className="text-white/40 hover:text-white shrink-0">
                        {sel ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                      </button>
                      <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#888'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{t.merchant}</span>
                          {t.recurring && <Badge color="#a855f7">↻ {t.frequency}</Badge>}
                        </div>
                        <div className="text-xs text-white/40 flex items-center gap-1.5">
                          {c?.name} · {t.method}{t.notes ? ` · ${t.notes}` : ''}
                        </div>
                      </div>
                      <div className={`text-right font-semibold tabular-nums shrink-0 ${t.type === 'income' ? 'text-income' : ''}`}>
                        {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, cur)}
                      </div>
                      <button onClick={() => setEditing(t)} className="text-white/30 hover:text-white shrink-0 p-1"><Pencil size={15} /></button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      <TransactionModal open={adding} onClose={() => setAdding(false)} />
      <TransactionModal open={!!editing} onClose={() => setEditing(null)} existing={editing ?? undefined} />
      <BulkEditModal open={bulkOpen} onClose={() => setBulkOpen(false)} ids={[...selected]}
        onApply={(patch) => { bulkUpdate([...selected], patch); setBulkOpen(false); setSelected(new Set()); }} />
    </Page>
  );
}

function BulkEditModal({ open, onClose, ids, onApply }: { open: boolean; onClose: () => void; ids: string[]; onApply: (p: Partial<Transaction>) => void }) {
  const { categories } = useStore();
  const [cat, setCat] = useState('');
  const [method, setMethod] = useState('');
  const [recurring, setRecurring] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={`Bulk edit ${ids.length} transactions`}>
      <div className="space-y-4">
        <p className="text-sm text-white/50">Only fields you set will be changed. Leave blank to keep existing values.</p>
        <div>
          <label className="text-xs text-white/60">Category</label>
          <Select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">— keep —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs text-white/60">Payment method</label>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">— keep —</option>
            {['Card', 'Cash', 'Bank Transfer', 'Direct Debit', 'PayPal', 'Apple Pay', 'Google Pay', 'Other'].map((m) => <option key={m}>{m}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs text-white/60">Recurring</label>
          <Select value={recurring} onChange={(e) => setRecurring(e.target.value)}>
            <option value="">— keep —</option><option value="yes">Mark recurring (monthly)</option><option value="no">Mark not recurring</option>
          </Select>
        </div>
        <Button className="w-full" onClick={() => {
          const patch: Partial<Transaction> = {};
          if (cat) patch.categoryId = cat;
          if (method) patch.method = method as any;
          if (recurring === 'yes') { patch.recurring = true; patch.frequency = 'monthly'; }
          if (recurring === 'no') { patch.recurring = false; }
          onApply(patch);
        }}>Apply to {ids.length} transactions</Button>
      </div>
    </Modal>
  );
}
