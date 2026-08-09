import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, LineChart, CalendarDays, FileBarChart, Settings, Sparkles,
} from 'lucide-react';
import { cx } from '@/lib/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/investments', label: 'Investments', icon: LineChart },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 p-4">
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

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/10 flex justify-around px-1 py-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)]">
      {NAV.slice(0, 5).map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end}
          className={({ isActive }) => cx('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px]', isActive ? 'text-white' : 'text-white/50')}>
          <n.icon size={20} /><span>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
