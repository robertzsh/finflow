import { Search, Plus, Bell, Command, Eye, EyeOff, RefreshCw, CloudOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';

export function Topbar({ onQuickAdd, onSearch }: { onQuickAdd: () => void; onSearch: () => void }) {
  const name = useStore((s) => s.settings.name);
  const privacy = useStore((s) => s.privacy);
  const togglePrivacy = useStore((s) => s.togglePrivacy);
  const syncState = useStore((s) => s.syncState);
  const pending = useStore((s) => s.outbox.length);
  const retrySync = useStore((s) => s.retrySync);
  const cloudOn = useStore((s) => s.cloud && s.authed);
  const nav = useNavigate();
  const showSync = cloudOn && syncState !== 'idle';
  return (
    <header className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 pt-[max(0.4rem,env(safe-area-inset-top))] mb-1 chrome-glass border-b border-white/5 flex items-center gap-2.5 sm:gap-3">
      <div className="lg:hidden flex items-center gap-2 font-extrabold">
        <span className="rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 px-2 py-1 text-xs text-white">FF</span>
      </div>
      <button onClick={onSearch}
        className="hidden sm:flex items-center gap-2 flex-1 max-w-md rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-sm text-white/40 hover:bg-white/[0.07] transition">
        <Search size={16} /> Search transactions, merchants…
        <span className="ml-auto flex items-center gap-0.5 text-[10px] text-white/40"><Command size={11} />K</span>
      </button>
      <button onClick={onSearch} className="sm:hidden rounded-xl bg-white/5 border border-white/10 p-2"><Search size={18} /></button>
      <div className="flex-1 sm:hidden" />
      {showSync && (
        <button onClick={syncState === 'error' ? retrySync : undefined}
          aria-label={syncState === 'error' ? 'Retry sync' : 'Syncing'}
          title={syncState === 'error' ? `${pending} change(s) not synced — tap to retry` : `Syncing ${pending} change(s)…`}
          className={`rounded-xl border p-2 transition ${syncState === 'error' ? 'bg-expense/15 border-expense/30 text-expense' : 'bg-white/5 border-white/10 text-white/50'}`}>
          {syncState === 'error' ? <CloudOff size={18} /> : <RefreshCw size={18} className="animate-spin" />}
        </button>
      )}
      <button onClick={togglePrivacy} aria-label={privacy ? 'Show amounts' : 'Hide amounts'} title={privacy ? 'Show amounts' : 'Hide amounts (presentation mode)'}
        className={`rounded-xl border p-2 hover:bg-white/10 transition ${privacy ? 'bg-amber-500/15 border-amber-400/30 text-amber-300' : 'bg-white/5 border-white/10 text-white/60'}`}>
        {privacy ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      <button onClick={() => nav('/calendar')} aria-label="Upcoming bills" title="Upcoming bills"
        className="rounded-xl bg-white/5 border border-white/10 p-2 text-white/60 relative hover:bg-white/10">
        <Bell size={18} /><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
      </button>
      <Button onClick={onQuickAdd} className="!px-3"><Plus size={16} /><span className="hidden sm:inline">Add</span></Button>
      <button onClick={() => nav('/settings')} aria-label="Settings"
        className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm font-bold hover:opacity-90">
        {name.charAt(0).toUpperCase()}
      </button>
    </header>
  );
}
