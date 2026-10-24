import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cx } from '@/lib/format';
import { fieldBase } from './Field';

export interface SSOption { value: string; label: string; emoji?: string }

/** A select-like control with a built-in search box for filtering long option lists. */
export function SearchableSelect({ value, options, onChange, placeholder = 'Select…', ariaLabel, searchLabel = 'Search…' }:
  { value: string; options: SSOption[]; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string; searchLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  useEffect(() => { if (open) { setQ(''); const t = setTimeout(() => inputRef.current?.focus(), 10); return () => clearTimeout(t); } }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
  }, [q, options]);

  // Escape closes only this dropdown (and is stopped from bubbling to a parent
  // Modal's Escape-to-close handler, which would otherwise discard the whole form).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (open && e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setOpen(false); }
  };

  return (
    <div className="relative" ref={ref} onKeyDown={onKeyDown}>
      <button type="button" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cx(fieldBase, 'flex items-center justify-between gap-2 text-left')}>
        <span className={cx('truncate', !selected && 'text-ink-faint')}>
          {selected ? `${selected.emoji ? selected.emoji + ' ' : ''}${selected.label}` : placeholder}
        </span>
        <ChevronDown size={16} className="text-ink-muted shrink-0" />
      </button>
      {open && (
        <div className="menu absolute z-50 mt-1.5 w-full overflow-hidden p-1.5">
          <div className="flex items-center gap-2 px-2.5 rounded-control bg-fill border border-line">
            <Search size={14} className="text-ink-muted shrink-0" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchLabel}
              aria-label={searchLabel}
              className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-ink-faint" />
          </div>
          <div role="listbox" className="max-h-60 overflow-y-auto mt-1.5 space-y-px">
            {filtered.length === 0 && <div className="px-3 py-3 text-xs text-ink-muted">No matches.</div>}
            {filtered.map((o) => (
              <button key={o.value} type="button" role="option" aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cx('w-full flex items-center gap-2.5 rounded-control px-2.5 py-1.5 text-sm text-left transition-colors', o.value === value ? 'bg-accent-soft text-accent-ink font-medium' : 'hover:bg-hover')}>
                {o.emoji && <span className="shrink-0 text-base leading-none">{o.emoji}</span>}
                <span className="truncate flex-1">{o.label}</span>
                {o.value === value && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
