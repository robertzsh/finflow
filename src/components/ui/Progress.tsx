import { motion } from 'framer-motion';

export function ProgressBar({ value, color = '#3b82f6', danger }: { value: number; color?: string; danger?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const c = danger ? '#ef4444' : color;
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <motion.div className="h-full rounded-full" style={{ background: c }}
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
    </div>
  );
}

export function ProgressRing({ value, size = 96, stroke = 8, color = '#a855f7', label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold tabular-nums">{Math.round(pct)}%</div>
        {label && <div className="text-[10px] text-white/50">{label}</div>}
      </div>
    </div>
  );
}
