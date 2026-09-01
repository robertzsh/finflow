import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from './Card';
import { getIcon } from '@/lib/icons';
import { cx, accentHex } from '@/lib/format';
import { useStore } from '@/store/useStore';

interface Props {
  label: string;
  value: string;
  icon: string;
  accent: 'income' | 'expense' | 'savings' | 'invest' | 'goal';
  delta?: string;         // trend chip (coloured, with arrow)
  deltaUp?: boolean;
  note?: string;          // neutral contextual label (no colour/arrow)
  emphasis?: boolean;     // primary metric → larger number
  delay?: number;
}

export function StatCard({ label, value, icon, accent, delta, deltaUp, note, emphasis, delay = 0 }: Props) {
  const theme = useStore((s) => s.settings.theme);
  const Icon = getIcon(icon);
  const color = accentHex(accent, theme);
  return (
    <Card hover delay={delay} className="p-4 sm:p-5 relative overflow-hidden">
      {/* slim accent rail instead of a decorative blur glow */}
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r" style={{ background: color, opacity: 0.75 }} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/45 font-medium truncate">{label}</p>
          <motion.p
            key={value}
            initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
            className={cx(
              'mt-2 font-bold tabular-nums tracking-tight leading-none truncate',
              emphasis ? 'text-[1.6rem] sm:text-[2rem]' : 'text-xl sm:text-2xl',
            )}
          >{value}</motion.p>
          {delta ? (
            <span className={cx(
              'mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium max-w-full',
              deltaUp ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense',
            )}>
              {deltaUp ? <ArrowUpRight size={12} className="shrink-0" /> : <ArrowDownRight size={12} className="shrink-0" />}
              <span className="truncate">{delta}</span>
            </span>
          ) : note ? (
            <p className="mt-2.5 text-[11px] sm:text-xs text-white/45 truncate">{note}</p>
          ) : null}
        </div>
        <div className="rounded-xl p-2 shrink-0" style={{ background: `${color}18` }}>
          <Icon size={17} color={color} strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
}
