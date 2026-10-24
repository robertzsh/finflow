import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth,
  isSameDay, addMonths, parseISO,
} from 'date-fns';
import { useStore } from '@/store/useStore';
import { Page } from '@/aura/components/PageTransition';
import { PageHeader } from '@/aura/components/layout/PageHeader';
import { Card } from '@/aura/components/ui/Card';
import { Button, IconButton } from '@/aura/components/ui/Button';
import { Badge, tagStyle } from '@/aura/components/ui/Badge';
import { staggered } from '@/aura/lib/motion';
import { CategoryIcon } from '@/aura/components/ui/CategoryIcon';
import { TransactionModal } from '@/aura/components/TransactionModal';
import { Plus } from 'lucide-react';
import { upcomingOccurrences } from '@/lib/recurring';
import { liveAmount } from '@/lib/finance';
import { formatMoney, cx } from '@/lib/format';
import type { Transaction } from '@/types';
import { useToday } from '@/hooks/useToday';

interface DayItem {
  key: string;                 // date yyyy-MM-dd
  id?: string;                 // real transaction id (absent for projected occurrences)
  merchant: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  createdBy?: string;
  projected?: boolean;         // future recurring, not yet a real transaction
  recurring?: boolean;
  frequency?: string;
}

export default function Calendar() {
  const { transactions, categories, settings, cloud, authed, members } = useStore();
  const TODAY = useToday();
  const cur = settings.currency;
  const [month, setMonth] = useState(startOfMonth(TODAY));
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const showPayer = cloud && authed && members.length > 1;
  const payerLabel = (id?: string) => id === 'all' ? '👥 Both' : (members.find((m) => m.id === id)?.name ? `👤 ${members.find((m) => m.id === id)!.name}` : '');

  const upcoming = useMemo(() => upcomingOccurrences(transactions, 90, TODAY, categories), [transactions, categories, TODAY]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  // Every actual transaction on its day, plus projected future recurring bills.
  const itemsByDate = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const add = (d: DayItem) => { const a = map.get(d.key) ?? []; a.push(d); map.set(d.key, a); };
    for (const t of transactions) {
      add({ key: t.date, id: t.id, merchant: t.merchant, amount: t.amount, type: t.type, categoryId: t.categoryId, createdBy: t.createdBy, recurring: t.recurring, frequency: t.frequency });
    }
    for (const u of upcoming) {
      // only add a projected occurrence if there isn't already a real one that day for the same merchant
      const existing = map.get(u.date) ?? [];
      if (!existing.some((e) => e.merchant === u.base.merchant)) {
        add({ key: u.date, merchant: u.base.merchant, amount: liveAmount(u.base, settings.fxRates), type: u.base.type, categoryId: u.base.categoryId, projected: true, recurring: true, frequency: u.base.frequency });
      }
    }
    return map;
  }, [transactions, upcoming, settings.fxRates]);

  const selectedItems = selected ? (itemsByDate.get(selected) ?? []) : [];
  const dayIncome = selectedItems.filter((i) => i.type === 'income').reduce((a, i) => a + i.amount, 0);
  const dayExpense = selectedItems.filter((i) => i.type === 'expense').reduce((a, i) => a + i.amount, 0);

  return (
    <Page>
      <PageHeader title="Calendar" subtitle="Tap a day to see its transactions · bills & subscriptions projected ahead" />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">{format(month, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-0.5">
              <IconButton size="sm" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}><ChevronLeft size={16} /></IconButton>
              <Button variant="subtle" size="sm" onClick={() => setMonth(startOfMonth(TODAY))}>Today</Button>
              <IconButton size="sm" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight size={16} /></IconButton>
            </div>
          </div>
          {/* Notion calendar view: hairline grid, day number top-right, today in an accent circle */}
          <div className="grid grid-cols-7 text-right text-2xs text-ink-muted pb-1.5">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="px-1.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-line rounded-control overflow-hidden">
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const items = itemsByDate.get(key) ?? [];
              const inMonth = isSameMonth(d, month);
              const today = isSameDay(d, TODAY);
              const isSel = selected === key;
              const dayNet = items.reduce((a, i) => a + (i.type === 'income' ? i.amount : -i.amount), 0);
              return (
                <button key={key} onClick={() => setSelected(key)} aria-pressed={isSel} aria-label={format(d, 'EEEE d MMMM')}
                  className={cx('flex flex-col justify-start min-h-[56px] sm:min-h-[84px] border-r border-b border-line p-1 sm:p-1.5 text-left transition-colors focus-visible:relative focus-visible:z-10',
                    isSel ? 'bg-accent-soft' : inMonth ? 'bg-surface hover:bg-hover' : 'bg-surface-2 hover:bg-hover')}>
                  <div className="flex justify-end mb-0.5">
                    <span className={cx('grid h-5 min-w-5 place-items-center rounded-full px-1 text-2xs sm:text-xs tabular-nums',
                      today ? 'bg-accent-strong text-on-accent font-semibold' : inMonth ? 'text-ink' : 'text-ink-faint')}>{format(d, 'd')}</span>
                  </div>
                  {/* Mobile: compact dots. sm+: labelled tags */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((e, i) => {
                      const c = categories.find((x) => x.id === e.categoryId);
                      return <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c?.color ?? '#94a3b8', opacity: e.projected ? 0.6 : 1 }} />;
                    })}
                  </div>
                  <div className="space-y-0.5 hidden sm:block">
                    {items.slice(0, 2).map((e, i) => {
                      const c = categories.find((x) => x.id === e.categoryId);
                      return (
                        <div key={i} className={cx('rounded-tag px-1 py-px text-3xs leading-4 truncate', e.projected && 'opacity-70')}
                          style={tagStyle(c?.color ?? '#94a3b8')}>
                          {c?.emoji ? c.emoji + ' ' : ''}{e.merchant}
                        </div>
                      );
                    })}
                    {items.length > 2 && <div className="text-3xs text-ink-muted px-1">+{items.length - 2} more</div>}
                  </div>
                  {items.length > 0 && (
                    <div className={cx('mt-0.5 text-3xs font-semibold tabular-nums truncate hidden sm:block', dayNet >= 0 ? 'text-income' : 'text-ink-muted')}>
                      {dayNet >= 0 ? '+' : '−'}{formatMoney(Math.abs(dayNet), cur, { compact: true })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right panel: selected day detail, or upcoming list */}
        <Card className="p-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
                  <ArrowLeft size={15} /> {format(parseISO(selected), 'EEE d MMM yyyy')}
                </button>
                <Button size="sm" onClick={() => setAdding(true)}><Plus size={14} /> Add</Button>
              </div>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-ink-muted">No transactions this day.</p>
              ) : (
                <>
                  {dayIncome > 0 && dayExpense > 0 ? (
                    // Both directions on this day → show In / Out / Net.
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 rounded-control bg-surface-2 border border-line p-2.5 text-center">
                        <div className="text-3xs text-ink-muted uppercase">In</div>
                        <div className="text-income font-semibold text-sm">{formatMoney(dayIncome, cur)}</div>
                      </div>
                      <div className="flex-1 rounded-control bg-surface-2 border border-line p-2.5 text-center">
                        <div className="text-3xs text-ink-muted uppercase">Out</div>
                        <div className="text-expense font-semibold text-sm">{formatMoney(dayExpense, cur)}</div>
                      </div>
                      <div className="flex-1 rounded-control bg-surface-2 border border-line p-2.5 text-center">
                        <div className="text-3xs text-ink-muted uppercase">Net</div>
                        <div className="font-semibold text-sm">{formatMoney(dayIncome - dayExpense, cur, { sign: true })}</div>
                      </div>
                    </div>
                  ) : (
                    // One-directional day → a single clear total (no redundant 0.00 / net).
                    <div className="rounded-control bg-surface-2 border border-line px-4 py-3 mb-3 flex items-center justify-between">
                      <span className="text-2xs text-ink-muted uppercase tracking-wider">{dayExpense > 0 ? 'Spent' : 'Received'}</span>
                      <span className={`font-bold ${dayExpense > 0 ? 'text-expense' : 'text-income'}`}>
                        {dayExpense > 0 ? '−' : '+'}{formatMoney(dayExpense > 0 ? dayExpense : dayIncome, cur)}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar">
                    {selectedItems.map((e, i) => {
                      const c = categories.find((x) => x.id === e.categoryId);
                      const editable = !e.projected && !!e.id;
                      const openEdit = () => { if (editable) setEditing(transactions.find((t) => t.id === e.id) ?? null); };
                      return (
                        <div key={i} onClick={openEdit}
                          role={editable ? 'button' : undefined} tabIndex={editable ? 0 : undefined}
                          onKeyDown={(ev) => { if (editable && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openEdit(); } }}
                          className={`flex items-center gap-3 rounded-control border border-line px-3 py-2.5 ${editable ? 'cursor-pointer hover:bg-hover transition' : ''}`}>
                          <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#94a3b8'} size={16} emoji={c?.emoji} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate flex items-center gap-1.5">
                              {e.merchant || c?.name}
                              {e.projected && <Badge tone="yellow" className="!text-3xs !leading-4">projected</Badge>}
                              {e.recurring && !e.projected && <span className="text-3xs text-goal">↻</span>}
                            </div>
                            <div className="text-xs text-ink-muted">
                              {c?.name}{showPayer && payerLabel(e.createdBy) ? ` · ${payerLabel(e.createdBy)}` : ''}
                            </div>
                          </div>
                          <div className={`text-sm font-semibold ${e.type === 'income' ? 'text-income' : ''}`}>
                            {e.type === 'income' ? '+' : '−'}{formatMoney(e.amount, cur)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h3 className="section-title mb-4">Upcoming <span className="text-ink-muted font-normal text-base">· next 90 days</span></h3>
              <div className="space-y-2 max-h-[520px] overflow-y-auto no-scrollbar">
                {upcoming.length === 0 && <p className="text-sm text-ink-muted">No recurring transactions scheduled. Add a bill or subscription and tick "Recurring" to see it here.</p>}
                {upcoming.map((u, i) => {
                  const c = categories.find((x) => x.id === u.base.categoryId);
                  return (
                    <motion.button key={i} onClick={() => { setMonth(startOfMonth(parseISO(u.date))); setSelected(u.date); }}
                      {...staggered(i, 0.02)}
                      className="w-full flex items-center gap-3 rounded-control border border-line hover:bg-hover px-3 py-2.5 text-left transition-colors">
                      <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#94a3b8'} size={16} emoji={c?.emoji} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.base.merchant}</div>
                        <div className="text-xs text-ink-muted">{format(parseISO(u.date), 'EEE d MMM')} · {u.base.frequency}</div>
                      </div>
                      <div className={`text-sm font-semibold ${u.base.type === 'income' ? 'text-income' : ''}`}>
                        {u.base.type === 'income' ? '+' : '−'}{formatMoney(u.amount, cur)}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      <TransactionModal open={adding} onClose={() => setAdding(false)} defaultDate={selected ?? undefined} />
      <TransactionModal open={!!editing} onClose={() => setEditing(null)} existing={editing ?? undefined} />
    </Page>
  );
}
