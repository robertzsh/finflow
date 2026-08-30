import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { registerSW, applyUpdate } from '@/lib/pwa';

/** Registers the service worker and shows a "new version available" toast when a
 *  fresh deploy is waiting. Clicking Reload activates it and refreshes cleanly. */
export function UpdateToast() {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { registerSW((r) => { setReg(r); setDismissed(false); }); }, []);

  const show = !!reg && !dismissed;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
          className="fixed z-[60] left-3 right-3 mx-auto max-w-md top-[calc(env(safe-area-inset-top)+10px)]">
          <div className="glass rounded-2xl p-3 pl-4 flex items-center gap-3 shadow-glass">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 p-2 shrink-0">
              <RefreshCw size={16} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Update available</div>
              <div className="text-xs text-white/60">A new version of FinFlow is ready.</div>
            </div>
            <button onClick={() => reg && applyUpdate(reg)}
              className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-sm font-semibold px-3.5 py-2 hover:opacity-90">
              Reload
            </button>
            <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 text-white/40 hover:text-white p-1"><X size={16} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
