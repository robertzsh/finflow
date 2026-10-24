import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/format';

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}
const V: Record<Variant, string> = {
  primary: 'bg-accent-strong text-on-accent font-semibold shadow-card hover:brightness-[1.06] active:brightness-95',
  ghost: 'bg-surface text-ink border border-line-strong shadow-card hover:bg-hover',
  subtle: 'text-ink-muted hover:bg-hover hover:text-ink',
  danger: 'bg-tag-red-bg text-tag-red-fg hover:brightness-95',
};
const S: Record<Size, string> = {
  sm: 'min-h-8 px-2.5 py-1 text-[13px] gap-1.5',
  md: 'min-h-9 px-3.5 py-1.5 text-sm gap-2',
};
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap transition disabled:opacity-40 disabled:cursor-not-allowed',
        S[size], V[variant], className,
      )}
    >{children}</button>
  );
}

/** Square icon-only button. `aria-label` is required — the icon alone has no name. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  'aria-label': string; children: ReactNode; size?: Size; active?: boolean;
}>(function IconButton({ className, children, size = 'md', active, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref} type={type} {...rest}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-control transition disabled:opacity-30 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        active ? 'bg-active text-ink' : 'text-ink-muted hover:bg-hover hover:text-ink',
        className,
      )}
    >{children}</button>
  );
});
