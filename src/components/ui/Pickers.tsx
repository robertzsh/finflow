import type { ReactNode } from 'react';
import { CategoryIcon } from './CategoryIcon';
import { SWATCHES } from '@/lib/palette';
import { cx } from '@/lib/format';

/** Toggleable tag-style chip (presets, quick picks). */
export function Chip({ selected, onClick, children, className }: { selected?: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick}
      className={cx('inline-flex items-center gap-1.5 rounded-tag border px-2 py-1 text-xs transition-colors',
        selected ? 'border-accent/40 bg-accent-soft text-accent-ink font-medium' : 'border-line bg-surface text-ink hover:bg-hover', className)}>
      {children}
    </button>
  );
}

/** Grid of icon choices, previewed in the item's colour. */
export function IconPicker({ icons, value, onChange, color }: { icons: string[]; value: string; onChange: (icon: string) => void; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {icons.map((ic) => (
        <button key={ic} type="button" aria-label={`Icon ${ic}`} aria-pressed={value === ic} onClick={() => onChange(ic)}
          className={cx('grid h-9 w-9 place-items-center rounded-control border transition-colors',
            value === ic ? 'border-accent/50 bg-accent-soft' : 'border-line bg-surface hover:bg-hover')}>
          <CategoryIcon icon={ic} color={color} size={16} bg={false} />
        </button>
      ))}
    </div>
  );
}

/** Round colour swatches; the chosen one gets a ring. */
export function ColorSwatchPicker({ value, onChange, colors = SWATCHES }: { value: string; onChange: (color: string) => void; colors?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={value === c} onClick={() => onChange(c)}
          className={cx('h-7 w-7 rounded-full transition-transform hover:scale-110', value === c && 'ring-2 ring-ink ring-offset-2 ring-offset-overlay')}
          style={{ background: c }} />
      ))}
    </div>
  );
}
