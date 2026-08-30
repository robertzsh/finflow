import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cx } from '@/lib/format';

export interface SSOption { value: string; label: string; emoji?: string }

const base = 'w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400/50 transition';

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

  return (
    <div className="relative" ref={ref}>
      <button type="button" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cx(base, 'flex items-center justify-between gap-2 text-left')}>
        <span className={cx('truncate', !selected && 'text-white/30')}>
          {selected ? `${selected.emoji ? selected.emoji + ' ' : ''}${selected.label}` : placeholder}
        </span>
        <ChevronDown size={16} className="text-white/40 shrink-0" />
      </button>
      {open && (
        <div className="glass absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-xl">
          <div className="flex items-center gap-2 px-3 border-b border-white/10">
            <Search size={14} className="text-white/40 shrink-0" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchLabel}
              aria-label={searchLabel}
              className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30" />
          </div>
          <div role="listbox" className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && <div className="px-3 py-3 text-xs text-white/40">No matches.</div>}
            {filtered.map((o) => (
              <button key={o.value} type="button" role="option" aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cx('w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-white/10', o.value === value && 'bg-white/10')}>
                {o.emoji && <span className="shrink-0">{o.emoji}</span>}
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
