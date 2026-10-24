import type { ReactNode } from 'react';
import { getIcon, Inbox } from '@/lib/icons';
import { Aura } from './Aura';
import { Sparkle } from './Sparkle';

export function EmptyState({ icon = 'Inbox', title, subtitle, action }: { icon?: string; title: string; subtitle?: string; action?: ReactNode }) {
  const Icon = getIcon(icon, Inbox);
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="relative mb-5 grid h-24 w-24 place-items-center">
        <Aura variant="orb" className="absolute inset-0" />
        <Icon size={30} strokeWidth={1.75} className="relative text-accent-ink" />
        <Sparkle filled size={12} className="absolute right-2 top-2 text-sparkle" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-ink-muted max-w-sm">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
