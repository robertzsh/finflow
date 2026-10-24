import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export type CalloutTone = 'pink' | 'gray' | 'green' | 'yellow' | 'red' | 'blue';

// Notion callout fills: the theme's pink block, or a softened tag colour.
const BG: Record<CalloutTone, string> = {
  pink: 'bg-accent-soft',
  gray: 'bg-fill',
  green: 'bg-[color-mix(in_srgb,var(--tag-green-bg)_60%,transparent)]',
  yellow: 'bg-[color-mix(in_srgb,var(--tag-yellow-bg)_60%,transparent)]',
  red: 'bg-[color-mix(in_srgb,var(--tag-red-bg)_60%,transparent)]',
  blue: 'bg-[color-mix(in_srgb,var(--tag-blue-bg)_60%,transparent)]',
};
const ICON: Record<CalloutTone, string> = {
  pink: 'text-accent-ink',
  gray: 'text-ink-muted',
  green: 'text-tag-green-fg',
  yellow: 'text-tag-yellow-fg',
  red: 'text-expense',
  blue: 'text-tag-blue-fg',
};

/** Notion callout: a tinted block with a leading icon (the reference's "! monthly limit"). */
export function Callout({ tone = 'pink', icon, title, children, action, className }: {
  tone?: CalloutTone; icon?: ReactNode; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cx('flex flex-wrap items-start gap-x-3 gap-y-2 rounded-card px-4 py-3', BG[tone], className)}>
      {icon && <span className={cx('shrink-0 mt-px', ICON[tone])}>{icon}</span>}
      <div className="min-w-[10rem] flex-1 text-sm leading-relaxed">
        {title && <div className="font-semibold text-ink">{title}</div>}
        {children && <div className={cx(title ? 'text-ink-muted' : 'text-ink')}>{children}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2 self-center">{action}</div>}
    </div>
  );
}
