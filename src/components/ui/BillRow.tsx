import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatMoney, cx } from '@/lib/format';
import type { CurrencyCode } from '@/types';
import { format, parseISO } from 'date-fns';

export type BillStatus = 'paid' | 'due-soon' | 'upcoming' | 'overdue';

/** Status chip styles — calm by default; amber for "due soon"; green for paid.
 *  Red is reserved for genuinely overdue, per the "don't over-alarm" rule. */
const CHIP: Record<BillStatus, { label: (d: string, n: number) => string; cls: string }> = {
  paid:       { label: () => 'Paid',                     cls: 'bg-income/12 text-income' },
  'due-soon': { label: (_d, n) => n <= 0 ? 'Due today' : `Due in ${n}d`, cls: 'bg-amber-400/15 text-amber-300' },
  upcoming:   { label: (d) => d,                         cls: 'bg-white/8 text-white/55' },
  overdue:    { label: () => 'Overdue',                  cls: 'bg-expense/15 text-expense' },
};

export function BillRow({ icon, color, emoji, name, amount, currency, date, status, who }: {
  icon: string; color: string; emoji?: string; name: string; amount: number; currency: CurrencyCode; date: string; status: BillStatus;
  who?: { name: string; color: string };
}) {
  const days = Math.round((parseISO(date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const chip = CHIP[status];
  return (
    <div className="flex items-center gap-3 py-2">
      <CategoryIcon icon={icon} color={color} emoji={emoji} size={16} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{name}</span>
          {who && (
            <span className="shrink-0 w-4 h-4 rounded-full grid place-items-center text-white text-[9px] font-bold" style={{ background: who.color }} title={who.name}>
              {who.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="text-[11px] text-white/40">{format(parseISO(date), 'EEE d MMM')}</div>
      </div>
      <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', chip.cls)}>
        {chip.label(format(parseISO(date), 'd MMM'), days)}
      </span>
      <span className="tabular-nums font-semibold text-sm w-24 text-right shrink-0">{formatMoney(amount, currency)}</span>
    </div>
  );
}
