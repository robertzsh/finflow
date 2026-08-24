import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Card } from './Card';
import { cx } from '@/lib/format';

interface Props {
  label: string;
  value: string;
  icon: keyof typeof Icons;
  accent: 'income' | 'expense' | 'savings' | 'invest' | 'goal';
  delta?: string;
  deltaUp?: boolean;
  delay?: number;
}

const ACCENT: Record<Props['accent'], string> = {
  income: '#10b981', expense: '#ef4444', savings: '#3b82f6', invest: '#eab308', goal: '#a855f7',
};

export function StatCard({ label, value, icon, accent, delta, deltaUp, delay = 0 }: Props) {
  const Icon = (Icons[icon] ?? Icons.Circle) as React.ComponentType<{ size?: number; color?: string }>;
  const color = ACCENT[accent];
  return (
    <Card hover delay={delay} className="p-4 sm:p-5 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-30" style={{ background: color }} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs uppercase tracking-wider text-white/50 truncate">{label}</p>
          <motion.p
            key={value}
            initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}
            className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tabular-nums truncate"
          >{value}</motion.p>
          {delta && (
            <p className={cx('mt-1 text-[11px] sm:text-xs font-medium flex items-center gap-1 truncate', deltaUp ? 'text-income' : 'text-expense')}>
              {deltaUp ? <Icons.ArrowUpRight size={13} className="shrink-0" /> : <Icons.ArrowDownRight size={13} className="shrink-0" />}<span className="truncate">{delta}</span>
            </p>
          )}
        </div>
        <div className="rounded-xl p-2 sm:p-2.5 shrink-0" style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </Card>
  );
}
