import { motion } from 'framer-motion';

const ACCENT = 'rgb(var(--accent))';
const DANGER = 'rgb(var(--expense))';

export function ProgressBar({ value, color = ACCENT, danger }: { value: number; color?: string; danger?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full rounded-full bg-active overflow-hidden" role="presentation">
      <motion.div className="h-full rounded-full" style={{ background: danger ? DANGER : color }}
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
    </div>
  );
}

export function ProgressRing({ value, size = 96, stroke = 8, color = ACCENT, label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--active)" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-lg font-semibold tabular-nums">{Math.round(pct)}%</div>
        {label && <div className="text-3xs text-ink-muted">{label}</div>}
      </div>
    </div>
  );
}
