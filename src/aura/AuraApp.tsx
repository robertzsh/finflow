import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Sidebar, MobileNav } from '@/aura/components/layout/Sidebar';
import { Topbar } from '@/aura/components/layout/Topbar';
import { PageCover } from '@/aura/components/layout/PageHeader';
import { Aura } from '@/aura/components/ui/Aura';
import { PageSkeleton } from '@/aura/components/ui/Skeleton';
import { CommandPalette } from '@/aura/components/CommandPalette';
import { TransactionModal } from '@/aura/components/TransactionModal';
import { LockScreen } from '@/aura/components/LockScreen';
import { Onboarding } from '@/aura/components/Onboarding';
import { Auth } from '@/aura/components/Auth';
import { InstallPrompt } from '@/aura/components/InstallPrompt';
import { UpdateToast } from '@/aura/components/UpdateToast';

// The Pink Aura skin. App.tsx owns the data, hotkeys and gate logic and renders this
// instead of the classic UI when the theme is Pink Aura; this file only draws it.

// Route pages are lazy-loaded so each one is its own chunk — the initial load only
// pulls the dashboard, not every screen (and their charts) up front.
const Dashboard = lazy(() => import('@/aura/features/dashboard/Dashboard'));
const Transactions = lazy(() => import('@/aura/features/transactions/Transactions'));
const Goals = lazy(() => import('@/aura/features/goals/Goals'));
const Savings = lazy(() => import('@/aura/features/savings/Savings'));
const Budgets = lazy(() => import('@/aura/features/budgets/Budgets'));
const Investments = lazy(() => import('@/aura/features/investments/Investments'));
const Calendar = lazy(() => import('@/aura/features/calendar/Calendar'));
const Reports = lazy(() => import('@/aura/features/reports/Reports'));
const SettingsPage = lazy(() => import('@/aura/features/settings/Settings'));

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

export type AuraGate = 'loading' | 'auth' | 'onboarding' | 'locked' | 'app';

export default function AuraApp({ gate, paletteOpen, setPaletteOpen, quickAdd, setQuickAdd }: {
  gate: AuraGate;
  paletteOpen: boolean; setPaletteOpen: (open: boolean) => void;
  quickAdd: boolean; setQuickAdd: (open: boolean) => void;
}) {
  const privacy = useStore((s) => s.privacy);
  return (
    // Honour the OS "reduce motion" setting for every framer-motion animation in this skin.
    <MotionConfig reducedMotion="user">
      {gate === 'loading' ? <Splash />
        : gate === 'auth' ? <div className="app-bg min-h-[100dvh]"><Auth /></div>
        : gate === 'onboarding' ? <div className="app-bg min-h-[100dvh]"><Onboarding /></div>
        : gate === 'locked' ? <div className="app-bg min-h-[100dvh]"><LockScreen /></div>
        : (
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
        )}
    </MotionConfig>
  );
}
