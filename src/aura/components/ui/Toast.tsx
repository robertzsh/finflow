import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

/** Floating notice (update available, install prompt): icon tile, text, one action. */
export function Toast({ icon, title, children, action, onDismiss }: {
  icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode; onDismiss: () => void;
}) {
  return (
    <div role="status" className="menu !rounded-card p-3 pl-3.5 flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        {children && <div className="text-xs text-ink-muted">{children}</div>}
      </div>
      {action}
      <IconButton size="sm" aria-label="Dismiss" onClick={onDismiss}><X size={16} /></IconButton>
    </div>
  );
}
