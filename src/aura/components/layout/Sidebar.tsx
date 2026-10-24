import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MoreHorizontal, Plus } from 'lucide-react';
import { cx } from '@/lib/format';
import { spring } from '@/aura/lib/motion';
import { useStore } from '@/store/useStore';
import { NAV } from './nav';

export function Sidebar({ onQuickAdd }: { onQuickAdd: () => void }) {
  const name = useStore((s) => s.settings.name);
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-surface-2 border-r border-line px-2 pt-3 pb-3">
      <div className="flex items-center gap-2.5 px-2 py-1.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-control bg-accent text-on-accent shadow-card">
          <Sparkles size={15} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <div className="font-display text-[15px] font-semibold leading-tight">FinFlow</div>
          <div className="text-2xs text-ink-muted truncate">{name ? `${name}’s money` : 'Money in motion'}</div>
        </div>
      </div>

      <button onClick={onQuickAdd}
        className="mt-3 flex h-8 items-center gap-2.5 rounded-control px-2 text-sm text-ink-muted transition hover:bg-hover hover:text-ink">
        <Plus size={17} /> New transaction
        <span className="kbd ml-auto">⌘N</span>
      </button>

      <div className="mt-5 mb-1 px-2 text-2xs font-medium text-ink-muted">Pages</div>
      <nav className="flex-1 space-y-px">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cx(
              'relative flex h-8 items-center gap-2.5 rounded-control px-2 text-sm transition-colors',
              isActive ? 'text-accent-ink font-medium' : 'text-ink-muted hover:text-ink hover:bg-hover',
            )}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-control bg-accent-soft" transition={spring.nav} />}
                <n.icon size={17} className="relative z-10 shrink-0" />
                <span className="relative z-10 truncate">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pt-3 text-2xs text-ink-muted">
        Press <span className="kbd">⌘K</span> to search or jump anywhere
      </div>
    </aside>
  );
}

const MOBILE_MAIN = NAV.slice(0, 4);          // Dashboard, Transactions, Goals, Budgets
const MOBILE_MORE = NAV.slice(4);             // Economii, Investments, Calendar, Reports, Settings

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const moreActive = MOBILE_MORE.some((n) => n.to === location.pathname);

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.div className="lg:hidden fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-scrim" onClick={() => setMoreOpen(false)} />
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={spring.sheet}
              className="absolute inset-x-0 bottom-0 rounded-t-sheet bg-overlay shadow-popover p-3 pb-[calc(env(safe-area-inset-bottom)+72px)]">
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-strong" />
              <div className="grid grid-cols-2 gap-1.5">
                {MOBILE_MORE.map((n) => (
                  <NavLink key={n.to} to={n.to} onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => cx('flex items-center gap-3 rounded-control px-3.5 py-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent-soft text-accent-ink' : 'bg-fill text-ink hover:bg-hover')}>
                    <n.icon size={19} /> {n.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-md border-t border-line flex justify-around px-1 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {MOBILE_MAIN.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMoreOpen(false)}
            className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 rounded-control px-3 py-1.5 text-3xs font-medium transition-colors', isActive ? 'text-accent-ink' : 'text-ink-muted')}>
            {({ isActive }) => (
              <>
                <n.icon size={20} strokeWidth={isActive ? 2.2 : 1.9} /><span>{n.label}</span>
                {isActive && <span aria-hidden className="absolute -top-1.5 h-0.5 w-5 rounded-full bg-accent" />}
              </>
            )}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen}
          className={cx('relative flex flex-col items-center gap-0.5 rounded-control px-3 py-1.5 text-3xs font-medium transition-colors', moreOpen || moreActive ? 'text-accent-ink' : 'text-ink-muted')}>
          <MoreHorizontal size={20} /><span>More</span>
          {moreActive && !moreOpen && <span aria-hidden className="absolute -top-1.5 h-0.5 w-5 rounded-full bg-accent" />}
        </button>
      </nav>
    </>
  );
}
