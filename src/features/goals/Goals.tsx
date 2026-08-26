import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Users, User, History, Pencil } from 'lucide-react';
import { isSameMonth, parseISO, format, differenceInCalendarMonths } from 'date-fns';
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
import { formatMoney, currencySymbol, parseAmount } from '@/lib/format';
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

/** Effective monthly funding rate (in the goal's own currency): actual pace if there are
 *  contributions, otherwise the planned monthly amount. `rate` is lei per goal-currency unit. */
function monthlyRate(g: Goal, rate: number): number {
  const contribs = g.contributions ?? [];
  if (contribs.length) {
    const totalBase = contribs.reduce((a, c) => a + c.amount, 0);
    const first = contribs.reduce((min, c) => (c.date < min ? c.date : min), contribs[0].date);
    const months = Math.max(1, differenceInCalendarMonths(new Date(), parseISO(first)) + 1);
    return (totalBase / rate) / months; // base → goal currency, per month
  }
  return g.monthlyContribution;
}
function goalEta(g: Goal, rate: number): string {
  const remaining = g.target - g.saved;
  if (remaining <= 0) return 'Completed';
  const monthly = monthlyRate(g, rate);
  if (!monthly || monthly <= 0) return 'add money to estimate';
  const months = Math.ceil(remaining / monthly);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return format(d, 'MMM yyyy');
}

export default function Goals() {
  const { goals, settings, members, userId, cloud, authed, addGoal, updateGoal, deleteGoal, contributeGoal } = useStore();
  const cur = settings.currency;
  const fx = settings.fxRates;
  const [open, setOpen] = useState(false);
  const [editFor, setEditFor] = useState<Goal | null>(null);
  const [contribFor, setContribFor] = useState<Goal | null>(null);
  const [historyFor, setHistoryFor] = useState<Goal | null>(null);

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
        const rate = fx[gc] ?? 1;
        const monthly = monthlyRate(g, rate);
        const contribs = g.contributions ?? [];
        const thisMonth = contribs.filter((c) => isSameMonth(parseISO(c.date), NOW)).reduce((s, c) => s + c.amount, 0);
        const lastContrib = contribs.length ? [...contribs].sort((a, b) => (a.date < b.date ? 1 : -1))[0] : null;
        return (
          <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card hover className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <CategoryIcon icon={g.icon} color={g.color} size={22} />
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setHistoryFor(g)} title="Contribution history" className="text-white/25 hover:text-white p-1"><History size={15} /></button>
                  <button onClick={() => setEditFor(g)} title="Edit goal" className="text-white/25 hover:text-white p-1"><Pencil size={15} /></button>
                  <button onClick={() => deleteGoal(g.id)} title="Delete goal" className="text-white/25 hover:text-expense p-1"><Trash2 size={15} /></button>
                </div>
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
                {monthly > 0 && <>at {formatMoney(monthly, gc, { compact: monthly > 9999 })}/mo · </>}
                <span className="text-white/70">{goalEta(g, rate)}</span>
              </p>
              {thisMonth > 0 && <p className="text-[11px] text-goal text-center mt-1">+{formatMoney(thisMonth, cur)} added this month</p>}
              {lastContrib && <p className="text-[10px] text-white/35 text-center">last added {format(parseISO(lastContrib.date), 'd MMM yyyy')}</p>}
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

      <GoalModal key={editFor?.id ?? 'new'} open={open || !!editFor} existing={editFor} isHousehold={isHousehold}
        onClose={() => { setOpen(false); setEditFor(null); }}
        onSubmit={(data) => {
          if (editFor) updateGoal(editFor.id, data);
          else addGoal({ ...data, contributions: [] });
          setOpen(false); setEditFor(null);
        }} />
      <ContributeModal goal={contribFor} onClose={() => setContribFor(null)} cur={cur} fx={fx}
        onContribute={(baseAmt) => { if (contribFor) contributeGoal(contribFor.id, baseAmt, userId ?? undefined); setContribFor(null); }} />
      <GoalHistoryModal goal={historyFor} onClose={() => setHistoryFor(null)} cur={cur} fx={fx} />
    </Page>
  );
}

