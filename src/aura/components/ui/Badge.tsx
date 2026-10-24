import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export type TagTone = 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red';

/** Notion select-tag colours (pastel fill + deep text), one pair per tone. */
export const TAG_TONE: Record<TagTone, string> = {
  gray: 'bg-tag-gray-bg text-tag-gray-fg',
  brown: 'bg-tag-brown-bg text-tag-brown-fg',
  orange: 'bg-tag-orange-bg text-tag-orange-fg',
  yellow: 'bg-tag-yellow-bg text-tag-yellow-fg',
  green: 'bg-tag-green-bg text-tag-green-fg',
  blue: 'bg-tag-blue-bg text-tag-blue-fg',
  purple: 'bg-tag-purple-bg text-tag-purple-fg',
  pink: 'bg-tag-pink-bg text-tag-pink-fg',
  red: 'bg-tag-red-bg text-tag-red-fg',
};

/** A pastel fill + readable text derived from any hex (category colours are user data). */
export function tagStyle(color: string) {
  return {
    background: `color-mix(in srgb, ${color} 16%, rgb(var(--surface)))`,
    color: `color-mix(in oklab, ${color} 45%, rgb(var(--ink)))`,
  };
}

/** Notion-style tag pill. Pass a semantic `tone`, or a hex `color` (e.g. a category's). */
export function Badge({ children, color, tone, className }: { children: ReactNode; color?: string; tone?: TagTone; className?: string }) {
  return (
    <span
      className={cx('inline-flex max-w-full items-center gap-1 rounded-tag px-1.5 py-px text-xs font-medium leading-5 whitespace-nowrap', !color && TAG_TONE[tone ?? 'gray'], className)}
      style={color && !tone ? tagStyle(color) : undefined}
    >
      {children}
    </span>
  );
}
