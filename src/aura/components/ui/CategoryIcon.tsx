import { getIcon } from '@/lib/icons';

/** A category's icon (or emoji) on a soft tile tinted from the category colour. */
export function CategoryIcon({ icon, color, size = 18, bg = true, emoji }: { icon: string; color: string; size?: number; bg?: boolean; emoji?: string }) {
  const Icon = getIcon(icon);
  const inner = emoji
    ? <span style={{ fontSize: size }} className="leading-none">{emoji}</span>
    : <Icon size={size} color={color} strokeWidth={2} />;
  if (!bg) return inner;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-control"
      style={{ width: size + 16, height: size + 16, background: `color-mix(in srgb, ${color} 14%, rgb(var(--surface)))` }}>
      {inner}
    </span>
  );
}
