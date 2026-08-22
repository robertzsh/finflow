import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth,
  isSameDay, addMonths, parseISO,
} from 'date-fns';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { upcomingOccurrences } from '@/lib/recurring';
import { formatMoney } from '@/lib/format';

const TODAY = new Date();

export default function Calendar() {
  const { transactions, categories, settings } = useStore();
  const cur = settings.currency;
  const [month, setMonth] = useState(startOfMonth(TODAY));

  const upcoming = useMemo(() => upcomingOccurrences(transactions, 60, TODAY), [transactions]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  // map upcoming + actual recurring transactions to date -> events
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { merchant: string; amount: number; type: string; categoryId: string }[]>();
    for (const u of upcoming) {
      const arr = map.get(u.date) ?? [];
      arr.push({ merchant: u.base.merchant, amount: u.amount, type: u.base.type, categoryId: u.base.categoryId });
      map.set(u.date, arr);
    }
    // include historical recurring in current month
    for (const t of transactions.filter((x) => x.recurring)) {
      if (!isSameMonth(parseISO(t.date), month)) continue;
      const arr = map.get(t.date) ?? [];
      if (!arr.some((e) => e.merchant === t.merchant)) {
        arr.push({ merchant: t.merchant, amount: t.amount, type: t.type, categoryId: t.categoryId });
        map.set(t.date, arr);
      }
    }
    return map;
  }, [upcoming, transactions, month]);

  return (
    <Page>
      <PageHeader title="Calendar" subtitle="Bills, subscriptions, salary and recurring expenses" />

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
              const events = eventsByDate.get(key) ?? [];
              const inMonth = isSameMonth(d, month);
              const today = isSameDay(d, TODAY);
              return (
                <div key={key} className={`min-h-[70px] rounded-lg p-1.5 border text-left ${today ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/5'} ${inMonth ? 'bg-white/[0.02]' : 'opacity-30'}`}>
                  <div className={`text-xs mb-1 ${today ? 'text-blue-400 font-bold' : 'text-white/50'}`}>{format(d, 'd')}</div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((e, i) => {
                      const c = categories.find((x) => x.id === e.categoryId);
                      return (
                        <div key={i} className="flex items-center gap-1 rounded px-1 py-0.5 text-[9px] truncate"
                          style={{ background: `${c?.color ?? '#888'}22`, color: c?.color ?? '#aaa' }}>
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: c?.color }} />
                          <span className="truncate">{e.merchant}</span>
                        </div>
                      );
                    })}
                    {events.length > 3 && <div className="text-[9px] text-white/40 px-1">+{events.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Upcoming (next 60 days)</h3>
          <div className="space-y-2 max-h-[520px] overflow-y-auto no-scrollbar">
            {upcoming.length === 0 && <p className="text-sm text-white/40">No recurring transactions scheduled.</p>}
            {upcoming.map((u, i) => {
              const c = categories.find((x) => x.id === u.base.categoryId);
              return (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#888'} size={16} emoji={c?.emoji} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.base.merchant}</div>
                    <div className="text-xs text-white/40">{format(parseISO(u.date), 'EEE d MMM')} · {u.base.frequency}</div>
                  </div>
                  <div className={`text-sm font-semibold ${u.base.type === 'income' ? 'text-income' : ''}`}>
                    {u.base.type === 'income' ? '+' : '−'}{formatMoney(u.amount, cur)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>
    </Page>
  );
}
