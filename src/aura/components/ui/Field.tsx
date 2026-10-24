import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/format';

/** Shared look of every text field, select and combobox trigger. */
export const fieldBase =
  'w-full rounded-control bg-surface border border-line-strong px-3 py-2 text-sm text-ink outline-none transition ' +
  'placeholder:text-ink-faint hover:border-ink-faint/60 focus:border-focus focus:shadow-focus disabled:opacity-50';

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-muted mb-1.5">{children}</label>;
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
    return <input ref={ref} aria-label={ariaFrom(rest)} {...rest} className={cx(fieldBase, className)} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} aria-label={ariaFrom(rest)} {...rest} className={cx(fieldBase, 'resize-none', className)} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} {...rest} className={cx(fieldBase, 'field-select cursor-pointer', className)}>
        {children}
      </select>
    );
  },
);
