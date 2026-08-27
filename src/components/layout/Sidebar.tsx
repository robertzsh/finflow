import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, Target, LineChart, CalendarDays, FileBarChart, Settings, Sparkles, MoreHorizontal,
} from 'lucide-react';
import { cx } from '@/lib/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/investments', label: 'Investments', icon: LineChart },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 p-4 chrome-glass border-r border-white/10">
      <div className="flex items-center gap-2.5 px-3 py-4">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 p-2 shadow-glow">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <div className="font-extrabold tracking-tight leading-none">FinFlow</div>
          <div className="text-[10px] text-white/40 tracking-wider uppercase">Money in motion</div>
        </div>
      </div>
      <nav className="mt-4 flex-1 space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cx(
              'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive ? 'text-white' : 'text-white/55 hover:text-white hover:bg-white/5',
            )}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-white/10 border border-white/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <n.icon size={18} className="relative z-10" />
                <span className="relative z-10">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="glass rounded-xl p-3 text-xs text-white/50">
        <div className="font-semibold text-white/70 mb-1">Quick add</div>
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">⌘K</kbd> anywhere
      </div>
    </aside>
  );
}

const MOBILE_MAIN = NAV.slice(0, 4);          // Dashboard, Transactions, Budgets, Goals
const MOBILE_MORE = NAV.slice(4);             // Investments, Calendar, Reports, Settings

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const moreActive = MOBILE_MORE.some((n) => n.to === location.pathname);

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.div className="lg:hidden fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="glass absolute inset-x-0 bottom-0 rounded-t-3xl p-3 pb-[calc(env(safe-area-inset-bottom)+72px)] border-t border-white/10">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_MORE.map((n) => (
                  <NavLink key={n.to} to={n.to} onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium', isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-white/70')}>
                    <n.icon size={20} /> {n.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 chrome-glass border-t border-white/10 flex justify-around px-1 py-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)]">
        {MOBILE_MAIN.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMoreOpen(false)}
            className={({ isActive }) => cx('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px]', isActive ? 'text-white' : 'text-white/50')}>
            <n.icon size={20} /><span>{n.label}</span>
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen((v) => !v)}
          className={cx('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px]', moreOpen || moreActive ? 'text-white' : 'text-white/50')}>
          <MoreHorizontal size={20} /><span>More</span>
        </button>
      </nav>
    </>
  );
}
