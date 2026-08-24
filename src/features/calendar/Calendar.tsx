import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth,
  isSameDay, addMonths, parseISO,
} from 'date-fns';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { TransactionModal } from '@/components/TransactionModal';
import { Plus } from 'lucide-react';
import { upcomingOccurrences } from '@/lib/recurring';
import { formatMoney } from '@/lib/format';

const TODAY = new Date();

interface DayItem {
  key: string;                 // date yyyy-MM-dd
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
  const cur = settings.currency;
  const [month, setMonth] = useState(startOfMonth(TODAY));
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const showPayer = cloud && authed && members.length > 1;
  const payerLabel = (id?: string) => id === 'all' ? '👥 Both' : (members.find((m) => m.id === id)?.name ? `👤 ${members.find((m) => m.id === id)!.name}` : '');

  const upcoming = useMemo(() => upcomingOccurrences(transactions, 90, TODAY), [transactions]);

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
      add({ key: t.date, merchant: t.merchant, amount: t.amount, type: t.type, categoryId: t.categoryId, createdBy: t.createdBy, recurring: t.recurring, frequency: t.frequency });
    }
    for (const u of upcoming) {
      // only add a projected occurrence if there isn't already a real one that day for the same merchant
      const existing = map.get(u.date) ?? [];
      if (!existing.some((e) => e.merchant === u.base.merchant)) {
        add({ key: u.date, merchant: u.base.merchant, amount: u.amount, type: u.base.type, categoryId: u.base.categoryId, projected: true, recurring: true, frequency: u.base.frequency });
      }
    }
    return map;
  }, [transactions, upcoming]);

  const selectedItems = selected ? (itemsByDate.get(selected) ?? []) : [];
  const dayIncome = selectedItems.filter((i) => i.type === 'income').reduce((a, i) => a + i.amount, 0);
  const dayExpense = selectedItems.filter((i) => i.type === 'expense').reduce((a, i) => a + i.amount, 0);

  return (
    <Page>
      <PageHeader title="Calendar" subtitle="Tap a day to see its transactions · bills & subscriptions projected ahead" />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{format(month, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={() => setMonth((m) => addMonths(m, -1))} className="rounded-lg bg-white/5 hover:bg-white/10 p-1.5"><ChevronLeft size={16} /></button>
              <button onClick={() => setMonth(startOfMonth(TODAY))} className="rounded-lg bg-white/5 hover:bg-white/10 px-3 text-xs">Today</button>
              <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-lg bg-white/5 hover:bg-white/10 p-1.5"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-white/40 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const items = itemsByDate.get(key) ?? [];
              const inMonth = isSameMonth(d, month);
              const today = isSameDay(d, TODAY);
              const isSel = selected === key;
              const dayNet = items.reduce((a, i) => a + (i.type === 'income' ? i.amount : -i.amount), 0);
              return (
                <button key={key} onClick={() => setSelected(key)}
                  className={`min-h-[52px] sm:min-h-[74px] rounded-lg p-1 sm:p-1.5 border text-left transition ${isSel ? 'border-blue-400 bg-blue-500/15' : today ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/5'} ${inMonth ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'opacity-30'}`}>
                  <div className={`text-[11px] sm:text-xs mb-1 ${today ? 'text-blue-400 font-bold' : 'text-white/50'}`}>{format(d, 'd')}</div>
                  {/* Mobile: compact dots. sm+: labelled chips */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((e, i) => {
                      const c = categories.find((x) => x.id === e.categoryId);
                      return <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c?.color ?? '#888', opacity: e.projected ? 0.6 : 1 }} />;
                    })}
                  </div>
                  <div className="space-y-0.5 hidden sm:block">
                    {items.slice(0, 2).map((e, i) => {
                      const c = categories.find((x) => x.id === e.categoryId);
                      return (
                        <div key={i} className="flex items-center gap-1 rounded px-1 py-0.5 text-[9px] truncate"
                          style={{ background: `${c?.color ?? '#888'}22`, color: c?.color ?? '#aaa', opacity: e.projected ? 0.7 : 1 }}>
                          <span className="truncate">{c?.emoji ? c.emoji + ' ' : ''}{e.merchant}</span>
                        </div>
                      );
                    })}
                    {items.length > 2 && <div className="text-[9px] text-white/40 px-1">+{items.length - 2} more</div>}
                  </div>
                  {items.length > 0 && (
                    <div className={`mt-0.5 text-[9px] font-semibold truncate hidden sm:block ${dayNet >= 0 ? 'text-income' : 'text-white/50'}`}>
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
                <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
                  <ArrowLeft size={15} /> {format(parseISO(selected), 'EEE d MMM yyyy')}
                </button>
                <Button onClick={() => setAdding(true)} className="!px-2.5 !py-1.5"><Plus size={14} /> Add</Button>
              </div>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-white/40">No transactions this day.</p>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 rounded-xl bg-white/[0.03] p-2.5 text-center">
                      <div className="text-[10px] text-white/40 uppercase">In</div>
                      <div className="text-income font-semibold text-sm">{formatMoney(dayIncome, cur)}</div>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/[0.03] p-2.5 text-center">
                      <div className="text-[10px] text-white/40 uppercase">Out</div>
                      <div className="text-expense font-semibold text-sm">{formatMoney(dayExpense, cur)}</div>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/[0.03] p-2.5 text-center">
                      <div className="text-[10px] text-white/40 uppercase">Net</div>
                      <div className="font-semibold text-sm">{formatMoney(dayIncome - dayExpense, cur, { sign: true })}</div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar">
                    {selectedItems.map((e, i) => {
                      const c = categories.find((x) => x.id === e.categoryId);
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                          <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#888'} size={16} emoji={c?.emoji} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate flex items-center gap-1.5">
                              {e.merchant || c?.name}
                              {e.projected && <span className="text-[9px] text-invest border border-invest/30 rounded px-1">projected</span>}
                              {e.recurring && !e.projected && <span className="text-[9px] text-goal">↻</span>}
                            </div>
                            <div className="text-xs text-white/40">
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
              <h3 className="font-semibold mb-4">Upcoming (next 90 days)</h3>
              <div className="space-y-2 max-h-[520px] overflow-y-auto no-scrollbar">
                {upcoming.length === 0 && <p className="text-sm text-white/40">No recurring transactions scheduled. Add a bill or subscription and tick "Recurring" to see it here.</p>}
                {upcoming.map((u, i) => {
                  const c = categories.find((x) => x.id === u.base.categoryId);
                  return (
                    <motion.button key={i} onClick={() => { setMonth(startOfMonth(parseISO(u.date))); setSelected(u.date); }}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                      className="w-full flex items-center gap-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2.5 text-left">
                      <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#888'} size={16} emoji={c?.emoji} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.base.merchant}</div>
                        <div className="text-xs text-white/40">{format(parseISO(u.date), 'EEE d MMM')} · {u.base.frequency}</div>
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
    </Page>
  );
}
