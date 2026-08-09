import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }} className="max-w-7xl mx-auto w-full">
      {children}
    </motion.div>
  );
}
