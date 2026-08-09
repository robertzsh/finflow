import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/format';

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}
const V: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/20',
  ghost: 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10',
  subtle: 'bg-white/5 hover:bg-white/10 text-white/70',
  danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20',
};
export function Button({ variant = 'primary', className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed', V[variant], className)}
    >{children}</button>
  );
}
