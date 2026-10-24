import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Aura } from '@/aura/components/ui/Aura';
import { Sparkle } from '@/aura/components/ui/Sparkle';
import { cx } from '@/lib/format';
import { ease } from '@/aura/lib/motion';

/** Full-screen frame for sign-in, onboarding and the PIN lock: an aura cover across
 *  the top, a drifting orb, and one centred card. */
export function GateScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center p-5 sm:p-6 overflow-hidden">
      <Aura className="absolute inset-x-0 top-0 h-[36vh] min-h-[200px]" />
      <Aura variant="orb" drift className="absolute -right-28 -bottom-28 h-96 w-96 opacity-80" />
      <Sparkle filled size={16} className="absolute left-[12%] top-[30vh] text-sparkle hidden sm:block" />
      <Sparkle filled size={10} className="absolute right-[18%] top-[12vh] text-sparkle/80" />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
        className={cx('card relative w-full max-w-md p-7 sm:p-8 shadow-lift', className)}>
        {children}
      </motion.div>
    </div>
  );
}

/** The FinFlow wordmark: raspberry tile + serif name. */
export function BrandMark({ tagline }: { tagline?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-accent text-on-accent shadow-card"><Sparkles size={18} /></span>
      <div>
        <div className="font-display text-lg font-semibold leading-none">FinFlow</div>
        {tagline && <div className="text-2xs text-ink-muted mt-1">{tagline}</div>}
      </div>
    </div>
  );
}
