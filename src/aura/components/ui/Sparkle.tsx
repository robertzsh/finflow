import { cx } from '@/lib/format';

/** The reference's ✦* mark: an outlined four-point star with a small filled companion.
 *  `filled` draws a single solid star (the hot-pink aura sparkles). Decorative only. */
export function Sparkle({ size = 18, filled, className }: { size?: number; filled?: boolean; className?: string }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className={cx('shrink-0', className)}>
        <path d="M10 0c.7 5.4 3.6 8.6 10 10-6.4 1.4-9.3 4.6-10 10-.7-5.4-3.6-8.6-10-10 6.4-1.4 9.3-4.6 10-10Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={size * 1.3} height={size} viewBox="0 0 26 20" fill="none" aria-hidden className={cx('shrink-0', className)}>
      <path d="M9 2.5c.6 4 2.6 6 6.5 6.5-3.9.5-5.9 2.5-6.5 6.5-.6-4-2.6-6-6.5-6.5 3.9-.5 5.9-2.5 6.5-6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M21 1.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" fill="currentColor" />
    </svg>
  );
}
