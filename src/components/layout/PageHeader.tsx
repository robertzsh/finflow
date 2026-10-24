import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-end justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function SectionCardHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="section-title truncate">{title}</h3>
        {hint && <p className="section-hint">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
