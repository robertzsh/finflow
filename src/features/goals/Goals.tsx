import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Users, User } from 'lucide-react';
import { isSameMonth, parseISO, format } from 'date-fns';
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
import { toBase } from '@/lib/finance';
import type { Goal, CurrencyCode } from '@/types';

const ICONS = ['ShieldCheck', 'Car', 'Plane', 'Home', 'Monitor', 'Gift', 'GraduationCap', 'Heart', 'PiggyBank', 'Gem', 'Baby', 'Briefcase', 'Bike', 'Sofa', 'Dog'];
const COLORS = [
  '#a855f7', '#c084fc', '#8b5cf6', '#7c3aed', '#6366f1', '#3b82f6',
  '#06b6d4', '#10b981', '#22c55e', '#eab308', '#f59e0b', '#f97316',
  '#ef4444', '#ec4899', '#f472b6', '#14b8a6',
];
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
const NOW = new Date();

/** ETA from planned monthly contribution (in the goal's own currency). */
function goalEta(g: Goal): string {
  const remaining = g.target - g.saved;
  if (remaining <= 0) return 'Completed';
  if (!g.monthlyContribution || g.monthlyContribution <= 0) return 'set a monthly amount';
  const months = Math.ceil(remaining / g.monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return format(d, 'MMM yyyy');
}

export default function Goals() {
  const { goals, settings, members, userId, cloud, authed, addGoal, deleteGoal, contributeGoal } = useStore();
  const cur = settings.currency;
  const fx = settings.fxRates;
  const [open, setOpen] = useState(false);
  const [contribFor, setContribFor] = useState<Goal | null>(null);

  const isHousehold = cloud && authed && members.length > 1;
  const totalTarget = goals.reduce((a, g) => a + toBase(g.target, g.currency, fx), 0);
  const totalSaved = goals.reduce((a, g) => a + toBase(g.saved, g.currency, fx), 0);
  const intoGoalsThisMonth = goals.reduce((a, g) =>
    a + (g.contributions ?? []).filter((c) => isSameMonth(parseISO(c.date), NOW)).reduce((s, c) => s + c.amount, 0), 0);

  // group goals into family + per-member (only meaningful in a shared household)
  const family = goals.filter((g) => !g.owner);
  const mine = goals.filter((g) => g.owner === userId);
  const partners = members.filter((m) => m.id !== userId).map((m) => ({ member: m, list: goals.filter((g) => g.owner === m.id) }));

  const renderGrid = (list: Goal[]) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((g, i) => {
        const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
        const remaining = Math.max(0, g.target - g.saved);
        const gc = g.currency ?? cur;
        const thisMonth = (g.contributions ?? []).filter((c) => isSameMonth(parseISO(c.date), NOW)).reduce((s, c) => s + c.amount, 0);
        return (
          <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card hover className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <CategoryIcon icon={g.icon} color={g.color} size={22} />
                <button onClick={() => deleteGoal(g.id)} className="text-white/25 hover:text-expense p-1"><Trash2 size={15} /></button>
              </div>
              <h3 className="font-semibold mt-3 truncate">{g.name}</h3>
              <p className="text-xs text-white/40">Target {formatMoney(g.target, gc)}</p>
              <div className="flex items-center justify-center my-4">
                <ProgressRing value={pct} color={g.color} label={pct >= 100 ? 'Done!' : 'saved'} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/5 py-2 min-w-0"><div className="font-semibold text-goal truncate">{formatMoney(g.saved, gc)}</div><div className="text-white/40">saved</div></div>
                <div className="rounded-lg bg-white/5 py-2 min-w-0"><div className="font-semibold truncate">{formatMoney(remaining, gc)}</div><div className="text-white/40">to go</div></div>
              </div>
              <p className="text-xs text-white/40 text-center mt-3">
                {g.monthlyContribution > 0 && <>at {formatMoney(g.monthlyContribution, gc, { compact: g.monthlyContribution > 9999 })}/mo · </>}
                <span className="text-white/70">{goalEta(g)}</span>
              </p>
              {thisMonth > 0 && <p className="text-[11px] text-goal text-center mt-1">+{formatMoney(thisMonth, cur)} added this month</p>}
              <Button variant="ghost" className="w-full mt-3" onClick={() => setContribFor(g)}>Add money</Button>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <Page>
      <PageHeader title="Goals" subtitle={`${formatMoney(totalSaved, cur)} saved toward ${formatMoney(totalTarget, cur)}${intoGoalsThisMonth > 0 ? ` · ${formatMoney(intoGoalsThisMonth, cur)} added this month` : ''}`}
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New goal</Button>} />

      {goals.length === 0 ? (
        <Card><EmptyState icon="Target" title="No goals yet" subtitle="Set a target, then move money from your savings toward it."
          action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Create goal</Button>} /></Card>
      ) : !isHousehold ? (
        renderGrid(goals)
      ) : (
        <div className="space-y-6">
          {family.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white/70"><Users size={15} /> Family goals</div>
              {renderGrid(family)}
            </div>
          )}
          {mine.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white/70"><User size={15} /> Your goals</div>
              {renderGrid(mine)}
            </div>
          )}
          {partners.map(({ member, list }) => list.length > 0 && (
            <div key={member.id}>
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white/70"><User size={15} /> {member.name}'s goals</div>
              {renderGrid(list)}
            </div>
          ))}
        </div>
      )}

      <NewGoalModal open={open} onClose={() => setOpen(false)} isHousehold={isHousehold} onSave={(g) => { addGoal(g); setOpen(false); }} />
      <ContributeModal goal={contribFor} onClose={() => setContribFor(null)} cur={cur} fx={fx}
        onContribute={(baseAmt) => { if (contribFor) contributeGoal(contribFor.id, baseAmt, userId ?? undefined); setContribFor(null); }} />
    </Page>
  );
}

