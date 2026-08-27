import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, LayoutDashboard, ArrowLeftRight, Target, LineChart, CalendarDays, FileBarChart, Settings } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoney } from '@/lib/format';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

const PAGES = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Goals', to: '/goals', icon: Target },
  { label: 'Investments', to: '/investments', icon: LineChart },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Reports', to: '/reports', icon: FileBarChart },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export function CommandPalette({ open, onClose, onQuickAdd }: { open: boolean; onClose: () => void; onQuickAdd: () => void }) {
  const { transactions, categories, settings } = useStore();
  const [q, setQ] = useState('');
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ y: -20, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -10, opacity: 0 }}
            className="glass relative z-10 w-full max-w-xl rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 border-b border-white/10">
              <Search size={18} className="text-white/40" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or jump to…"
                className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-white/30" />
              <kbd className="text-[10px] text-white/40 px-1.5 py-0.5 rounded bg-white/10">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              <button onClick={onQuickAdd} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/10 text-left">
                <span className="rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 p-1.5"><Plus size={15} /></span>
                Add new transaction
              </button>
              {results.length > 0 && <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/40">Transactions</div>}
              {results.map((t) => {
                const c = categories.find((x) => x.id === t.categoryId);
                return (
                  <button key={t.id} onClick={() => { nav('/transactions'); onClose(); }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/10 text-left">
                    <CategoryIcon icon={c?.icon ?? 'Circle'} color={c?.color ?? '#888'} size={15} emoji={c?.emoji} />
                    <span className="flex-1 truncate">{t.merchant || c?.name || '—'}</span>
                    <span className="text-white/40 text-xs">{t.date}</span>
                    <span className={t.type === 'income' ? 'text-income font-medium' : 'text-white/70'}>
                      {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount, settings.currency)}
                    </span>
                  </button>
                );
              })}
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/40">Pages</div>
              {pages.map((p) => (
                <button key={p.to} onClick={() => { nav(p.to); onClose(); }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/10 text-left text-white/70">
                  <p.icon size={16} /> {p.label}
                </button>
              ))}
            </div>
          </motion.div>
          <KeyClose onClose={onClose} />
        </motion.div>
      )}
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
