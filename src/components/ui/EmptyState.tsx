import type { ReactNode } from 'react';
import { getIcon, Inbox } from '@/lib/icons';

export function EmptyState({ icon = 'Inbox', title, subtitle, action }: { icon?: string; title: string; subtitle?: string; action?: ReactNode }) {
  const Icon = getIcon(icon, Inbox);
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="mb-4 rounded-2xl p-5 bg-white/5 border border-white/10 text-white/40">
        <Icon size={40} />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-white/50 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
