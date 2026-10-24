import { cx } from '@/lib/format';

/** Shimmering placeholder block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton', className)} />;
}

/** Page-shaped skeleton: cover, title and a few cards. `label` is announced to screen readers. */
export function PageSkeleton({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="max-w-page mx-auto w-full pt-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-9 w-56 mb-3" />
      <Skeleton className="h-4 w-80 max-w-full mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64 mt-4" />
    </div>
  );
}
