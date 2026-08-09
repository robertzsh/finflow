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
    <Card hover delay={delay} className="p-5 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-30" style={{ background: color }} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50 dark:text-white/50">{label}</p>
          <motion.p
            key={value}
            initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}
            className="mt-2 text-2xl font-bold tabular-nums"
          >{value}</motion.p>
          {delta && (
            <p className={cx('mt-1 text-xs font-medium flex items-center gap-1', deltaUp ? 'text-income' : 'text-expense')}>
              {deltaUp ? <Icons.ArrowUpRight size={13} /> : <Icons.ArrowDownRight size={13} />}{delta}
            </p>
          )}
        </div>
        <div className="rounded-xl p-2.5" style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </Card>
  );
}
