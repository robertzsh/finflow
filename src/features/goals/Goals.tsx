import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Field';
import { ProgressRing } from '@/components/ui/Progress';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney, currencySymbol } from '@/lib/format';
import { goalETA, toBase } from '@/lib/finance';
import type { Goal, CurrencyCode } from '@/types';

const ICONS = ['ShieldCheck', 'Car', 'Plane', 'Home', 'Monitor', 'Gift', 'GraduationCap', 'Heart', 'PiggyBank', 'Gem', 'Baby', 'Briefcase', 'Bike', 'Sofa', 'Dog'];
const COLORS = [
  '#a855f7', '#c084fc', '#8b5cf6', '#7c3aed', '#6366f1', '#3b82f6',
  '#06b6d4', '#10b981', '#22c55e', '#eab308', '#f59e0b', '#f97316',
  '#ef4444', '#ec4899', '#f472b6', '#14b8a6',
];

// Preset goal templates — one tap to prefill name, icon and colour.
const GOAL_PRESETS: { name: string; icon: string; color: string }[] = [
  { name: 'Fond de urgență', icon: 'ShieldCheck', color: '#a855f7' },
  { name: 'Cumpărare casă', icon: 'Home', color: '#7c3aed' },
  { name: 'Cumpărare mașină', icon: 'Car', color: '#3b82f6' },
  { name: 'Vacanță', icon: 'Plane', color: '#06b6d4' },
  { name: 'Nuntă', icon: 'Heart', color: '#ec4899' },
  { name: 'PC nou', icon: 'Monitor', color: '#10b981' },
  { name: 'Educație', icon: 'GraduationCap', color: '#f59e0b' },
  { name: 'Pensie', icon: 'PiggyBank', color: '#14b8a6' },
];

export default function Goals() {
  const { goals, settings, addGoal, deleteGoal, contributeGoal } = useStore();
  const cur = settings.currency;
  const [open, setOpen] = useState(false);
  const [contribFor, setContribFor] = useState<Goal | null>(null);

  const fx = settings.fxRates;
  const totalTarget = goals.reduce((a, g) => a + toBase(g.target, g.currency, fx), 0);
  const totalSaved = goals.reduce((a, g) => a + toBase(g.saved, g.currency, fx), 0);

  return (
    <Page>
      <PageHeader title="Goals" subtitle={`${formatMoney(totalSaved, cur)} saved toward ${formatMoney(totalTarget, cur)}`}
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New goal</Button>} />

      {goals.length === 0 ? (
        <Card><EmptyState icon="Target" title="No goals yet" subtitle="Set a savings target and track your progress."
          action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Create goal</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g, i) => {
            const pct = (g.saved / g.target) * 100;
            const remaining = Math.max(0, g.target - g.saved);
            const gc = g.currency ?? cur;
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card hover className="p-5">
                  <div className="flex items-start justify-between">
                    <CategoryIcon icon={g.icon} color={g.color} size={22} />
                    <button onClick={() => deleteGoal(g.id)} className="text-white/25 hover:text-expense p-1"><Trash2 size={15} /></button>
                  </div>
                  <h3 className="font-semibold mt-3">{g.name}</h3>
                  <p className="text-xs text-white/40">Target {formatMoney(g.target, gc)}</p>
                  <div className="flex items-center justify-center my-4">
                    <ProgressRing value={pct} color={g.color} label={pct >= 100 ? 'Done!' : 'saved'} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white/5 py-2"><div className="font-semibold text-goal">{formatMoney(g.saved, gc)}</div><div className="text-white/40">saved</div></div>
                    <div className="rounded-lg bg-white/5 py-2"><div className="font-semibold">{formatMoney(remaining, gc)}</div><div className="text-white/40">to go</div></div>
                  </div>
                  <p className="text-xs text-white/40 text-center mt-3">Est. completion · <span className="text-white/70">{goalETA(g)}</span></p>
                  <Button variant="ghost" className="w-full mt-3" onClick={() => setContribFor(g)}>Add contribution</Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <NewGoalModal open={open} onClose={() => setOpen(false)} onSave={(g) => { addGoal(g); setOpen(false); }} />
      <ContributeModal goal={contribFor} onClose={() => setContribFor(null)} cur={cur}
        onContribute={(amt) => { if (contribFor) contributeGoal(contribFor.id, amt); setContribFor(null); }} />
    </Page>
  );
}

const GOAL_CURRENCIES: CurrencyCode[] = ['RON', 'EUR', 'USD', 'GBP'];
function NewGoalModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (g: Omit<Goal, 'id' | 'createdAt'>) => void }) {
  const base = useStore((s) => s.settings.currency);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [contrib, setContrib] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(base);
  const [icon, setIcon] = useState('Target');
  const [color, setColor] = useState(COLORS[0]);
  return (
    <Modal open={open} onClose={onClose} title="New savings goal">
      <div className="space-y-4">
        <div>
          <Label>Quick start</Label>
          <div className="flex flex-wrap gap-2">
            {GOAL_PRESETS.map((p) => (
              <button key={p.name} type="button"
                onClick={() => { setName(p.name); setIcon(p.icon); setColor(p.color); }}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${name === p.name ? 'border-goal bg-goal/20' : 'border-white/10 bg-white/5'}`}>
                <CategoryIcon icon={p.icon} color={p.color} size={13} bg={false} /> {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><Label>Goal name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" /></div>
          <div><Label>Currency</Label><Select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>{GOAL_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Target amount</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" /></div>
          <div><Label>Already saved</Label><Input type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0.00" /></div>
        </div>
        <div><Label>Monthly contribution</Label><Input type="number" value={contrib} onChange={(e) => setContrib(e.target.value)} placeholder="0.00" /></div>
        <div><Label>Icon</Label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button key={ic} onClick={() => setIcon(ic)} className={`rounded-lg p-2 border ${icon === ic ? 'border-goal bg-goal/20' : 'border-white/10 bg-white/5'}`}>
                <CategoryIcon icon={ic} color={color} size={16} bg={false} />
              </button>
            ))}
          </div>
        </div>
        <div><Label>Colour</Label>
          <div className="flex gap-2">
            {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}
          </div>
        </div>
        <Button className="w-full" disabled={!name || !target} onClick={() => onSave({ name, target: Number(target), saved: Number(saved) || 0, monthlyContribution: Number(contrib) || 0, icon, color, currency })}>
          Create goal
        </Button>
      </div>
    </Modal>
  );
}

function ContributeModal({ goal, onClose, onContribute, cur }: { goal: Goal | null; onClose: () => void; onContribute: (a: number) => void; cur: CurrencyCode }) {
  const [amt, setAmt] = useState('');
  const gc = goal?.currency ?? cur;
  const preset = gc === 'RON' ? [200, 500, 1000, 2500] : [50, 100, 250, 500];
  return (
    <Modal open={!!goal} onClose={onClose} title={`Add to ${goal?.name ?? ''}`}>
      {goal && (
        <div className="space-y-4">
          <p className="text-sm text-white/50">Currently {formatMoney(goal.saved, gc)} of {formatMoney(goal.target, gc)}.</p>
          <div><Label>Contribution amount ({gc})</Label><Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" autoFocus /></div>
          <div className="flex gap-2">{preset.map((v) => <button key={v} onClick={() => setAmt(String(v))} className="flex-1 rounded-lg bg-white/5 hover:bg-white/10 py-2 text-sm">{currencySymbol(gc)}{v}</button>)}</div>
          <Button className="w-full" disabled={!amt} onClick={() => onContribute(Number(amt))}>Add contribution</Button>
        </div>
      )}
    </Modal>
  );
}
