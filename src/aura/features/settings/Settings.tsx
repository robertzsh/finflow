import { useRef, useState, useEffect, useMemo } from 'react';
import { Moon, Sun, Shield, Download, Upload, Database, Trash2, Plus, Fingerprint, Lock, Users, LogOut, Copy, Check, UserPlus, RefreshCw, Bell, Heart } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { pushSupported, isIos, isStandalone, localTz, enablePush, disablePush, setReminderTimes, reminderState } from '@/lib/push';
import { Page } from '@/aura/components/PageTransition';
import { PageHeader, SectionCardHeader } from '@/aura/components/layout/PageHeader';
import { Card } from '@/aura/components/ui/Card';
import { Button, IconButton } from '@/aura/components/ui/Button';
import { Switch } from '@/aura/components/ui/Switch';
import { Callout } from '@/aura/components/ui/Callout';
import { ColorSwatchPicker } from '@/aura/components/ui/Pickers';
import { Input, Select, Label } from '@/aura/components/ui/Field';
import { CategoryIcon } from '@/aura/components/ui/CategoryIcon';
import { tagStyle } from '@/aura/components/ui/Badge';
import { ProgressBar } from '@/aura/components/ui/Progress';
import { Modal } from '@/aura/components/ui/Modal';
import { exportJSON, parseBankCSV } from '@/lib/export';
import { parseBackup } from '@/lib/validate';
import { spendingByCategory } from '@/lib/finance';
import { currencySymbol, parseAmount, formatMoney, cx } from '@/lib/format';
import { memberColor } from '@/aura/lib/palette';
import type { AppData, CurrencyCode, Category } from '@/types';