const GOAL_CURRENCIES: CurrencyCode[] = ['RON', 'EUR', 'USD', 'GBP'];
function NewGoalModal({ open, onClose, onSave, isHousehold }: { open: boolean; onClose: () => void; onSave: (g: Omit<Goal, 'id' | 'createdAt'>) => void; isHousehold: boolean }) {
  const { settings, userId } = useStore();
  const base = settings.currency;
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [contrib, setContrib] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(base);
  const [scope, setScope] = useState<'family' | 'personal'>('family');
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
        {isHousehold && (
          <div>
            <Label>Who's this for?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setScope('family')} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm border ${scope === 'family' ? 'border-goal bg-goal/20 text-white' : 'border-white/10 bg-white/5 text-white/60'}`}><Users size={15} /> Family</button>
              <button type="button" onClick={() => setScope('personal')} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm border ${scope === 'personal' ? 'border-goal bg-goal/20 text-white' : 'border-white/10 bg-white/5 text-white/60'}`}><User size={15} /> Just me</button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><Label>Goal name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" /></div>
          <div><Label>Currency</Label><Select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>{GOAL_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Target amount</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" /></div>
          <div><Label>Already saved</Label><Input type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0.00" /></div>
        </div>
        <div><Label>Planned monthly amount (for the ETA)</Label><Input type="number" value={contrib} onChange={(e) => setContrib(e.target.value)} placeholder="0.00" /></div>
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
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}
          </div>
        </div>
        <Button className="w-full" disabled={!name || !target} onClick={() => onSave({ name, target: Number(target), saved: Number(saved) || 0, monthlyContribution: Number(contrib) || 0, icon, color, currency, owner: isHousehold && scope === 'personal' ? (userId ?? undefined) : undefined, contributions: [] })}>
          Create goal
        </Button>
      </div>
    </Modal>
  );
}

function ContributeModal({ goal, onClose, onContribute, cur, fx }: { goal: Goal | null; onClose: () => void; onContribute: (baseAmount: number) => void; cur: CurrencyCode; fx: Record<string, number> }) {
  const [amt, setAmt] = useState('');
  if (!goal) return null;
  const gc = goal.currency ?? cur;
  const rate = fx[gc] ?? 1;                       // lei per 1 unit of goal currency
  const baseAmount = Number(amt) || 0;            // entered in base currency (lei)
  const inGoal = baseAmount / rate;               // converted to the goal's currency
  const presets = [200, 500, 1000, 2500];
  return (
    <Modal open={!!goal} onClose={onClose} title={`Add money to ${goal.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-white/50">Move money from your savings into this goal. Currently {formatMoney(goal.saved, gc)} of {formatMoney(goal.target, gc)}.</p>
        <div>
          <Label>Amount from your savings ({currencySymbol(cur)})</Label>
          <Input type="number" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" autoFocus />
          {gc !== cur && baseAmount > 0 && (
            <p className="text-xs text-white/50 mt-1.5">≈ <span className="text-goal font-medium">{formatMoney(inGoal, gc)}</span> toward the goal (at {rate} {cur}/{gc})</p>
          )}
        </div>
        <div className="flex gap-2">{presets.map((v) => <button key={v} onClick={() => setAmt(String(v))} className="flex-1 rounded-lg bg-white/5 hover:bg-white/10 py-2 text-sm">{currencySymbol(cur)}{v}</button>)}</div>
        <Button className="w-full" disabled={baseAmount <= 0} onClick={() => onContribute(baseAmount)}>Add {baseAmount > 0 ? formatMoney(baseAmount, cur) : 'money'}</Button>
        <p className="text-[11px] text-white/40">This is recorded as money set aside — it doesn't count as spending, so your monthly savings figure stays intact.</p>
      </div>
    </Modal>
  );
}
