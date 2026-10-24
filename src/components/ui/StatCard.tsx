import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { getIcon } from '@/lib/icons';
import { cx, accentColor } from '@/lib/format';

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
  const Icon = getIcon(icon);
  return (
    <Card hover delay={delay} className="p-4 sm:p-5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-control" style={{ background: accentColor(accent, 0.12), color: accentColor(accent) }}>
          <Icon size={14} strokeWidth={2.2} />
        </span>
        <p className="metric-label truncate">{label}</p>
      </div>
      <motion.p
        key={value}
        initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
        className={cx(
          'metric-value font-display mt-3 font-semibold leading-none truncate',
          emphasis ? 'text-[1.7rem] sm:text-[2.1rem]' : 'text-[1.35rem] sm:text-[1.6rem]',
        )}
      >{value}</motion.p>
      {delta ? (
        <Badge tone={deltaUp ? 'green' : 'red'} className="mt-3">
          {deltaUp ? <ArrowUpRight size={12} className="shrink-0" /> : <ArrowDownRight size={12} className="shrink-0" />}
          <span className="truncate">{delta}</span>
        </Badge>
      ) : note ? (
        <p className="mt-3 text-xs text-ink-muted truncate">{note}</p>
      ) : null}
    </Card>
  );
}
