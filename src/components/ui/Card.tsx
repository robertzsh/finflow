import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cx } from '@/lib/format';
import { ease } from '@/lib/motion';

export function Card({ children, className, hover, delay = 0 }: { children: ReactNode; className?: string; hover?: boolean; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease }}
      className={cx('card', hover && 'card-hover', className)}
    >
      {children}
    </motion.div>
  );
}
