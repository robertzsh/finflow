import * as Icons from 'lucide-react';

export function CategoryIcon({ icon, color, size = 18, bg = true }: { icon: string; color: string; size?: number; bg?: boolean }) {
  const Icon = (Icons as any)[icon] ?? Icons.Circle;
  if (!bg) return <Icon size={size} color={color} />;
  return (
    <span className="inline-flex items-center justify-center rounded-lg" style={{ width: size + 16, height: size + 16, background: `${color}22`, border: `1px solid ${color}33` }}>
      <Icon size={size} color={color} />
    </span>
  );
}
