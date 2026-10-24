import type { Transition } from 'framer-motion';

// Shared motion presets. <MotionConfig reducedMotion="user"> in App.tsx turns the
// transform parts off for people who ask the OS for reduced motion.

export const ease = [0.2, 0.8, 0.2, 1] as const;

/** Content entering the page: a short fade + rise. Spread onto a motion element. */
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease },
};

/** fadeUp for the i-th item of a list, capped so long lists don't trickle in. */
export function staggered(i: number, step = 0.03) {
  return { ...fadeUp, transition: { ...fadeUp.transition, delay: Math.min(i * step, 0.3) } };
}

export const spring: Record<'sheet' | 'nav', Transition> = {
  sheet: { type: 'spring', stiffness: 320, damping: 32 },
  nav: { type: 'spring', stiffness: 400, damping: 34 },
};
