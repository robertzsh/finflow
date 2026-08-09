import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export function Card({ children, className, hover, delay = 0 }: { children: ReactNode; className?: string; hover?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={cx('glass rounded-2xl', hover && 'glass-hover', className)}
    >
      {children}
    </motion.div>
  );
}
