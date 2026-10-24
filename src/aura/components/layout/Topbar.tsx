import { Search, Plus, CalendarDays, Command, Eye, EyeOff, RefreshCw, CloudOff, Sparkles, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, IconButton } from '@/aura/components/ui/Button';
import { useStore } from '@/store/useStore';
import { cx } from '@/lib/format';
import { navFor } from './nav';

export function Topbar({ onQuickAdd, onSearch }: { onQuickAdd: () => void; onSearch: () => void }) {
  const name = useStore((s) => s.settings.name);
  const privacy = useStore((s) => s.privacy);
  const togglePrivacy = useStore((s) => s.togglePrivacy);
  const syncState = useStore((s) => s.syncState);
  const pending = useStore((s) => s.outbox.length);
  const retrySync = useStore((s) => s.retrySync);
  const cloudOn = useStore((s) => s.cloud && s.authed);
  const nav = useNavigate();
  const page = navFor(useLocation().pathname);
  const showSync = cloudOn && syncState !== 'idle';
  return (
    <header className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-3 sm:px-5 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] bg-canvas/85 backdrop-blur-md border-b border-line flex items-center gap-1.5 sm:gap-2">
      <span className="lg:hidden grid h-7 w-7 shrink-0 place-items-center rounded-control bg-accent text-on-accent">
        <Sparkles size={15} strokeWidth={2.2} />
      </span>
      {/* Breadcrumb, Notion-style: workspace / page */}
      <div className="hidden lg:flex items-center gap-1 text-sm text-ink-muted min-w-0 mr-2">
        <span>FinFlow</span>
        <ChevronRight size={14} className="shrink-0 opacity-60" />
        <span className="flex items-center gap-1.5 text-ink font-medium truncate"><page.icon size={15} className="shrink-0" />{page.label}</span>
      </div>
      <button onClick={onSearch}
        className="hidden sm:flex items-center gap-2 flex-1 max-w-sm lg:ml-auto rounded-control bg-fill border border-line px-3 h-8 text-sm text-ink-muted hover:bg-hover transition">
        <Search size={15} /> <span className="truncate">Search transactions, merchants…</span>
        <span className="kbd ml-auto"><Command size={10} />K</span>
      </button>
      <IconButton onClick={onSearch} aria-label="Search" className="sm:hidden"><Search size={18} /></IconButton>
      <div className="flex-1 sm:hidden" />
      {showSync && (
        <IconButton onClick={syncState === 'error' ? retrySync : undefined}
          aria-label={syncState === 'error' ? 'Retry sync' : 'Syncing'}
          title={syncState === 'error' ? `${pending} change(s) not synced — tap to retry` : `Syncing ${pending} change(s)…`}
          className={syncState === 'error' ? '!text-expense bg-expense/10' : undefined}>
          {syncState === 'error' ? <CloudOff size={18} /> : <RefreshCw size={17} className="animate-spin" />}
        </IconButton>
      )}
      <IconButton onClick={togglePrivacy} aria-label={privacy ? 'Show amounts' : 'Hide amounts'} title={privacy ? 'Show amounts' : 'Hide amounts (presentation mode)'}
        className={cx(privacy && '!bg-tag-yellow-bg !text-tag-yellow-fg')}>
        {privacy ? <EyeOff size={18} /> : <Eye size={18} />}
      </IconButton>
      <IconButton onClick={() => nav('/calendar')} aria-label="Calendar" title="Calendar">
        <CalendarDays size={18} />
      </IconButton>
      <Button onClick={onQuickAdd} size="sm" aria-label="Quick add" className="!px-2.5 sm:!px-3"><Plus size={16} /><span className="hidden sm:inline">Add</span></Button>
      <button onClick={() => nav('/settings')} aria-label="Settings"
        className="hidden sm:grid place-items-center w-8 h-8 shrink-0 rounded-full bg-accent-soft text-accent-ink text-sm font-semibold hover:bg-active transition">
        {name.charAt(0).toUpperCase()}
      </button>
    </header>
  );
}
