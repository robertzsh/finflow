import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Users, User, History, Pencil, Check, X, ArrowDownToLine, ArrowUpFromLine, Repeat } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStore } from '@/store/useStore';
import { useToday } from '@/hooks/useToday';
import { Page } from '@/components/PageTransition';
import { PageHeader, SectionCardHeader, SectionHeading } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Chip, IconPicker, ColorSwatchPicker } from '@/components/ui/Pickers';
import { staggered } from '@/lib/motion';
import { Input, Label, Select } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/Progress';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SavedPerMonthBars, SavingsArea } from '@/components/charts/ChartKit';
import { formatMoney, parseAmount, localDateKey, cx } from '@/lib/format';
import { monthStats } from '@/lib/finance';
import { potBalance, potChangeInMonth, savingsTotals, savedInMonth, savingsSeries, targetProgress } from '@/lib/savings';
import type { SavingsPot, CurrencyCode, AutoSaveRule } from '@/types';

const ICONS = ['PiggyBank', 'Landmark', 'Wallet', 'Gem', 'ShieldCheck', 'Building', 'Home', 'Plane', 'Car', 'Briefcase', 'TrendingUp', 'Gift'];
const POT_PRESETS: { name: string; icon: string; color: string }[] = [
  { name: 'Cont de economii', icon: 'Landmark', color: '#3b82f6' },
  { name: 'Revolut Vault', icon: 'Gem', color: '#14b8a6' },
  { name: 'Depozit', icon: 'ShieldCheck', color: '#6366f1' },
  { name: 'Cash acasă', icon: 'Wallet', color: '#22c55e' },
];
const CURRENCIES: CurrencyCode[] = ['RON', 'EUR', 'USD', 'GBP'];

