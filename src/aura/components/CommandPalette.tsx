import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, CornerDownLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoney } from '@/lib/format';
import { CategoryIcon } from '@/aura/components/ui/CategoryIcon';
import { TransactionModal } from '@/aura/components/TransactionModal';
import type { Transaction } from '@/types';
import { NAV } from '@/aura/components/layout/nav';

const PAGES = NAV;
const GROUP = 'px-3 pt-3 pb-1 text-2xs font-medium text-ink-muted';

export function CommandPalette({ open, onClose, onQuickAdd }: { open: boolean; onClose: () => void; onQuickAdd: () => void }) {
  const { transactions, categories, settings } = useStore();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const nav = useNavigate();
  useEffect(() => { if (open) setQ(''); }, [open]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    return transactions.filter((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)?.name.toLowerCase() ?? '';
      return t.merchant.toLowerCase().includes(s) || (t.notes ?? '').toLowerCase().includes(s)
        || cat.includes(s) || String(t.amount).includes(s) || t.date.includes(s);
    }).slice(0, 8);
  }, [q, transactions, categories]);

  const pages = q.trim() ? PAGES.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())) : PAGES;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-scrim" onClick={onClose} />
          <motion.div initial={{ y: -16, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -10, opacity: 0 }}
            role="dialog" aria-modal="true" aria-label="Search"
            className="menu relative z-10 w-full max-w-xl !rounded-sheet overflow-hidden">
            <div className="flex items-center gap-3 px-4 border-b border-line">
              <Search size={18} className="text-ink-muted shrink-0" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or jump to…" aria-label="Search or jump to"
                className="flex-1 bg-transparent py-4 text-base outline-none placeholder:text-ink-faint" />
              <kbd className="kbd">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-1.5">
              <div className={GROUP}>Actions</div>
              <button onClick={onQuickAdd} className="group w-full flex items-center gap-3 rounded-control px-3 py-2 text-sm hover:bg-hover text-left">
                <span className="grid h-6 w-6 place-items-center rounded-control bg-accent text-on-accent"><Plus size={14} /></span>
                <span className="flex-1">Add new transaction</span>
                <CornerDownLeft size={14} className="text-ink-faint opacity-0 group-hover:opacity-100" />
              </button>
              {results.length > 0 && <div className={GROUP}>Transactions</div>}
              {results.map((t) => {
                const c = categories.find((x) => x.id === t.categoryId);
                return (
                  <button key={t.id} onClick={() => setEditing(t)}
                    className="w-full flex items-center gap-3 rounded-control px-3 py-1.5 text-sm hover:bg-hover text-left">
                    <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#94a3b8'} size={14} emoji={c?.emoji} />
                    <span className="flex-1 truncate">{t.merchant || c?.name || '—'}</span>
                    <span className="text-ink-muted text-xs tabular-nums">{t.date}</span>
                    <span className={t.type === 'income' ? 'text-income font-medium tabular-nums' : 'text-ink-muted tabular-nums'}>
                      {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount, settings.currency)}
                    </span>
                  </button>
                );
              })}
              {pages.length > 0 && <div className={GROUP}>Pages</div>}
              {pages.map((p) => (
                <button key={p.to} onClick={() => { nav(p.to); onClose(); }}
                  className="w-full flex items-center gap-3 rounded-control px-3 py-1.5 text-sm hover:bg-hover text-left">
                  <p.icon size={16} className="text-ink-muted" /> {p.label}
                </button>
              ))}
            </div>
          </motion.div>
          <KeyClose onClose={onClose} />
        </motion.div>
      )}
      {/* Editing a search result opens the transaction directly; closing it returns to the app. */}
      <TransactionModal open={!!editing} existing={editing ?? undefined} onClose={() => { setEditing(null); onClose(); }} />
    </AnimatePresence>
  );
}

function KeyClose({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return null;
}
