import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, SlidersHorizontal, ArrowUpDown, Trash2, Pencil, X, CheckSquare, Square, Download, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { formatMoney, localMonthKey, cx } from '@/lib/format';
import { memberShareLines, flowSummary } from '@/lib/finance';
import { useToday } from '@/hooks/useToday';
import { exportCSV } from '@/lib/export';
import type { Transaction } from '@/types';
import { format, parseISO, isSameDay, subMonths } from 'date-fns';

type SortKey = 'date' | 'amount' | 'merchant';

export default function Transactions() {
  const { transactions, categories, settings, deleteTransactions, bulkUpdate, cloud, authed, members, userId } = useStore();
  const REF = useToday();
  const cur = settings.currency;
  const showPayer = cloud && authed && members.length > 1;
  const payerLabel = (id?: string) => id === 'all' ? '👥 Both' : (members.find((m) => m.id === id)?.name ? `👤 ${members.find((m) => m.id === id)!.name}` : '');

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const thisMonth = localMonthKey(REF);
  // Last 24 months for the picker (newest first); 'all' = no month limit.
  const monthOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => localMonthKey(subMonths(REF, i))), [REF]);
  const [month, setMonth] = useState<string>(thisMonth);
  const [person, setPerson] = useState<string>('household'); // 'household' or a member id

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
      const matchesMonth = month === 'all' || t.date.startsWith(month);
      // A member view keeps their own + shared transactions and hides the partner's own.
      const matchesPerson = person === 'household' || t.createdBy === person || !t.createdBy || !memberIds.includes(t.createdBy);
      return matchesQ && matchesType && matchesCat && matchesMethod && matchesFrom && matchesTo && matchesMonth && matchesPerson;
    });
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortKey === 'date') r = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      if (sortKey === 'amount') r = a.amount - b.amount;
      if (sortKey === 'merchant') r = a.merchant.localeCompare(b.merchant);
      return sortDir === 'asc' ? r : -r;
    });
    return list;
  }, [transactions, categories, q, type, cat, method, from, to, sortKey, sortDir, month, person, memberIds]);

  // Income / spent / saved for the chosen person: shared transactions count as an equal share
  // (same rule as the Dashboard's per-person stats), the household view counts everything in full.
  const memberView = person !== 'household';
  const shareLines = useMemo(() => memberShareLines(filtered, memberView ? person : null, memberIds), [filtered, memberView, person, memberIds]);
  const summary = useMemo(() => flowSummary(shareLines), [shareLines]);
  const shareById = useMemo(() => new Map(shareLines.filter((l) => l.shared).map((l) => [l.tx.id, l.share] as const)), [shareLines]);
  const monthIdx = monthOptions.indexOf(month);
  const personName = person === 'household' ? 'Household' : person === userId ? 'You' : (members.find((m) => m.id === person)?.name ?? 'Member');

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
  function clearFilters() { setQ(''); setType('all'); setCat('all'); setMethod('all'); setFrom(''); setTo(''); setMonth(thisMonth); setPerson('household'); }
  const activeFilters = [type !== 'all', cat !== 'all', method !== 'all', !!from, !!to].filter(Boolean).length;
  const anyFilter = activeFilters > 0 || month !== thisMonth || person !== 'household';

  return (
    <Page>
      <PageHeader title="Transactions" subtitle={`${filtered.length} shown · ${formatMoney(totalIn, cur)} in · ${formatMoney(totalOut, cur)} out`}
        action={<div className="flex gap-2">
          <Button variant="ghost" onClick={() => exportCSV(filtered, categories, 'transactions')}><Download size={16} /><span className="hidden sm:inline">Export</span></Button>
          <Button onClick={() => setAdding(true)}><Plus size={16} /> Add</Button>
        </div>} />

      {/* Person + month — what the summary below is about */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {showPayer && (
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-0.5" role="group" aria-label="Person">
            {[{ id: 'household', label: 'Household' }, ...members.map((m) => ({ id: m.id, label: m.id === userId ? 'You' : m.name }))].map((o) => (
              <button key={o.id} onClick={() => setPerson(o.id)} aria-pressed={person === o.id}
                className={cx('rounded-lg px-3 py-1.5 text-sm transition', person === o.id ? 'bg-white/10 text-white font-medium' : 'text-white/55 hover:text-white')}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => setMonth(monthOptions[monthIdx + 1])} disabled={month === 'all' || monthIdx >= monthOptions.length - 1}
            aria-label="Previous month" className="rounded-lg p-2 text-white/50 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
          <Select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="!w-auto !py-1.5">
            {monthOptions.map((m) => <option key={m} value={m}>{format(parseISO(`${m}-01`), 'MMMM yyyy')}</option>)}
            <option value="all">All time</option>
          </Select>
          <button onClick={() => setMonth(monthOptions[monthIdx - 1])} disabled={month === 'all' || monthIdx <= 0}
            aria-label="Next month" className="rounded-lg p-2 text-white/50 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Summary for the chosen person + period (follows every filter below) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4" aria-label="Summary">
        {[
          { label: 'Income', value: formatMoney(summary.income, cur), cls: 'text-income' },
          { label: 'Spent', value: formatMoney(summary.spent, cur), cls: 'text-expense' },
          { label: 'Saved', value: formatMoney(summary.saved, cur, { sign: true }), cls: summary.saved >= 0 ? 'text-savings' : 'text-expense' },
        ].map((x) => (
          <Card key={x.label} className="px-4 py-2.5 sm:p-4 min-w-0 flex sm:block items-center justify-between gap-3">
            <p className="text-xs text-white/50">{x.label}</p>
            <p className={cx('metric-value text-lg sm:text-xl font-bold sm:mt-0.5 truncate tabular-nums', x.cls)}>{x.value}</p>
          </Card>
        ))}
      </div>
      <p className="text-[11px] text-white/40 -mt-2 mb-4">
        {personName} · {month === 'all' ? 'all time' : format(parseISO(`${month}-01`), 'MMMM yyyy')}
        {summary.income > 0 && summary.saved >= 0 && ` · ${summary.savingsRate.toFixed(0)}% of income saved`}
        {memberView && summary.sharedCount > 0 && ` · incl. ½ of ${summary.sharedCount} shared expense${summary.sharedCount > 1 ? 's' : ''} (${formatMoney(summary.sharedSpent, cur)})`}
      </p>

      {/* Controls */}
      <Card className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl bg-white/[0.06] px-3 transition-colors focus-within:bg-white/[0.09]">
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
              {anyFilter && <button onClick={clearFilters} className="text-xs text-brand mt-2">Clear all filters</button>}
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
              // content-visibility skips rendering/layout for off-screen day groups —
              // keeps a long history (hundreds/thousands of rows) fast to scroll.
              <div key={date} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 320px' } as React.CSSProperties}>
                <div className="px-4 py-2 text-xs font-medium text-white/40 bg-white/[0.02] sticky top-0">
                  {isSameDay(parseISO(date), new Date()) ? 'Today' : format(parseISO(date), 'EEEE, d MMM yyyy')}
                </div>
                {items.map((t) => {
                  const c = categories.find((x) => x.id === t.categoryId);
                  const sel = selected.has(t.id);
                  return (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition ${sel ? 'bg-blue-500/5' : ''}`}>
                      <button onClick={() => toggle(t.id)} aria-label={sel ? 'Deselect transaction' : 'Select transaction'} className="text-white/40 hover:text-white shrink-0">
                        {sel ? <CheckSquare size={16} className="text-brand" /> : <Square size={16} />}
                      </button>
                      <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#888'} emoji={c?.emoji} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate">{t.merchant || c?.name || '—'}</span>
                          {t.recurring && <span className="shrink-0 text-goal text-[11px]" title={`Recurring · ${t.frequency}`}>↻</span>}
                          {t.auto && <span className="shrink-0 text-[10px] text-white/40 px-1 py-0.5 rounded bg-white/10" title="Posted automatically from a recurring bill">auto</span>}
                        </div>
                        <div className="text-xs text-white/40 truncate">
                          {c?.name} · {t.method}{t.recurring ? ` · ${t.frequency}` : ''}{t.notes ? ` · ${t.notes}` : ''}{showPayer && payerLabel(t.createdBy) ? ` · ${payerLabel(t.createdBy)}` : ''}
                        </div>
                      </div>
                      <div className={`text-right font-semibold tabular-nums shrink-0 ${t.type === 'income' ? 'text-income' : ''}`}>
                        {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, cur)}
                        {shareById.has(t.id) && <div className="text-[10px] font-normal text-white/40">{personName === 'You' ? 'your' : `${personName}'s`} part {formatMoney(shareById.get(t.id)!, cur)}</div>}
                      </div>
                      <button onClick={() => setEditing(t)} aria-label="Edit transaction" className="text-white/30 hover:text-white shrink-0 p-1"><Pencil size={15} /></button>
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
