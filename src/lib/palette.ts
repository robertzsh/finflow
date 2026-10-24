// Colour choices offered when creating goals, savings pots and categories. These
// are stored with the item, so they are plain hex (the same in every theme).
export const SWATCHES = [
  '#c14c8a', '#e255a1', '#f472b6', '#d946ef', '#a855f7', '#8b5cf6',
  '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#eab308', '#f59e0b', '#f97316', '#ef4444', '#a0785a', '#94a3b8',
];

// Household member colours (avatars, payer chips, per-member bars) — theme tokens.
const MEMBER_COLORS = [1, 2, 3, 4].map((n) => `rgb(var(--member-${n}))`);
export const memberColor = (idx: number) => MEMBER_COLORS[((idx % MEMBER_COLORS.length) + MEMBER_COLORS.length) % MEMBER_COLORS.length];