export default function Settings() {
  const store = useStore();
  const { settings, categories, updateSettings, restore, resetAll, addCategory, updateCategory, deleteCategory, importTransactions, transactions, budgets, goals, investments, savingsPots } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [msg, setMsg] = useState('');

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 2500); }

  function backup() {
    exportJSON({ transactions, categories, budgets, goals, investments, savingsPots, settings } as AppData, 'finflow-backup');
    flash('Backup downloaded');
  }
  function onRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = parseBackup(JSON.parse(r.result as string));
        if (!parsed.success) { flash('That file isn’t a valid FinFlow backup'); return; }
        restore(parsed.data as unknown as AppData);
        flash('Data restored');
      } catch { flash('Invalid backup file'); }
    };
    r.readAsText(f);
  }
  function onCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { const rows = parseBankCSV(r.result as string, categories); importTransactions(rows); flash(`Imported ${rows.length} transactions`); };
    r.readAsText(f);
  }

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Preferences, security and data" />
      {msg && <Callout tone="green" icon={<Check size={16} />} className="mb-4">{msg}</Callout>}

      {store.cloud && store.authed && <HouseholdCard flash={flash} />}
      {store.cloud && store.authed && <RemindersCard />}
      <BudgetsCard />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Preferences */}
        <Card className="p-5">
          <SectionCardHeader title="Preferences" />
          <div className="space-y-4">
            <div><Label>Your name</Label><Input value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} /></div>
            <OpeningBalanceField />
            {store.cloud && store.authed && store.members.length > 1 && (
              <p className="text-xs text-ink-muted -mt-2">Household total: <span className="text-ink-muted font-medium">{store.privacy ? '••••' : `${currencySymbol(settings.currency)}${store.members.reduce((a, m) => a + m.openingBalance, 0).toLocaleString('en-GB')}`}</span> — the sum of every member's balance.</p>
            )}
            <MonthlyIncomeField />
            <div><Label>Base currency</Label>
              <Select aria-label="Base currency" value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value as CurrencyCode })}>
                <option value="RON">lei RON — Leu românesc</option>
                <option value="EUR">€ EUR — Euro</option>
                <option value="USD">$ USD — US Dollar</option>
                <option value="GBP">£ GBP — British Pound</option>
              </Select>
              <p className="text-xs text-ink-muted mt-1.5">Everyday transactions and budgets use this. Goals & investments can each use their own currency.</p>
            </div>
            <div>
              <Label>Exchange rates (per 1 unit, in {currencySymbol(settings.currency)})</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['EUR', 'USD', 'GBP'] as CurrencyCode[]).map((c) => (
                  <div key={c} className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-muted pointer-events-none">{c}</span>
                    <Input type="number" step="0.01" key={settings.fxRates[c]} defaultValue={settings.fxRates[c]} aria-label={`${c} rate`}
                      onBlur={(e) => updateSettings({ fxRates: { ...settings.fxRates, [c]: Number(e.target.value) || settings.fxRates[c] } })}
                      className="!pl-11 tabular-nums" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="ghost" onClick={async () => { const ok = await store.refreshRates(); flash(ok ? 'Rates updated from today’s market' : 'Couldn’t reach the rates service'); }}>
                  <RefreshCw size={14} /> Update rates now
                </Button>
                <span className="text-xs text-ink-muted">Auto-updates daily · lei per 1 unit</span>
              </div>
            </div>
            <div>
              <Label>Live stock prices — Finnhub API key</Label>
              <Input type="password" key={settings.finnhubKey ?? ''} defaultValue={settings.finnhubKey ?? ''}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== (settings.finnhubKey ?? '')) { updateSettings({ finnhubKey: v || undefined }); flash(v ? 'Finnhub key saved' : 'Finnhub key removed'); } }}
                placeholder="Paste your free Finnhub key" />
              <p className="text-xs text-ink-muted mt-1.5">Free key from <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" className="font-medium text-accent-ink hover:underline underline-offset-2">finnhub.io</a> · powers live stock/ETF quotes in Investments. Crypto is already live (no key). Stored on this device only.</p>
            </div>
            <div>
              <Label>Appearance</Label>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Theme">
                {THEMES.map((t) => {
                  const on = settings.theme === t.id;
                  return (
                    <button key={t.id} onClick={() => updateSettings({ theme: t.id })} aria-pressed={on}
                      className={cx('rounded-card border p-1.5 text-left transition', on ? 'border-accent ring-2 ring-accent/25' : 'border-line hover:border-line-strong')}>
                      {/* A miniature of the theme: its page, a card and the accent */}
                      <span aria-hidden className="relative block h-12 overflow-hidden rounded-control" style={{ background: t.preview.page }}>
                        <span className="absolute left-2 right-5 top-4 bottom-0 rounded-t-[4px]" style={{ background: t.preview.card, boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
                        <span className="absolute left-3.5 top-6 h-1.5 w-7 rounded-full" style={{ background: t.preview.accent }} />
                        <span className="absolute left-3.5 top-9 h-1 w-10 rounded-full opacity-30" style={{ background: t.preview.ink }} />
                      </span>
                      <span className="flex items-center gap-1.5 px-1 pt-1.5 pb-0.5 text-sm font-medium"><t.icon size={14} className="shrink-0" /> <span className="truncate">{t.label}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-5">
          <SectionCardHeader title="Security" />
          <div className="space-y-3">
            <ToggleRow icon={<Lock size={16} />} title="PIN lock" desc="Require a PIN to open the app"
              checked={settings.pinEnabled} onChange={(v) => updateSettings({ pinEnabled: v })} />
            {settings.pinEnabled && (
              <div className="flex gap-2">
                <Input placeholder="Set 4–6 digit PIN" maxLength={6} value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} />
                <Button onClick={() => { updateSettings({ pin: pinInput }); setPinInput(''); flash('PIN saved'); }} disabled={pinInput.length < 4}>Save</Button>
              </div>
            )}
            <ToggleRow icon={<Fingerprint size={16} />} title="Biometric login" desc="Show biometric unlock option"
              checked={settings.biometric} onChange={(v) => updateSettings({ biometric: v })} />
            <div>
              <Label>Auto-lock after inactivity</Label>
              <Select aria-label="Auto-lock after inactivity" value={settings.sessionTimeoutMin} onChange={(e) => updateSettings({ sessionTimeoutMin: Number(e.target.value) })}>
                <option value={5}>5 minutes</option><option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option><option value={60}>1 hour</option>
              </Select>
            </div>
            <p className="text-xs text-ink-muted flex items-center gap-1.5"><Shield size={12} /> Stored in your browser (IndexedDB) and, when signed in, synced to your private account.</p>
          </div>
        </Card>

        {/* Categories */}
        <Card className="p-5">
          <SectionCardHeader title="Categories" hint={`${categories.length} total`}
            action={<Button variant="ghost" onClick={() => setCatOpen(true)}><Plus size={15} /> Add</Button>} />
          <p className="text-xs text-ink-muted mb-2">Tap a category to change its name, emoji, icon or colour.</p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
            {categories.map((c) => (
              <span key={c.id} className="inline-flex items-center rounded-tag text-xs font-medium transition hover:brightness-95" style={tagStyle(c.color)}>
                <button type="button" onClick={() => setEditCat(c)} className="flex items-center gap-1.5 px-2 py-1">
                  <CategoryIcon icon={c.icon} color={c.color} size={13} bg={false} emoji={c.emoji} />{c.name}
                </button>
                {c.custom && <button onClick={() => deleteCategory(c.id)} aria-label={`Delete ${c.name}`} className="pr-1.5 -ml-0.5 opacity-60 hover:opacity-100 hover:text-expense">×</button>}
              </span>
            ))}
          </div>
        </Card>

        {/* Data */}
        <Card className="p-5">
          <SectionCardHeader title="Data & backup" />
          <div className="space-y-2">
            <Button variant="ghost" className="w-full !justify-start" onClick={backup}><Download size={16} /> Export all data (JSON backup)</Button>
            <Button variant="ghost" className="w-full !justify-start" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restore from backup</Button>
            <Button variant="ghost" className="w-full !justify-start" onClick={() => csvRef.current?.click()}><Database size={16} /> Import bank CSV</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onRestore} />
            <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={onCSV} />
            {store.cloud && store.authed ? (
              <Callout tone="green" icon={<Database size={16} />} title="Cloud sync is on" className="mt-2">
                Your data lives in your household and syncs live across all devices & browsers. Export below is just for manual snapshots.
              </Callout>
            ) : (
              <Callout tone="gray" icon={<Database size={16} />} className="mt-2">
                <span className="text-xs text-ink-muted">Local mode — data is stored only in this browser. Use Export to keep a backup, or connect an account for cloud sync.</span>
              </Callout>
            )}
            <Button variant="danger" className="w-full !justify-start mt-2"
              onClick={() => { if (confirm('Reset all data to sample data? This cannot be undone.')) { resetAll(); flash('Data reset'); } }}>
              <Trash2 size={16} /> Reset all data
            </Button>
          </div>
        </Card>
      </div>

      <CategoryModal open={catOpen} onClose={() => setCatOpen(false)} onSave={(c) => { addCategory(c); setCatOpen(false); }} />
      <CategoryModal open={!!editCat} existing={editCat ?? undefined} onClose={() => setEditCat(null)} onSave={(c) => { if (editCat) updateCategory(editCat.id, c); setEditCat(null); }} />
    </Page>
  );
}

function BudgetsCard() {
  const { budgets, transactions, categories, settings, setBudget, removeBudget, cloud, authed, members } = useStore();
  const cur = settings.currency;
  const family = cloud && authed && members.length > 1;
  const spent = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of spendingByCategory(transactions, categories, new Date())) m.set(c.id, c.value);
    return m;
  }, [transactions, categories]);
  const cats = categories.filter((c) => c.kind === 'expense' && !c.parent);
  const byCat = new Map(budgets.map((b) => [b.categoryId, b] as const));
  return (
    <Card className="p-5 mb-4">
      <SectionCardHeader title="Budgets" hint={`Monthly limit per category · ${family ? 'shared with your family' : 'just for you'}`} />
      <div className="space-y-3 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
        {cats.map((c) => {
          const b = byCat.get(c.id);
          const limit = b?.amount ?? 0;
          const used = spent.get(c.id) ?? 0;
          const pct = limit > 0 ? (used / limit) * 100 : 0;
          const over = limit > 0 && used > limit;
          return (
            <div key={c.id} className="flex items-center gap-3">
              <CategoryIcon icon={c.icon ?? 'Circle'} color={c.color} size={18} emoji={c.emoji} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-sm truncate">{c.name}</span>
                  <span className={`text-2xs tabular-nums ${over ? 'text-expense' : 'text-ink-muted'}`}>{formatMoney(used, cur)}{limit > 0 ? ` / ${formatMoney(limit, cur)}` : ''}</span>
                </div>
                {limit > 0 && <div className="mt-1"><ProgressBar value={pct} color={c.color} danger={over} /></div>}
              </div>
              <Input type="text" inputMode="decimal" key={limit} defaultValue={limit || ''} placeholder="Set" className="!w-24 !py-1.5 text-right"
                onBlur={(e) => { const v = parseAmount(e.target.value) || 0; if (v > 0) setBudget(c.id, v); else if (b) removeBudget(b.id); }} />
            </div>
          );
        })}
      </div>
      <p className="text-2xs text-ink-muted mt-3">Type a monthly limit for any category; clear it to remove. Progress tracks {family ? "the whole family's" : 'your'} spending this month.</p>
    </Card>
  );
}