const GOAL_CURRENCIES: CurrencyCode[] = ['RON', 'EUR', 'USD', 'GBP'];
type GoalFields = Pick<Goal, 'name' | 'target' | 'saved' | 'monthlyContribution' | 'icon' | 'color' | 'currency' | 'owner'>;
function GoalModal({ open, onClose, onSubmit, isHousehold, existing }: { open: boolean; onClose: () => void; onSubmit: (g: GoalFields) => void; isHousehold: boolean; existing?: Goal | null }) {
  const { settings, userId } = useStore();
  const base = settings.currency;
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing ? String(existing.target) : '');
  const [saved, setSaved] = useState(existing ? String(existing.saved) : '');
  const [contrib, setContrib] = useState(existing ? String(existing.monthlyContribution) : '');
  const [currency, setCurrency] = useState<CurrencyCode>((existing?.currency as CurrencyCode) ?? base);
  const [scope, setScope] = useState<'family' | 'personal'>(existing?.owner ? 'personal' : 'family');
  const [icon, setIcon] = useState(existing?.icon ?? 'Target');
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const editing = !!existing;
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit goal' : 'New savings goal'}>
      <div className="space-y-4">
        {!editing && (
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
        )}
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
          <div><Label>Target amount</Label><Input type="text" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" /></div>
          <div><Label>{editing ? 'Saved so far' : 'Already saved'}</Label><Input type="text" inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0,00" /></div>
        </div>
        <div><Label>Planned monthly amount (for the ETA)</Label><Input type="text" inputMode="decimal" value={contrib} onChange={(e) => setContrib(e.target.value)} placeholder="0,00" /></div>
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
        {editing && <p className="text-[11px] text-white/40">Editing the target or saved amount here adjusts the goal directly — it isn't logged in the contribution history. Use “Add money” to record a dated contribution.</p>}
        <Button className="w-full" disabled={!name || !target} onClick={() => onSubmit({ name, target: parseAmount(target) || 0, saved: parseAmount(saved) || 0, monthlyContribution: parseAmount(contrib) || 0, icon, color, currency, owner: isHousehold && scope === 'personal' ? (userId ?? undefined) : undefined })}>
          {editing ? 'Save changes' : 'Create goal'}
        </Button>
      </div>
    </Modal>
  );
}

function GoalHistoryModal({ goal, onClose, cur, fx }: { goal: Goal | null; onClose: () => void; cur: CurrencyCode; fx: Record<string, number> }) {
  const members = useStore((s) => s.members);
  if (!goal) return null;
  const nameOf = (id?: string) => members.find((m) => m.id === id)?.name;
  const gc = (goal.currency as CurrencyCode) ?? cur;
  const rate = fx[gc] ?? 1;                      // lei per 1 unit of goal currency
  const toGoal = (baseAmt: number) => baseAmt / rate; // stored contributions are in base lei
  const all = goal.contributions ?? [];
  const groups = new Map<string, typeof all>();
  for (const c of all) { const k = c.date.slice(0, 7); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(c); }
  const months = [...groups.keys()].sort().reverse();
  const trackedGoal = all.reduce((a, c) => a + toGoal(c.amount), 0);
  const opening = goal.saved - trackedGoal;      // amount saved before/outside tracked contributions
  return (
    <Modal open={!!goal} onClose={onClose} title={`${goal.name} — contribution history`}>
      <div className="space-y-4">
        <p className="text-sm text-white/50">
          Saved so far: <span className="text-goal font-semibold">{formatMoney(goal.saved, gc)}</span>
          {all.length > 0 && <> · {all.length} logged contribution{all.length > 1 ? 's' : ''}</>}
        </p>
        {months.map((mk) => {
          const list = [...groups.get(mk)!].sort((a, b) => (a.date < b.date ? 1 : -1));
          const monthTotal = list.reduce((a, c) => a + toGoal(c.amount), 0);
          return (
            <div key={mk}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">{format(parseISO(mk + '-01'), 'MMMM yyyy')}</span>
                <span className="text-sm text-goal font-semibold">+{formatMoney(monthTotal, gc)}</span>
              </div>
              <div className="space-y-1.5">
                {list.map((c, i) => {
                  const hasTime = c.date.length > 10;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs rounded-lg bg-white/[0.03] px-3 py-2">
                      <span className="text-white/60">{format(parseISO(c.date), hasTime ? 'EEE d MMM yyyy · HH:mm' : 'EEE d MMM yyyy')}{nameOf(c.by) ? ` · ${nameOf(c.by)}` : ''}</span>
                      <span className="font-medium text-white/80">+{formatMoney(toGoal(c.amount), gc)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {opening > 0.01 && (
          <div className="flex items-center justify-between text-xs rounded-lg bg-white/[0.03] px-3 py-2 border border-white/5">
            <span className="text-white/50">Starting amount (set when the goal was created)</span>
            <span className="font-medium text-white/70">{formatMoney(opening, gc)}</span>
          </div>
        )}
        {all.length === 0 && opening <= 0.01 && (
          <p className="text-sm text-white/50">No money added yet. Use “Add money” to record your first dated contribution.</p>
        )}
      </div>
    </Modal>
  );
}

function ContributeModal({ goal, onClose, onContribute, cur, fx }: { goal: Goal | null; onClose: () => void; onContribute: (baseAmount: number) => void; cur: CurrencyCode; fx: Record<string, number> }) {
  const [amt, setAmt] = useState('');
  if (!goal) return null;
  const gc = goal.currency ?? cur;
  const rate = fx[gc] ?? 1;                       // lei per 1 unit of goal currency
  const baseAmount = parseAmount(amt) || 0;       // entered in base currency (lei)
  const inGoal = baseAmount / rate;               // converted to the goal's currency
  const presets = [200, 500, 1000, 2500];
  return (
    <Modal open={!!goal} onClose={onClose} title={`Add money to ${goal.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-white/50">Move money from your savings into this goal. Currently {formatMoney(goal.saved, gc)} of {formatMoney(goal.target, gc)}.</p>
        <div>
          <Label>Amount from your savings ({currencySymbol(cur)})</Label>
          <Input type="text" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0,00" autoFocus />
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
