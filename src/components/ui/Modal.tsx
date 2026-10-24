import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Lock background scroll while the sheet is open (stops the page "dragging" behind it on mobile).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Accessibility: focus management + trap + Escape-to-close. Restores focus on close.
  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = () => node
      ? Array.from(node.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
        )).filter((el) => el.offsetParent !== null)
      : [];
    // Don't steal focus from an autoFocus field already focused inside the dialog.
    if (node && !node.contains(document.activeElement)) node.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); node.focus(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prevFocus?.focus?.(); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            ref={dialogRef} tabIndex={-1}
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`glass relative z-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-t-3xl sm:rounded-2xl max-h-[88vh] overflow-y-auto overscroll-contain`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl rounded-t-3xl sm:rounded-t-2xl">
              <h2 className="text-lg font-bold">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
