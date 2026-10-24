import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Aura } from '@/components/ui/Aura';
import { Sparkle } from '@/components/ui/Sparkle';
import { cx } from '@/lib/format';
import { fadeUp } from '@/lib/motion';
import { navFor } from './nav';

/** Full-bleed aura banner under the top bar (the Notion page cover). Rendered once by
 *  the app shell; each page's <PageIcon> overlaps its bottom edge. */
export function PageCover() {
  return <Aura className="-mx-4 sm:-mx-6 h-[84px] sm:h-[116px] lg:h-[148px]" />;
}

/** The page's icon tile (from the route), overlapping the cover like a Notion page icon. */
export function PageIcon({ icon }: { icon?: LucideIcon }) {
  const Icon = icon ?? navFor(useLocation().pathname).icon;
  return (
    <span className="relative z-[1] -mt-8 sm:-mt-10 mb-3 sm:mb-4 grid h-14 w-14 sm:h-[72px] sm:w-[72px] place-items-center rounded-[12px] sm:rounded-[14px] bg-accent text-on-accent shadow-card ring-4 ring-canvas">
      <Icon className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={1.9} />
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <motion.div {...fadeUp} className="mb-5 sm:mb-7">
      <PageIcon />
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-[1.75rem] sm:text-[2.25rem] font-bold leading-[1.1]">
            <span className="truncate">{title}</span>
            <Sparkle size={20} className="text-ink/80 sm:scale-125 sm:ml-1" />
          </h1>
          {subtitle && <p className="text-sm text-ink-muted mt-1.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    </motion.div>
  );
}

/** The reference's highlighted section heading (pink text on a pink block). */
export function SectionHeading({ children, icon, className }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <h2 className={cx('inline-flex items-center gap-2 rounded-tag bg-accent-soft px-2 py-0.5 font-display text-lg sm:text-xl font-medium leading-snug text-accent-ink', className)}>
      {icon}{children}
    </h2>
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
