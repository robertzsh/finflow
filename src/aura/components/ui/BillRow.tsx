import { Check } from 'lucide-react';
import { CategoryIcon } from '@/aura/components/ui/CategoryIcon';
import { Badge, type TagTone } from '@/aura/components/ui/Badge';
import { formatMoney, cx } from '@/lib/format';
import type { CurrencyCode } from '@/types';
import { format, parseISO } from 'date-fns';

export type BillStatus = 'paid' | 'due-soon' | 'upcoming' | 'overdue';

/** Status tags — calm by default; yellow for "due soon"; green for paid.
 *  Red is reserved for genuinely overdue, per the "don't over-alarm" rule. */
const CHIP: Record<BillStatus, { label: (d: string, n: number) => string; tone: TagTone }> = {
  paid:       { label: () => 'Paid',                     tone: 'green' },
  'due-soon': { label: (_d, n) => n <= 0 ? 'Due today' : `Due in ${n}d`, tone: 'yellow' },
  upcoming:   { label: (d) => d,                         tone: 'gray' },
  overdue:    { label: () => 'Overdue',                  tone: 'red' },
};

export function BillRow({ icon, color, emoji, name, amount, currency, date, status, who, orig, onEdit, onMarkPaid }: {
  icon: string; color: string; emoji?: string; name: string; amount: number; currency: CurrencyCode; date: string; status: BillStatus;
  who?: { name: string; color: string };
  orig?: string; // e.g. "420 €" — shown as a caption when the bill is in a foreign currency
  onEdit?: () => void;      // click the row to open/edit the underlying bill
  onMarkPaid?: () => void;  // quick action to log this occurrence as paid
}) {
  const days = Math.round((parseISO(date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const chip = CHIP[status];
  return (
    <div
      className={cx('group flex items-center gap-3 py-2 -mx-2 px-2 rounded-control', onEdit && 'cursor-pointer hover:bg-hover')}
      onClick={onEdit} role={onEdit ? 'button' : undefined} tabIndex={onEdit ? 0 : undefined}
      onKeyDown={onEdit ? (e) => { if (e.key === 'Enter') onEdit(); } : undefined}
    >
      <CategoryIcon icon={icon} color={color} emoji={emoji} size={16} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{name}</span>
          {who && (
            <span className="shrink-0 w-4 h-4 rounded-full grid place-items-center text-on-color text-3xs font-bold" style={{ background: who.color }} title={who.name}>
              {who.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="text-2xs text-ink-muted">{format(parseISO(date), 'EEE d MMM')}</div>
      </div>
      {onMarkPaid && status !== 'paid' && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkPaid(); }}
          className="shrink-0 hidden group-hover:inline-flex sm:inline-flex items-center gap-1 rounded-tag border border-line-strong px-1.5 py-px text-xs font-medium text-ink-muted hover:text-income hover:border-income/40 hover:bg-income/10 transition"
          aria-label={`Mark ${name} as paid`}
        ><Check size={12} /> Mark paid</button>
      )}
      <Badge tone={chip.tone} className="shrink-0">{chip.label(format(parseISO(date), 'd MMM'), days)}</Badge>
      <div className="w-24 text-right shrink-0">
        <div className="tabular-nums font-semibold text-sm">{formatMoney(amount, currency)}</div>
        {orig && <div className="text-3xs text-ink-muted tabular-nums">{orig}</div>}
      </div>
    </div>
  );
}