function reasonText(reason: string) {
  switch (reason) {
    case 'denied': return 'Notifications are blocked. Enable them for this site in your phone/browser settings, then try again.';
    case 'unsupported': return 'This device doesn’t support push notifications.';
    case 'novapid': return 'Push isn’t configured yet — deploy the reminder function first.';
    default: return 'Couldn’t turn on reminders. Please try again.';
  }
}

function RemindersCard() {
  const [status, setStatus] = useState<'loading' | 'off' | 'on'>('loading');
  const [hours, setHours] = useState<number[]>([10, 22]);
  const [addHour, setAddHour] = useState(9);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const supported = pushSupported();
  const iosNeedsInstall = isIos() && !isStandalone();

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supported) { setStatus('off'); return; }
      const st = await reminderState();
      if (!alive) return;
      if (st) { setHours(st.hours); setStatus(st.on ? 'on' : 'off'); } else setStatus('off');
    })();
    return () => { alive = false; };
  }, [supported]);

  async function persist(next: number[]) {
    if (status === 'on') { try { await setReminderTimes(next, localTz()); } catch { /* ignore */ } }
  }
  function addTime() {
    if (hours.includes(addHour)) return;
    const next = [...hours, addHour].sort((a, b) => a - b);
    setHours(next); persist(next);
  }
  function removeTime(h: number) {
    const next = hours.filter((x) => x !== h);
    setHours(next); persist(next);
  }
  async function toggle() {
    setErr(''); setBusy(true);
    try {
      if (status === 'on') { await disablePush(); setStatus('off'); }
      else {
        const times = hours.length ? hours : [10, 22];
        const r = await enablePush(times, localTz());
        if (r.ok) { setHours(times); setStatus('on'); } else setErr(reasonText(r.reason));
      }
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-5 mb-4">
      <SectionCardHeader title="Daily reminders" hint="Phone notifications so you never forget to log a transaction" />
      {!supported ? (
        <p className="text-sm text-ink-muted">{iosNeedsInstall
          ? 'On iPhone, add FinFlow to your Home Screen first (Share → Add to Home Screen), then open it from the icon to turn on reminders.'
          : 'This browser doesn’t support push notifications.'}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-control bg-accent-soft p-2"><Bell size={18} className="text-accent" /></span>
              <div>
                <div className="text-sm font-medium">Remind me every day</div>
                <div className="text-xs text-ink-muted">{status === 'on' ? `On · ${hours.map((h) => `${String(h).padStart(2, '0')}:00`).join(' & ')}` : status === 'loading' ? '…' : 'Off'}</div>
              </div>
            </div>
            <Switch checked={status === 'on'} onChange={() => toggle()} disabled={busy || status === 'loading'} label="Toggle daily reminders" />
          </div>

          <div>
            <Label>Reminder times</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {hours.length === 0 && <span className="text-xs text-ink-muted">No times set.</span>}
              {hours.map((h) => (
                <span key={h} className="inline-flex items-center gap-1 rounded-tag bg-tag-pink-bg text-tag-pink-fg pl-2 pr-0.5 py-0.5 text-sm tabular-nums">
                  {String(h).padStart(2, '0')}:00
                  <IconButton size="sm" onClick={() => removeTime(h)} aria-label={`Remove ${h}:00`} className="!h-6 !w-6 !text-current hover:!text-expense"><Trash2 size={13} /></IconButton>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Select aria-label="Reminder time" value={addHour} onChange={(e) => setAddHour(Number(e.target.value))} className="flex-1">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h} disabled={hours.includes(h)}>{String(h).padStart(2, '0')}:00</option>)}
              </Select>
              <Button variant="ghost" onClick={addTime} disabled={hours.includes(addHour)}><Plus size={15} /> Add time</Button>
            </div>
          </div>

          {iosNeedsInstall && <p className="text-2xs text-ink-muted">On iPhone, open FinFlow from its Home Screen icon — notifications don’t work in the Safari tab.</p>}
          {err && <p className="text-xs text-expense">{err}</p>}
          <p className="text-2xs text-ink-muted">Times use this device’s timezone. Morning and evening reminders use different messages. Set this on each device; Iulia sets her own on her phone.</p>
        </div>
      )}
    </Card>
  );
}

