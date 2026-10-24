import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
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
          <Toast icon={<RefreshCw size={16} />} title="Update available" onDismiss={() => setDismissed(true)}
            action={<Button size="sm" onClick={() => reg && applyUpdate(reg)}>Reload</Button>}>
            A new version of FinFlow is ready.
          </Toast>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
