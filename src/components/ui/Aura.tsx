import { cx } from '@/lib/format';

/** The blurred "aura" from the reference — a cover banner or a round orb. Pure
 *  decoration (aria-hidden); colours come from the theme's --aura-* tokens. */
export function Aura({ variant = 'cover', drift, className }: { variant?: 'cover' | 'orb'; drift?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cx(variant === 'cover' ? 'aura-cover' : 'aura-orb', drift && 'motion-safe:animate-aura-drift', 'pointer-events-none', className)} />
  );
}