export default function Savings() {
  const { savingsPots, transactions, settings, members, userId, cloud, authed, addPot, updatePot, deletePot, setMySavingsTarget } = useStore();
  const REF = useToday();
  const cur = settings.currency;
  const fx = settings.fxRates;
  const [newOpen, setNewOpen] = useState(false);
  const [editFor, setEditFor] = useState<SavingsPot | null>(null);
  const [moveFor, setMoveFor] = useState<{ pot: SavingsPot; dir: 1 | -1 } | null>(null);
  const [historyFor, setHistoryFor] = useState<SavingsPot | null>(null);

  const isHousehold = cloud && authed && members.length > 1;
  const totals = useMemo(() => savingsTotals(savingsPots, fx), [savingsPots, fx]);
  const series = useMemo(() => savingsSeries(savingsPots, 12, REF, fx), [savingsPots, REF, fx]);
  const thisMonth = savedInMonth(savingsPots, REF);
  const stats = useMemo(() => monthStats(transactions, REF), [transactions, REF]);
  const leftover = stats.income - stats.expense - thisMonth; // what's still in the main account from this month

  // Target rows: one per member in a household, else just you.
  const targetRows = isHousehold
    ? members.map((m) => ({ id: m.id, name: m.id === userId ? 'You' : m.name, target: m.savingsTarget, saved: savedInMonth(savingsPots, REF, m.id), mine: m.id === userId }))
    : [{ id: 'me', name: 'You', target: settings.savingsTarget ?? 0, saved: thisMonth, mine: true }];

  const joint = savingsPots.filter((p) => !p.owner);
  const mine = savingsPots.filter((p) => p.owner && p.owner === userId);
  const partners = members.filter((m) => m.id !== userId).map((m) => ({ member: m, list: savingsPots.filter((p) => p.owner === m.id) }));

  const renderGrid = (list: SavingsPot[]) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((p, i) => {
        const pc = p.currency ?? cur;
        const bal = potBalance(p);
        const change = potChangeInMonth(p, REF);
        return (
          <motion.div key={p.id} {...staggered(i, 0.04)}>
            <Card hover className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <CategoryIcon icon={p.icon} color={p.color} size={22} />
                <div className="flex items-center gap-0.5">
                  <IconButton size="sm" onClick={() => setHistoryFor(p)} title="History" aria-label="History"><History size={15} /></IconButton>
                  <IconButton size="sm" onClick={() => setEditFor(p)} title="Edit pot" aria-label="Edit pot"><Pencil size={15} /></IconButton>
                  <IconButton size="sm" onClick={() => { if (confirm(`Delete “${p.name}”? Its movements will be removed and the money counted back in your balance.`)) deletePot(p.id); }}
                    title="Delete pot" aria-label="Delete pot" className="hover:!text-expense"><Trash2 size={15} /></IconButton>
                </div>
              </div>
              <h3 className="text-lg font-semibold leading-snug mt-3 truncate">{p.name}</h3>
              <div className="metric-value font-display text-[1.7rem] font-semibold text-savings mt-1 truncate">{formatMoney(bal, pc)}</div>
              {pc !== cur && <p className="text-2xs text-ink-muted">≈ {formatMoney(bal * (fx[pc] ?? 1), cur)}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-2xs">
                {change !== 0 && <span className={change > 0 ? 'text-income' : 'text-expense'}>{formatMoney(change, pc, { sign: true })} this month</span>}
                {p.autoSave?.enabled && (
                  <Badge tone="pink" className="!text-2xs">
                    <Repeat size={11} /> {p.autoSave.mode === 'percent' ? `${p.autoSave.value}% of salary` : formatMoney(p.autoSave.value, pc)} on day {p.autoSave.day}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="ghost" onClick={() => setMoveFor({ pot: p, dir: 1 })}><ArrowDownToLine size={15} /> Deposit</Button>
                <Button variant="subtle" onClick={() => setMoveFor({ pot: p, dir: -1 })} disabled={bal <= 0}><ArrowUpFromLine size={15} /> Withdraw</Button>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <Page>
      <PageHeader title="Economii"
        subtitle={`${formatMoney(totals.total, cur)} saved${thisMonth !== 0 ? ` · ${formatMoney(thisMonth, cur, { sign: true })} this month` : ''}`}
        action={<Button onClick={() => setNewOpen(true)}><Plus size={16} /> New pot</Button>} />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 sm:p-5">
          <SectionCardHeader title="This month's target" hint={format(REF, 'MMMM yyyy')} />
          <div className="space-y-4 mt-3">
            {targetRows.map((r) => <TargetRow key={r.id} {...r} cur={cur} onSave={setMySavingsTarget} />)}
          </div>
          {leftover > 0 && (
            <p className="text-2xs text-ink-muted mt-4">
              Left over this month (income − spending − saved): <span className="text-ink-muted">{formatMoney(leftover, cur)}</span> — could go into a pot.
            </p>
          )}
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionCardHeader title="Saved per month" hint="Deposits − withdrawals, last 12 months" />
          <div className="mt-1"><SavedPerMonthBars data={series} height={200} /></div>
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionCardHeader title="Total in savings" hint={isHousehold ? `Joint ${formatMoney(totals.joint, cur, { compact: totals.joint > 99999 })}` : 'Across all pots'} />
          <div className="mt-1"><SavingsArea data={series.map((s) => ({ month: s.month, savings: s.cumulative }))} height={200} /></div>
        </Card>
      </div>

      {savingsPots.length === 0 ? (
        <Card><EmptyState icon="PiggyBank" title="No savings pots yet"
          subtitle="Add the places your savings sit — a savings account, a vault, cash at home. Deposits leave your main balance but never count as spending."
          action={<Button onClick={() => setNewOpen(true)}><Plus size={16} /> Create pot</Button>} /></Card>
      ) : !isHousehold ? (
        renderGrid(savingsPots)
      ) : (
        <div className="space-y-6">
          {joint.length > 0 && <Section icon={<Users size={15} />} title={`Joint pots · ${formatMoney(totals.joint, cur)}`}>{renderGrid(joint)}</Section>}
          {mine.length > 0 && <Section icon={<User size={15} />} title={`Your pots · ${formatMoney(totals.perOwner.get(userId!) ?? 0, cur)}`}>{renderGrid(mine)}</Section>}
          {partners.map(({ member, list }) => list.length > 0 && (
            <Section key={member.id} icon={<User size={15} />} title={`${member.name}'s pots · ${formatMoney(totals.perOwner.get(member.id) ?? 0, cur)}`}>{renderGrid(list)}</Section>
          ))}
        </div>
      )}

      <PotModal key={editFor?.id ?? 'new'} open={newOpen || !!editFor} existing={editFor} isHousehold={isHousehold}
        onClose={() => { setNewOpen(false); setEditFor(null); }}
        onSubmit={(data) => {
          if (editFor) updatePot(editFor.id, data);
          else addPot(data);
          setNewOpen(false); setEditFor(null);
        }} />
      <MoveModal target={moveFor} onClose={() => setMoveFor(null)} />
      <PotHistoryModal pot={historyFor} onClose={() => setHistoryFor(null)} />
    </Page>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <SectionHeading icon={icon} className="mb-3">{title}</SectionHeading>
      {children}
    </div>
  );
}

function TargetRow({ name, target, saved, mine, cur, onSave }: { name: string; target: number; saved: number; mine: boolean; cur: CurrencyCode; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const pct = targetProgress(saved, target);
  const save = () => { onSave(Math.max(0, parseAmount(val) || 0)); setEditing(false); };
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
        <span className="font-medium truncate">{name}</span>
        {editing ? (
          <span className="flex items-center gap-1">
            <Input type="text" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Monthly savings target"
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} className="!w-28 !py-1 text-right" autoFocus />
            <IconButton size="sm" onClick={save} aria-label="Save target" className="!text-income"><Check size={14} /></IconButton>
            <IconButton size="sm" onClick={() => setEditing(false)} aria-label="Cancel"><X size={14} /></IconButton>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-ink-muted tabular-nums">
            {formatMoney(saved, cur)}{target > 0 && <> / {formatMoney(target, cur)}</>}
            {mine && <IconButton size="sm" onClick={() => { setVal(target ? String(target) : ''); setEditing(true); }} aria-label="Set target"><Pencil size={13} /></IconButton>}
          </span>
        )}
      </div>
      {target > 0
        ? <ProgressBar value={pct} color={pct >= 100 ? 'rgb(var(--income))' : undefined} />
        : mine && !editing && <button onClick={() => { setVal(''); setEditing(true); }} className="text-xs font-medium text-accent-ink hover:underline underline-offset-2">Set a monthly target</button>}
      {target > 0 && <p className="text-2xs text-ink-muted mt-1">{pct >= 100 ? 'Target reached 🎉' : `${formatMoney(Math.max(0, target - saved), cur)} to go`}</p>}
    </div>
  );
}

type PotFields = Pick<SavingsPot, 'name' | 'icon' | 'color' | 'currency' | 'owner' | 'startBalance' | 'autoSave'>;
function PotModal({ open, onClose, onSubmit, isHousehold, existing }: { open: boolean; onClose: () => void; onSubmit: (p: PotFields) => void; isHousehold: boolean; existing?: SavingsPot | null }) {
  const { settings, userId } = useStore();
  const [name, setName] = useState(existing?.name ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(existing?.currency ?? settings.currency);
  const [start, setStart] = useState(existing ? String(existing.startBalance) : '');
  const [scope, setScope] = useState<'joint' | 'personal'>(existing?.owner ? 'personal' : 'joint');
  const [icon, setIcon] = useState(existing?.icon ?? 'PiggyBank');
  const [color, setColor] = useState(existing?.color ?? '#3b82f6');
  const [autoOn, setAutoOn] = useState(existing?.autoSave?.enabled ?? false);
  const [autoMode, setAutoMode] = useState<AutoSaveRule['mode']>(existing?.autoSave?.mode ?? 'fixed');
  const [autoVal, setAutoVal] = useState(existing?.autoSave ? String(existing.autoSave.value) : '');
  const [autoDay, setAutoDay] = useState(String(existing?.autoSave?.day ?? 1));
  const editing = !!existing;
  const autoValue = parseAmount(autoVal) || 0;
  const valid = !!name.trim() && (!autoOn || autoValue > 0);
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit pot' : 'New savings pot'}>
      <div className="space-y-4">
        {!editing && (
          <div>
            <Label>Quick start</Label>
            <div className="flex flex-wrap gap-1.5">
              {POT_PRESETS.map((p) => (
                <Chip key={p.name} selected={name === p.name} onClick={() => { setName(p.name); setIcon(p.icon); setColor(p.color); }}>
                  <CategoryIcon icon={p.icon} color={p.color} size={13} bg={false} /> {p.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {isHousehold && (
          <div>
            <Label>Whose pot is it?</Label>
            <Segmented fill ariaLabel="Whose pot is it?" value={scope} onChange={setScope}
              options={[{ value: 'joint', label: 'Joint', icon: <Users size={15} /> }, { value: 'personal', label: 'Just me', icon: <User size={15} /> }]} />
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ING savings" /></div>
          <div><Label>Currency</Label><Select aria-label="Pot currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></div>
        </div>
        <div>
          <Label>{editing ? 'Starting balance' : 'Already in it'}</Label>
          <Input type="text" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} placeholder="0,00" />
          <p className="text-2xs text-ink-muted mt-1">Money already there before you started tracking. It doesn't change your main balance.</p>
        </div>

        <div className="rounded-card border border-line bg-surface-2 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium"><Repeat size={15} className="text-accent" /> Auto-save every month</span>
            <Switch checked={autoOn} onChange={setAutoOn} label="Auto-save every month" />
          </div>
          {autoOn && (
            <>
              <Segmented fill ariaLabel="Auto-save mode" value={autoMode} onChange={setAutoMode}
                options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'percent', label: '% of salary' }]} />
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{autoMode === 'fixed' ? `Amount (${currency})` : 'Percent'}</Label>
                  <Input type="text" inputMode="decimal" value={autoVal} onChange={(e) => setAutoVal(e.target.value)} placeholder={autoMode === 'fixed' ? '0,00' : '10'} /></div>
                <div><Label>Day of month</Label>
                  <Select aria-label="Day of month" value={autoDay} onChange={(e) => setAutoDay(e.target.value)}>{Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</Select></div>
              </div>
              <p className="text-2xs text-ink-muted">
                {autoMode === 'percent' && settings.salary > 0 && autoValue > 0 && <>≈ {formatMoney(settings.salary * autoValue / 100, settings.currency)} of your {formatMoney(settings.salary, settings.currency)} salary. </>}
                On that day the money is moved into this pot automatically, once a month.{isHousehold && ' Your device posts it for your pots (and for joint pots you created).'}
              </p>
            </>
          )}
        </div>

        <div><Label>Icon</Label>
          <IconPicker icons={ICONS} value={icon} onChange={setIcon} color={color} />
        </div>
        <div><Label>Colour</Label>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </div>
        <Button className="w-full" disabled={!valid} onClick={() => onSubmit({
          name: name.trim(), currency, icon, color, startBalance: parseAmount(start) || 0,
          owner: isHousehold && scope === 'personal' ? (existing?.owner ?? userId ?? undefined) : undefined,
          autoSave: autoOn || existing?.autoSave
            ? { mode: autoMode, value: autoValue, day: Math.min(28, Math.max(1, Number(autoDay) || 1)), enabled: autoOn }
            : undefined,
        })}>
          {editing ? 'Save changes' : 'Create pot'}
        </Button>
      </div>
    </Modal>
  );
}

function MoveModal({ target, onClose }: { target: { pot: SavingsPot; dir: 1 | -1 } | null; onClose: () => void }) {
  const { settings, addMovement } = useStore();
  const cur = settings.currency;
  const [amt, setAmt] = useState('');
  const [inCur, setInCur] = useState<CurrencyCode>(target?.pot.currency ?? cur);
  const [date, setDate] = useState(localDateKey());
  const [note, setNote] = useState('');
  useEffect(() => { setAmt(''); setNote(''); setDate(localDateKey()); setInCur(target?.pot.currency ?? cur); }, [target, cur]);
  if (!target) return null;
  const { pot, dir } = target;
  const pc = pot.currency ?? cur;
  const raw = parseAmount(amt) || 0;
  const bal = potBalance(pot);
  const inPot = raw * (settings.fxRates[inCur] ?? 1) / (settings.fxRates[pc] ?? 1);
  const tooMuch = dir < 0 && inPot > bal + 0.005;
  const deposit = dir > 0;
  return (
    <Modal open onClose={onClose} title={deposit ? `Deposit into ${pot.name}` : `Withdraw from ${pot.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">Balance: <span className="text-savings font-semibold">{formatMoney(bal, pc)}</span></p>
        <div>
          <Label>Amount</Label>
          <div className="flex gap-2">
            <Input type="text" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0,00" autoFocus className="flex-1" aria-label="Amount" />
            <Select aria-label="Currency" value={inCur} onChange={(e) => setInCur(e.target.value as CurrencyCode)} className="!w-24">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          {inCur !== pc && raw > 0 && <p className="text-xs text-ink-muted mt-1.5">≈ {formatMoney(inPot, pc)} in the pot</p>}
          {tooMuch && <p className="text-xs text-expense mt-1.5">That's more than the pot holds.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date</Label><Input type="date" value={date} max={localDateKey()} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" /></div>
        </div>
        <Button className="w-full" disabled={!(raw > 0) || tooMuch || !date}
          onClick={() => { addMovement(pot.id, { amount: dir * raw, currency: inCur, date, note: note.trim() }); onClose(); }}>
          {deposit ? 'Deposit' : 'Withdraw'} {raw > 0 ? formatMoney(raw, inCur) : ''}
        </Button>
        <p className="text-2xs text-ink-muted">
          {deposit
            ? 'Moves money out of your main balance into this pot. It isn’t counted as spending.'
            : 'Moves money back into your main balance. It isn’t counted as income.'}
        </p>
      </div>
    </Modal>
  );
}

function PotHistoryModal({ pot, onClose }: { pot: SavingsPot | null; onClose: () => void }) {
  const members = useStore((s) => s.members);
  const cur = useStore((s) => s.settings.currency);
  const updateMovement = useStore((s) => s.updateMovement);
  const removeMovement = useStore((s) => s.removeMovement);
  // Read the live pot so edits/removals show immediately (the prop is a snapshot).
  const live = useStore((s) => (pot ? s.savingsPots.find((p) => p.id === pot.id) : undefined));
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  if (!pot) return null;
  const p = live ?? pot;
  const pc = p.currency ?? cur;
  const nameOf = (id?: string) => members.find((m) => m.id === id)?.name;
  const groups = new Map<string, typeof p.movements>();
  for (const m of p.movements) { const k = m.date.slice(0, 7); groups.set(k, [...(groups.get(k) ?? []), m]); }
  const months = [...groups.keys()].sort().reverse();
  const saveEdit = (id: string, sign: number) => { const v = parseAmount(editVal); if (v > 0) updateMovement(p.id, id, sign * v); setEditId(null); };
  return (
    <Modal open onClose={onClose} title={`${p.name} — history`}>
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">Balance: <span className="text-savings font-semibold">{formatMoney(potBalance(p), pc)}</span>
          {p.movements.length > 0 && <> · {p.movements.length} movement{p.movements.length > 1 ? 's' : ''}</>}</p>
        {months.map((mk) => {
          const list = [...groups.get(mk)!].sort((a, b) => (a.date < b.date ? 1 : -1));
          const net = list.reduce((a, m) => a + m.amount, 0);
          return (
            <div key={mk}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">{format(parseISO(mk + '-01'), 'MMMM yyyy')}</span>
                <span className={cx('text-sm font-semibold', net >= 0 ? 'text-income' : 'text-expense')}>{formatMoney(net, pc, { sign: true })}</span>
              </div>
              <div className="space-y-1.5">
                {list.map((m) => {
                  const editing = editId === m.id;
                  const sign = m.amount < 0 ? -1 : 1;
                  return (
                    <div key={m.id} className="group flex items-center gap-2 text-xs rounded-control bg-surface-2 border border-line px-3 py-2">
                      <span className="text-ink-muted flex-1 truncate">
                        {format(parseISO(m.date), 'EEE d MMM yyyy')}{nameOf(m.by) ? ` · ${nameOf(m.by)}` : ''}{m.note ? ` · ${m.note}` : ''}
                      </span>
                      {editing ? (
                        <>
                          <Input type="text" inputMode="decimal" value={editVal} onChange={(e) => setEditVal(e.target.value)} aria-label="Movement amount"
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(m.id, sign); if (e.key === 'Escape') setEditId(null); }} className="!w-28 !py-1 text-right" autoFocus />
                          <IconButton size="sm" onClick={() => saveEdit(m.id, sign)} aria-label="Save" className="!text-income"><Check size={14} /></IconButton>
                          <IconButton size="sm" onClick={() => setEditId(null)} aria-label="Cancel"><X size={14} /></IconButton>
                        </>
                      ) : (
                        <>
                          <span className={cx('font-medium tabular-nums', m.amount >= 0 ? 'text-ink' : 'text-expense')}>{formatMoney(m.amount, pc, { sign: true })}</span>
                          <div className="flex items-center opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                            <IconButton size="sm" onClick={() => { setEditId(m.id); setEditVal(String(Math.abs(m.amount))); }} aria-label="Edit movement"><Pencil size={13} /></IconButton>
                            <IconButton size="sm" onClick={() => removeMovement(p.id, m.id)} aria-label="Delete movement" className="hover:!text-expense"><Trash2 size={13} /></IconButton>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {p.startBalance > 0 && (
          <div className="flex items-center justify-between text-xs rounded-control bg-surface-2 px-3 py-2 border border-line">
            <span className="text-ink-muted">Starting balance</span>
            <span className="font-medium text-ink-muted">{formatMoney(p.startBalance, pc)}</span>
          </div>
        )}
        {p.movements.length === 0 && p.startBalance <= 0 && <p className="text-sm text-ink-muted">Nothing moved yet. Use Deposit to record your first one.</p>}
      </div>
    </Modal>
  );
}
