import { cx } from '@/lib/format';

/** On/off switch (role="switch"). `label` is its accessible name. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-accent-strong' : 'bg-line-strong')}>
      <span className={cx('inline-block h-4 w-4 rounded-full bg-on-color shadow-card transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}
