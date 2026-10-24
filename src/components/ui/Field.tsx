import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/format';

const base = 'w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400/50 focus:bg-white/[0.07] transition placeholder:text-white/30';

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-xs font-medium text-white/60 mb-1.5">{children}</label>;
}

// Fallback accessible name: if the field has no explicit label association, use its
// placeholder so screen readers still announce something (baseline a11y).
function ariaFrom(rest: any): string | undefined {
  if (rest['aria-label'] || rest['aria-labelledby'] || rest.id) return undefined;
  return rest.placeholder ? String(rest.placeholder) : undefined;
}

// forwardRef is required so React Hook Form's register() ref attaches to the
// real DOM node — otherwise field values are never captured on submit.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} aria-label={ariaFrom(rest)} {...rest} className={cx(base, className)} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} aria-label={ariaFrom(rest)} {...rest} className={cx(base, 'resize-none', className)} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} {...rest} className={cx(base, 'appearance-none bg-no-repeat', className)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23888' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: 'right 12px center' }}>
        {children}
      </select>
    );
  },
);
