import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ease } from '@/lib/motion';

export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease }} className="max-w-page mx-auto w-full">
      {children}
    </motion.div>
  );
}
