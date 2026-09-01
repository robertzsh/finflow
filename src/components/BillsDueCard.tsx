import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { parseAmount, formatMoney } from '@/lib/format';
import { format, parseISO } from 'date-fns';

/** Variable-amount recurring bills whose date has passed: the user confirms the
 *  amount (or skips) before they post as real transactions. Fixed bills auto-post
 *  silently elsewhere; only variable ones surface here. */
export function BillsDueCard() {
  const pending = useStore((s) => s.pendingRecurring);
  const confirmRecurring = useStore((s) => s.confirmRecurring);
  const skipRecurring = useStore((s) => s.skipRecurring);
  const categories = useStore((s) => s.categories);
  const cur = useStore((s) => s.settings.currency);
  // local editable amount per occurrence, seeded with the template's amount
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  if (pending.length === 0) return null;

  return (
    <Card className="p-5 mt-4 border-amber-400/30" delay={0.1}>
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock size={18} className="text-amber-300" />
        <h3 className="font-bold">Bills due — confirm the amount</h3>
      </div>
      <p className="text-xs text-white/50 mb-3">These recurring bills came due and their amount varies. Confirm each to log it, or skip this time.</p>
      <div className="space-y-2">
        {pending.map((d) => {
          const c = categories.find((x) => x.id === d.base.categoryId);
          const val = amounts[d.recurrenceKey] ?? String(d.amount);
          const parsed = parseAmount(val);
          return (
            <div key={d.recurrenceKey} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2.5">
              <span className="flex-1 min-w-[8rem] truncate text-sm">
                {c?.emoji ? `${c.emoji} ` : ''}{d.base.merchant || c?.name}
                <span className="block text-[11px] text-white/40">due {format(parseISO(d.date), 'd MMM yyyy')}</span>
              </span>
              <div className="w-28">
                <Input aria-label={`Amount for ${d.base.merchant || c?.name}`} type="text" inputMode="decimal"
                  value={val} onChange={(e) => setAmounts((a) => ({ ...a, [d.recurrenceKey]: e.target.value }))}
                  placeholder="0,00" />
              </div>
              <Button className="!py-2" disabled={!(parsed > 0)} onClick={() => confirmRecurring(d.recurrenceKey, parsed)}>
                Confirm {parsed > 0 ? formatMoney(parsed, cur) : ''}
              </Button>
              <Button variant="ghost" className="!py-2" onClick={() => skipRecurring(d.recurrenceKey)}>Skip</Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
