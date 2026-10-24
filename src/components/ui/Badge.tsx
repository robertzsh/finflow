import type { ReactNode } from 'react';
export function Badge({ children, color = '#94a3b8' }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: `${color}1f`, color, border: `1px solid ${color}33` }}>
      {children}
    </span>
  );
}
