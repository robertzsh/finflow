import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

const DISMISS_KEY = 'ff_install_dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

/** A subtle, dismissible "Install FinFlow" prompt.
 *  - Android/desktop Chromium: uses the native beforeinstallprompt event.
 *  - iOS Safari (no such event): shows the manual "Share → Add to Home Screen" hint. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try { if (localStorage.getItem(DISMISS_KEY) === '1') return; } catch { /* ignore */ }

    const onBIP = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', onBIP);

    if (isIos()) {
      const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
      if (isSafari) { setIosHint(true); setShow(true); }
    }

    const onInstalled = () => { setShow(false); try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ } };
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() { setShow(false); try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ } }
  async function install() {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          className="fixed z-50 left-3 right-3 mx-auto max-w-md bottom-[calc(env(safe-area-inset-bottom)+84px)] lg:bottom-6">
          <Toast icon={<Download size={17} />} title="Install FinFlow" onDismiss={dismiss}
            action={!iosHint && <Button size="sm" onClick={install}>Install</Button>}>
            {iosHint
              ? <>Tap <Share size={13} className="inline align-[-2px]" /> then “Add to Home Screen”.</>
              : 'Add it to your home screen — works offline.'}
          </Toast>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
