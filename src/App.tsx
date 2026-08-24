import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { CommandPalette } from '@/components/CommandPalette';
import { TransactionModal } from '@/components/TransactionModal';
import { LockScreen } from '@/components/LockScreen';
import { Onboarding } from '@/components/Onboarding';
import { Auth } from '@/components/Auth';
import { useHotkey } from '@/hooks/useHotkeys';
import { useIdleLock } from '@/hooks/useIdleLock';
import { setInsightCurrency } from '@/lib/insights';
import { currencySymbol } from '@/lib/format';

import Dashboard from '@/features/dashboard/Dashboard';
import Transactions from '@/features/transactions/Transactions';
import Budgets from '@/features/budgets/Budgets';
import Goals from '@/features/goals/Goals';
import Investments from '@/features/investments/Investments';
import Calendar from '@/features/calendar/Calendar';
import Reports from '@/features/reports/Reports';
import SettingsPage from '@/features/settings/Settings';

export default function App() {
  const { ready, init, locked, settings, cloud, authed, authReady } = useStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { setInsightCurrency(currencySymbol(settings.currency)); }, [settings.currency]);

  // Refresh exchange rates at most once every 12h.
  const refreshRates = useStore((s) => s.refreshRates);
  useEffect(() => {
    if (!ready) return;
    try {
      const last = Number(localStorage.getItem('finflow-rates-ts') || 0);
      if (Date.now() - last > 12 * 60 * 60 * 1000) {
        refreshRates().then((ok) => { if (ok) localStorage.setItem('finflow-rates-ts', String(Date.now())); });
      }
    } catch { /* ignore */ }
  }, [ready, refreshRates]);

  useHotkey('mod+k', (e) => { e.preventDefault(); setPaletteOpen((v) => !v); }, []);
  useHotkey('mod+n', (e) => { e.preventDefault(); setQuickAdd(true); }, []);
  useIdleLock();

  // Cloud mode: show a login screen until signed in.
  if (cloud) {
    if (!authReady) {
      return <div className="app-bg min-h-[100dvh] flex items-center justify-center"><div className="animate-pulse text-white/40">Loading FinFlow…</div></div>;
    }
    if (!authed) return <div className="app-bg min-h-[100dvh]"><Auth /></div>;
  }

  if (!ready) {
    return (
      <div className="app-bg min-h-[100dvh] flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading FinFlow…</div>
      </div>
    );
  }

  // Onboarding only applies to local mode; PIN lock applies in both modes.
  if (!cloud && !settings.onboarded) return <div className="app-bg min-h-[100dvh]"><Onboarding /></div>;
  if (locked && settings.pinEnabled) return <div className="app-bg min-h-[100dvh]"><LockScreen /></div>;

  return (
    <div className="app-bg min-h-[100dvh] flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 sm:px-6 pb-24 lg:pb-8">
        <Topbar onQuickAdd={() => setQuickAdd(true)} onSearch={() => setPaletteOpen(true)} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Dashboard onQuickAdd={() => setQuickAdd(true)} />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AnimatePresence>
      </main>
      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onQuickAdd={() => { setPaletteOpen(false); setQuickAdd(true); }} />
      <TransactionModal open={quickAdd} onClose={() => setQuickAdd(false)} />
    </div>
  );
}