function MonthlyIncomeField() {
  const { cloud, authed, userId, members, settings, setMyIncome } = useStore();
  const privacy = useStore((s) => s.privacy);
  const me = cloud && authed ? members.find((m) => m.id === userId) : null;
  const curSalary = me ? me.salary : settings.salary;
  const curVouchers = me ? me.vouchers : settings.vouchers;
  const [salary, setSalary] = useState(String(curSalary || ''));
  const [vouchers, setVouchers] = useState(String(curVouchers || ''));
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSalary(String(curSalary || '')); setVouchers(String(curVouchers || '')); }, [curSalary, curVouchers]);

  const dirty = (parseAmount(salary) || 0) !== curSalary || (parseAmount(vouchers) || 0) !== curVouchers;
  return (
    <div className="rounded-card bg-surface-2 border border-line p-3.5">
      <Label>Monthly income (auto-added each month)</Label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-2xs text-ink-muted">Salary (fixed)</span>
          <Input type={privacy ? 'password' : 'text'} inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 9500" />
        </div>
        <div>
          <span className="text-2xs text-ink-muted">Bonuri (default)</span>
          <Input type={privacy ? 'password' : 'text'} inputMode="decimal" value={vouchers} onChange={(e) => setVouchers(e.target.value)} placeholder="e.g. 600" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button variant={dirty ? 'primary' : 'ghost'} disabled={!dirty}
          onClick={async () => { await setMyIncome(parseAmount(salary) || 0, parseAmount(vouchers) || 0); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
          {saved ? <><Check size={14} /> Saved</> : 'Save income'}
        </Button>
        <span className="text-xs text-ink-muted">Salary + Bonuri post automatically on the 1st. Bonuri vary by month — edit that month's Bonuri entry in Transactions.</span>
      </div>
    </div>
  );
}

function OpeningBalanceField() {
  const { cloud, authed, userId, members, settings, setMyOpeningBalance } = useStore();
  const privacy = useStore((s) => s.privacy);
  const mine = cloud && authed ? (members.find((m) => m.id === userId)?.openingBalance ?? 0) : settings.openingBalance;
  const shared = cloud && authed;
  return (
    <div>
      <Label>{shared ? 'Your starting balance' : 'Opening / current balance'} ({currencySymbol(settings.currency)})</Label>
      <Input type={privacy ? 'password' : 'text'} inputMode="decimal" key={mine} defaultValue={mine}
        onBlur={(e) => setMyOpeningBalance(parseAmount(e.target.value) || 0)} />
      <p className="text-xs text-ink-muted mt-1.5">
        {shared
          ? 'Your part of the household balance. Both members’ balances add up, then shared income and expenses adjust the family total.'
          : 'Your starting balance. Income adds to it and expenses subtract, so the balance stays in sync with what you have.'}
      </p>
    </div>
  );
}

function HouseholdCard({ flash }: { flash: (t: string) => void }) {
  const { householdName, inviteCode, members, userId, joinHousehold, signOutCloud, refreshMembers } = useStore();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  function copy() { navigator.clipboard?.writeText(inviteCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  async function join() {
    if (!code.trim()) return;
    const ok = await joinHousehold(code.trim());
    flash(ok ? 'Joined household' : 'Invalid invite code');
    if (ok) { setCode(''); refreshMembers(); }
  }

  return (
    <Card className="p-5 mb-4">
      <SectionCardHeader title="Household" hint={householdName}
        action={<Button variant="ghost" onClick={signOutCloud}><LogOut size={15} /> Sign out</Button>} />
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <Label>Invite your partner</Label>
          <p className="text-xs text-ink-muted mb-2">Share this code. They sign up, then enter it below to join your shared books.</p>
          <div className="flex items-center gap-2">
            <div className="selectable flex-1 rounded-control bg-surface-2 border border-line-strong border-dashed px-3.5 py-2 font-mono tracking-widest text-lg text-center">{inviteCode || '—'}</div>
            <Button variant="ghost" onClick={copy} aria-label="Copy invite code">{copied ? <Check size={16} className="text-income" /> : <Copy size={16} />}</Button>
          </div>
          <div className="mt-4">
            <Label>Or join a household</Label>
            <div className="flex items-center gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter invite code" />
              <Button onClick={join} disabled={!code.trim()}><UserPlus size={15} /> Join</Button>
            </div>
          </div>
        </div>
        <div>
          <Label>Members ({members.length})</Label>
          <div className="space-y-2 mt-1">
            {members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-control border border-line px-3 py-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-on-color text-sm font-semibold" style={{ background: memberColor(i) }}>{(m.name || '?').charAt(0).toUpperCase()}</span>
                <span className="text-sm">{m.name}{m.id === userId && <span className="text-ink-muted"> (you)</span>}</span>
                <Users size={14} className="ml-auto text-ink-faint" />
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-muted mt-3">Everyone here shares the same transactions, budgets, goals and investments — updates sync live.</p>
        </div>
      </div>
    </Card>
  );
}

function ToggleRow({ icon, title, desc, checked, onChange }: { icon: React.ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line px-3.5 py-3">
      <span className="text-ink-muted">{icon}</span>
      <div className="flex-1"><div className="text-sm font-medium">{title}</div><div className="text-xs text-ink-muted">{desc}</div></div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

const ICONS = ['ShoppingBag', 'ShoppingCart', 'Coffee', 'Utensils', 'Car', 'Fuel', 'Home', 'Building', 'Heart', 'HeartPulse', 'Gamepad2', 'Clapperboard', 'Book', 'GraduationCap', 'Plane', 'TrainFront', 'Gift', 'Zap', 'Dumbbell', 'Smartphone', 'Shirt', 'Baby', 'Dog', 'PawPrint', 'Wine', 'Pizza', 'Bike', 'Bus', 'Wrench', 'Sparkles', 'Music', 'Film', 'Camera', 'Briefcase', 'Landmark', 'PiggyBank', 'Waves'];
const DEFAULT_COLOR = '#10b981';
const THEMES = [
  { id: 'dark', label: 'Dark', icon: Moon, preview: { page: '#141210', card: '#1d1a17', accent: '#e0b15a', ink: '#ede7da' } },
  { id: 'light', label: 'Light', icon: Sun, preview: { page: '#f6f8fc', card: '#ffffff', accent: '#e0b15a', ink: '#0f172a' } },
  { id: 'pink', label: 'Pink Aura', icon: Heart, preview: { page: 'radial-gradient(ellipse 60% 120% at 50% 40%, #fdeaf2 40%, #f9d2e1 70%, #fff0f9 92%)', card: '#ffffff', accent: '#c14c8a', ink: '#37352f' } },
] as const;
const EMOJIS = [
  '🛍️', '🛒', '☕', '🍽️', '🍕', '🍺', '🍷', '🚗', '⛽', '🚆', '🚌', '✈️',
  '🏠', '🏦', '❤️', '💊', '🩺', '🦷', '🎮', '🎬', '🎵', '📚', '🎓', '💻', '📱',
  '🎁', '⚡', '💅', '🏬', '🐾', '🐶', '🐱', '👶', '🏋️', '⚽', '🚲', '🔧',
  '💇', '🧾', '💡', '🌍', '🎨', '📷', '💼', '🏛️', '🐖', '💎', '🎄', '🌸',
  '🏊', '🏖️', '⛱️', '🎾', '⛷️', '🏀', '🧘', '🍦', '👓', '💉', '🧴', '🚿',
];
function CategoryModal({ open, onClose, onSave, existing }: { open: boolean; onClose: () => void; onSave: (c: any) => void; existing?: Category }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'income' | 'expense'>('expense');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [emoji, setEmoji] = useState('🛍️');
  const [recurring, setRecurring] = useState(false);
  useEffect(() => {
    if (existing) { setName(existing.name); setKind(existing.kind); setIcon(existing.icon); setColor(existing.color); setEmoji(existing.emoji ?? '🛍️'); setRecurring(!!existing.recurring); }
    else { setName(''); setKind('expense'); setIcon(ICONS[0]); setColor(DEFAULT_COLOR); setEmoji('🛍️'); setRecurring(false); }
  }, [existing, open]);
  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit category' : 'New category'}>
      <div className="space-y-4">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hobbies" /></div>
        <div><Label>Type</Label>
          <Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as any)}><option value="expense">Expense</option><option value="income">Income</option></Select>
        </div>
        <div><Label>Emoji</Label>
          <div className="flex flex-wrap gap-1.5">{EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} aria-label={`Emoji ${e}`} aria-pressed={emoji === e} className={cx('grid h-9 w-9 place-items-center rounded-control text-lg border transition-colors', emoji === e ? 'border-accent/50 bg-accent-soft' : 'border-line bg-surface hover:bg-hover')}>{e}</button>
          ))}</div>
        </div>
        <div><Label>Colour</Label>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </div>
        {kind === 'expense' && (
          <label className="flex items-center justify-between gap-3 rounded-card bg-surface-2 border border-line px-3.5 py-3 cursor-pointer">
            <span>
              <span className="text-sm font-medium">Recurring bill</span>
              <span className="block text-xs text-ink-muted">Every transaction here counts as a monthly bill (utilities, HOA, Întreținere…)</span>
            </span>
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="w-5 h-5 shrink-0" />
          </label>
        )}
        <Button className="w-full" disabled={!name} onClick={() => onSave({ name, kind, icon, color, emoji, recurring: kind === 'expense' ? recurring : undefined })}>{existing ? 'Save changes' : 'Create category'}</Button>
      </div>
    </Modal>
  );
}
