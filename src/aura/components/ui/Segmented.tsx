import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Classes for this option while selected (e.g. a red "Expense" / green "Income"). */
  activeClassName?: string;
}

/** One-of-many toggle. `pill` is a compact segmented control for forms; `tabs` is the
 *  Notion view-tab row (icon + label, underline under the active one). */
export function Segmented<T extends string>({ value, onChange, options, variant = 'pill', ariaLabel, className, fill }: {
  value: T; onChange: (v: T) => void; options: SegmentOption<T>[];
  variant?: 'pill' | 'tabs'; ariaLabel?: string; className?: string; fill?: boolean;
}) {
  if (variant === 'tabs') {
    return (
      <div role="group" aria-label={ariaLabel} className={cx('flex items-end gap-1 border-b border-line overflow-x-auto no-scrollbar', className)}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
              className={cx('relative inline-flex items-center gap-1.5 whitespace-nowrap px-2 pt-1 pb-2 text-sm transition-colors',
                on ? 'text-ink font-medium' : 'text-ink-muted hover:text-ink', fill && 'flex-1 justify-center')}>
              {o.icon}{o.label}
              {on && <span aria-hidden className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-ink" />}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="group" aria-label={ariaLabel}
      className={cx('flex items-center gap-0.5 rounded-control border border-line bg-fill p-0.5', fill ? 'w-full' : 'inline-flex', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            className={cx('inline-flex items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm transition',
              fill && 'flex-1',
              on ? cx('bg-surface font-medium shadow-card', o.activeClassName ?? 'text-ink') : 'text-ink-muted hover:text-ink')}>
            {o.icon}{o.label}
          </button>
        );
      })}
    </div>
  );
}
