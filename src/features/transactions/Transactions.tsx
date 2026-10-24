import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, SlidersHorizontal, ArrowUpDown, Trash2, Pencil, X, CheckSquare, Square, Download, ChevronLeft, ChevronRight,
  Table2, ArrowDownToLine, ArrowUpFromLine, Type, List, CreditCard, User, Hash,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Input, Select, Label } from '@/components/ui/Field';
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

  // Desktop table columns (Notion database view): select · name · category · method · [payer] · amount · edit
  const cols = showPayer
    ? 'md:grid-cols-[20px_minmax(0,1fr)_170px_120px_110px_150px_28px]'
    : 'md:grid-cols-[20px_minmax(0,1fr)_170px_120px_150px_28px]';
  const allSelected = selected.size === filtered.length && filtered.length > 0;

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
          <Segmented ariaLabel="Person" value={person} onChange={setPerson}
            options={[{ value: 'household', label: 'Household' }, ...members.map((m) => ({ value: m.id, label: m.id === userId ? 'You' : m.name }))]} />
        )}
        <div className="flex items-center gap-1">
          <IconButton onClick={() => setMonth(monthOptions[monthIdx + 1])} disabled={month === 'all' || monthIdx >= monthOptions.length - 1}
            aria-label="Previous month"><ChevronLeft size={16} /></IconButton>
          <Select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="!w-auto !py-1.5">
            {monthOptions.map((m) => <option key={m} value={m}>{format(parseISO(`${m}-01`), 'MMMM yyyy')}</option>)}
            <option value="all">All time</option>
          </Select>
          <IconButton onClick={() => setMonth(monthOptions[monthIdx - 1])} disabled={month === 'all' || monthIdx <= 0}
            aria-label="Next month"><ChevronRight size={16} /></IconButton>
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
            <p className="metric-label">{x.label}</p>
            <p className={cx('metric-value font-display text-xl sm:text-2xl font-semibold sm:mt-2 truncate', x.cls)}>{x.value}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-ink-muted -mt-2 mb-5">
        {personName} · {month === 'all' ? 'all time' : format(parseISO(`${month}-01`), 'MMMM yyyy')}
        {summary.income > 0 && summary.saved >= 0 && ` · ${summary.savingsRate.toFixed(0)}% of income saved`}
        {memberView && summary.sharedCount > 0 && ` · incl. ½ of ${summary.sharedCount} shared expense${summary.sharedCount > 1 ? 's' : ''} (${formatMoney(summary.sharedSpent, cur)})`}
      </p>

      {/* View bar — Notion-style view tabs on the left, search / filter / sort on the right */}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-b border-line mb-3">
        <Segmented variant="tabs" ariaLabel="Type" value={type} onChange={setType} className="border-b-0 -mb-px"
          options={[
            { value: 'all', label: 'All', icon: <Table2 size={15} /> },
            { value: 'income', label: 'Income', icon: <ArrowDownToLine size={15} /> },
            { value: 'expense', label: 'Expense', icon: <ArrowUpFromLine size={15} /> },
          ]} />
        <div className="flex flex-wrap items-center gap-1.5 pb-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchants, notes, amounts…"
              className="!py-1.5 !pl-8 !pr-7 !bg-fill !border-line" />
            {q && <IconButton size="sm" aria-label="Clear search" onClick={() => setQ('')} className="absolute right-0.5 top-1/2 -translate-y-1/2"><X size={14} /></IconButton>}
          </div>
          <Button variant="subtle" size="sm" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <SlidersHorizontal size={15} /> Filters {activeFilters > 0 && <span className="rounded-full bg-accent-strong text-on-accent text-3xs font-semibold px-1.5">{activeFilters}</span>}
          </Button>
          <div className="flex items-center">
            <Select aria-label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="!w-auto !py-1 !pl-2.5 !text-[13px] !bg-transparent !border-transparent hover:!bg-hover">
              <option value="date">Date</option><option value="amount">Amount</option><option value="merchant">Merchant</option>
            </Select>
            <IconButton size="sm" onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
              aria-label={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'} title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
              <ArrowUpDown size={15} className={cx('transition-transform', sortDir === 'asc' && 'rotate-180')} />
            </IconButton>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="rounded-card border border-line bg-surface-2 p-3 mb-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Select value={type} onChange={(e) => setType(e.target.value as any)} aria-label="Type">
                  <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option>
                </Select>
                <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method">
                  <option value="all">All methods</option>
                  {methods.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
              </div>
              {anyFilter && <button onClick={clearFilters} className="text-xs font-medium text-accent-ink hover:underline underline-offset-2 mt-2.5">Clear all filters</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
            className="rounded-card bg-accent-soft px-4 py-2 mb-3 flex items-center gap-2">
            <span className="text-sm font-medium text-accent-ink">{selected.size} selected</span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setBulkOpen(true)}><Pencil size={14} /> Bulk edit</Button>
            <Button variant="danger" size="sm" onClick={() => { deleteTransactions([...selected]); setSelected(new Set()); }}><Trash2 size={14} /> Delete</Button>
            <IconButton size="sm" aria-label="Clear selection" onClick={() => setSelected(new Set())}><X size={16} /></IconButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List — a database table on desktop, compact rows on phones */}
      {filtered.length === 0 ? (
        <Card><EmptyState icon="SearchX" title="No transactions found" subtitle="Try adjusting your search or filters."
          action={<Button onClick={() => setAdding(true)}><Plus size={16} /> Add transaction</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className={cx('flex md:grid items-center gap-3 px-4 py-2 border-b border-line text-[13px] text-ink-muted', cols)}>
            <button onClick={toggleAll} aria-label={allSelected ? 'Deselect all' : 'Select all'} className="hover:text-ink">
              {allSelected ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
            </button>
            <span className="md:hidden">Select all</span>
            <span className="hidden md:flex items-center gap-1.5"><Type size={14} /> Name</span>
            <span className="hidden md:flex items-center gap-1.5"><List size={14} /> Category</span>
            <span className="hidden md:flex items-center gap-1.5"><CreditCard size={14} /> Method</span>
            {showPayer && <span className="hidden md:flex items-center gap-1.5"><User size={14} /> Payer</span>}
            <span className="hidden md:flex items-center justify-end gap-1.5"><Hash size={14} /> Amount</span>
          </div>
          <div>
            {grouped.map(([date, items]) => (
              // content-visibility skips rendering/layout for off-screen day groups —
              // keeps a long history (hundreds/thousands of rows) fast to scroll.
              <div key={date} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 320px' } as React.CSSProperties}>
                <div className="px-4 py-1.5 text-xs font-medium text-ink-muted bg-surface-2 border-b border-line sticky top-0">
                  {isSameDay(parseISO(date), new Date()) ? 'Today' : format(parseISO(date), 'EEEE, d MMM yyyy')}
                </div>
                {items.map((t) => {
                  const c = categories.find((x) => x.id === t.categoryId);
                  const sel = selected.has(t.id);
                  return (
                    <div key={t.id} className={cx('flex md:grid items-center gap-3 px-4 py-2.5 md:py-2 border-b border-line last:border-b-0 transition-colors', cols, sel ? 'bg-accent-soft' : 'hover:bg-hover')}>
                      <button onClick={() => toggle(t.id)} aria-label={sel ? 'Deselect transaction' : 'Select transaction'} className="text-ink-muted hover:text-ink shrink-0">
                        {sel ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
                      </button>
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#94a3b8'} emoji={c?.emoji} size={16} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{t.merchant || c?.name || '—'}</span>
                            {t.recurring && <span className="shrink-0 text-goal text-xs" title={`Recurring · ${t.frequency}`}>↻</span>}
                            {t.auto && <Badge tone="gray" className="shrink-0 !text-3xs !leading-4">auto</Badge>}
                          </div>
                          <div className="text-xs text-ink-muted truncate md:hidden">
                            {c?.name} · {t.method}{t.recurring ? ` · ${t.frequency}` : ''}{t.notes ? ` · ${t.notes}` : ''}{showPayer && payerLabel(t.createdBy) ? ` · ${payerLabel(t.createdBy)}` : ''}
                          </div>
                          {t.notes && <div className="hidden md:block text-xs text-ink-muted truncate">{t.notes}</div>}
                        </div>
                      </div>
                      <div className="hidden md:block min-w-0">{c && <Badge color={c.color}>{c.emoji ? `${c.emoji} ` : ''}<span className="truncate">{c.name}</span></Badge>}</div>
                      <div className="hidden md:block text-sm text-ink-muted truncate">{t.method}</div>
                      {showPayer && <div className="hidden md:block text-sm text-ink-muted truncate">{payerLabel(t.createdBy) || '—'}</div>}
                      <div className={cx('text-right font-semibold tabular-nums shrink-0', t.type === 'income' && 'text-income')}>
                        {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, cur)}
                        {shareById.has(t.id) && <div className="text-3xs font-normal text-ink-muted">{personName === 'You' ? 'your' : `${personName}'s`} part {formatMoney(shareById.get(t.id)!, cur)}</div>}
                      </div>
                      <IconButton size="sm" onClick={() => setEditing(t)} aria-label="Edit transaction" className="!text-ink-faint hover:!text-ink"><Pencil size={15} /></IconButton>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* The reference's database footer: a small-caps SUM under the amount column */}
          <div className="flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1 px-4 py-2.5 border-t border-line bg-surface-2 text-sm">
            <span className="metric-label">Sum</span>
            <span className="tabular-nums text-income font-medium">+{formatMoney(totalIn, cur)}</span>
            <span className="tabular-nums font-medium">−{formatMoney(totalOut, cur)}</span>
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
        <p className="text-sm text-ink-muted">Only fields you set will be changed. Leave blank to keep existing values.</p>
        <div>
          <Label>Category</Label>
          <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">— keep —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <Label>Payment method</Label>
          <Select aria-label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">— keep —</option>
            {['Card', 'Cash', 'Bank Transfer', 'Direct Debit', 'PayPal', 'Apple Pay', 'Google Pay', 'Other'].map((m) => <option key={m}>{m}</option>)}
          </Select>
        </div>
        <div>
          <Label>Recurring</Label>
          <Select aria-label="Recurring" value={recurring} onChange={(e) => setRecurring(e.target.value)}>
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
