import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PageCover } from '@/components/layout/PageHeader';
import { Aura } from '@/components/ui/Aura';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { CommandPalette } from '@/components/CommandPalette';
import { TransactionModal } from '@/components/TransactionModal';
import { LockScreen } from '@/components/LockScreen';
import { Onboarding } from '@/components/Onboarding';
import { Auth } from '@/components/Auth';
import { InstallPrompt } from '@/components/InstallPrompt';
import { UpdateToast } from '@/components/UpdateToast';
import { useHotkey } from '@/hooks/useHotkeys';
import { useIdleLock } from '@/hooks/useIdleLock';
import { setInsightCurrency } from '@/lib/insights';
import { currencySymbol } from '@/lib/format';

// Route pages are lazy-loaded so each one is its own chunk — the initial load only
// pulls the dashboard, not every screen (and their charts) up front.
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'));
const Transactions = lazy(() => import('@/features/transactions/Transactions'));
const Goals = lazy(() => import('@/features/goals/Goals'));
const Savings = lazy(() => import('@/features/savings/Savings'));
const Budgets = lazy(() => import('@/features/budgets/Budgets'));
const Investments = lazy(() => import('@/features/investments/Investments'));
const Calendar = lazy(() => import('@/features/calendar/Calendar'));
const Reports = lazy(() => import('@/features/reports/Reports'));
const SettingsPage = lazy(() => import('@/features/settings/Settings'));

function PageLoader() {
  return <PageSkeleton />;
}

/** Boot splash: the aura orb with the FinFlow mark while data loads. */
function Splash() {
  return (
    <div className="app-bg min-h-[100dvh] flex items-center justify-center" role="status">
      <div className="relative grid h-40 w-40 place-items-center">
        <Aura variant="orb" drift className="absolute inset-0" />
        <span className="relative grid h-12 w-12 place-items-center rounded-[12px] bg-accent text-on-accent shadow-card animate-pulse">
          <Sparkles size={22} />
        </span>
      </div>
      <span className="sr-only">Loading FinFlow…</span>
    </div>
  );
}

export default function App() {
  const { ready, init, locked, settings, cloud, authed, authReady } = useStore();
  const privacy = useStore((s) => s.privacy);
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

  // Once data is loaded, auto-post any recurring bills whose date has passed
  // (and queue variable-amount ones for confirmation). Re-runs when the tx set changes.
  const runRecurringPosting = useStore((s) => s.runRecurringPosting);
  const txCount = useStore((s) => s.transactions.length);
  useEffect(() => {
    if (ready && (!cloud || authed)) {
      try { runRecurringPosting(); } catch (e) { console.warn('recurring posting skipped', e); }
    }
  }, [ready, cloud, authed, txCount, runRecurringPosting]);

  // Same for savings auto-save rules (idempotent per pot + month).
  const runAutoSave = useStore((s) => s.runAutoSave);
  const potCount = useStore((s) => s.savingsPots.length);
  useEffect(() => {
    if (ready && (!cloud || authed)) {
      try { runAutoSave(); } catch (e) { console.warn('auto-save skipped', e); }
    }
  }, [ready, cloud, authed, potCount, runAutoSave]);

  useHotkey('mod+k', (e) => { e.preventDefault(); setPaletteOpen((v) => !v); }, []);
  useHotkey('mod+n', (e) => { e.preventDefault(); setQuickAdd(true); }, []);
  useIdleLock();

  // Cloud mode: show a login screen until signed in.
  if (cloud) {
    if (!authReady) return <Splash />;
    if (!authed) return <div className="app-bg min-h-[100dvh]"><Auth /></div>;
  }

  if (!ready) return <Splash />;

  // Onboarding only applies to local mode; PIN lock applies in both modes.
  if (!cloud && !settings.onboarded) return <div className="app-bg min-h-[100dvh]"><Onboarding /></div>;
  if (locked && settings.pinEnabled) return <div className="app-bg min-h-[100dvh]"><LockScreen /></div>;

  return (
    <div className="app-bg min-h-[100dvh] flex">
      <Sidebar onQuickAdd={() => setQuickAdd(true)} />
      <main className="flex-1 min-w-0 px-4 sm:px-6 pb-24 lg:pb-12">
        <Topbar onQuickAdd={() => setQuickAdd(true)} onSearch={() => setPaletteOpen(true)} />
        <PageCover />
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
          <Routes key={privacy ? 'priv' : 'norm'}>
            <Route path="/" element={<Dashboard onQuickAdd={() => setQuickAdd(true)} />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </AnimatePresence>
      </main>
      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onQuickAdd={() => { setPaletteOpen(false); setQuickAdd(true); }} />
      <TransactionModal open={quickAdd} onClose={() => setQuickAdd(false)} />
      <InstallPrompt />
      <UpdateToast />
    </div>
  );
}
