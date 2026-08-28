import { getIcon } from '@/lib/icons';

export function CategoryIcon({ icon, color, size = 18, bg = true, emoji }: { icon: string; color: string; size?: number; bg?: boolean; emoji?: string }) {
  const Icon = getIcon(icon);
  const inner = emoji
    ? <span style={{ fontSize: size }} className="leading-none">{emoji}</span>
    : <Icon size={size} color={color} />;
  if (!bg) return emoji ? <span style={{ fontSize: size }} className="leading-none">{emoji}</span> : <Icon size={size} color={color} />;
  return (
    <span className="inline-flex items-center justify-center rounded-lg" style={{ width: size + 16, height: size + 16, background: `${color}22`, border: `1px solid ${color}33` }}>
      {inner}
    </span>
  );
}
