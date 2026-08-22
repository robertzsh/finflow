import { useRef, useState } from 'react';
import { Moon, Sun, Shield, Download, Upload, Database, Trash2, Plus, Fingerprint, Lock, Users, LogOut, Copy, Check, UserPlus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader, SectionCardHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label } from '@/components/ui/Field';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Modal } from '@/components/ui/Modal';
import { exportJSON, parseBankCSV } from '@/lib/export';
import { currencySymbol } from '@/lib/format';
import type { AppData, CurrencyCode } from '@/types';

export default function Settings() {
  const store = useStore();
  const { settings, categories, updateSettings, restore, resetAll, addCategory, deleteCategory, importTransactions, transactions, budgets, goals, investments } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [msg, setMsg] = useState('');

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 2500); }

  function backup() {
    exportJSON({ transactions, categories, budgets, goals, investments, settings } as AppData, 'finflow-backup');
    flash('Backup downloaded');
  }
  function onRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { restore(JSON.parse(r.result as string)); flash('Data restored'); } catch { flash('Invalid backup file'); } };
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
      {msg && <div className="mb-4 rounded-xl bg-income/15 border border-income/30 text-income px-4 py-2.5 text-sm">{msg}</div>}

      {store.cloud && store.authed && <HouseholdCard flash={flash} />}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Preferences */}
        <Card className="p-5">
          <SectionCardHeader title="Preferences" />
          <div className="space-y-4">
            <div><Label>Your name</Label><Input value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} /></div>
            <div>
              <Label>Opening / current balance ({currencySymbol(settings.currency)})</Label>
              <Input type="number" step="0.01" defaultValue={settings.openingBalance}
                onBlur={(e) => updateSettings({ openingBalance: Number(e.target.value) || 0 })} />
              <p className="text-xs text-white/40 mt-1.5">Your starting balance. Income adds to it and expenses subtract, so the dashboard balance stays in sync with what you actually have.</p>
            </div>
            <div><Label>Base currency</Label>
              <Select value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value as CurrencyCode })}>
                <option value="RON">lei RON — Leu românesc</option>
                <option value="EUR">€ EUR — Euro</option>
                <option value="USD">$ USD — US Dollar</option>
                <option value="GBP">£ GBP — British Pound</option>
              </Select>
              <p className="text-xs text-white/40 mt-1.5">Everyday transactions and budgets use this. Goals & investments can each use their own currency.</p>
            </div>
            <div>
              <Label>Exchange rates (per 1 unit, in {currencySymbol(settings.currency)})</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['EUR', 'USD', 'GBP'] as CurrencyCode[]).map((c) => (
                  <div key={c} className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-2.5">
                    <span className="text-xs text-white/50 w-9">{c}</span>
                    <input type="number" step="0.01" defaultValue={settings.fxRates[c]}
                      onBlur={(e) => updateSettings({ fxRates: { ...settings.fxRates, [c]: Number(e.target.value) || settings.fxRates[c] } })}
                      className="w-full bg-transparent py-2 text-sm outline-none" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-1.5">Used to combine multi-currency goals & investments into your base totals. Edit anytime.</p>
            </div>
            <div>
              <Label>Appearance</Label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => updateSettings({ theme: 'dark' })}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm border ${settings.theme === 'dark' ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/10 bg-white/5'}`}>
                  <Moon size={16} /> Dark
                </button>
                <button onClick={() => updateSettings({ theme: 'light' })}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm border ${settings.theme === 'light' ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/10 bg-white/5'}`}>
                  <Sun size={16} /> Light
                </button>
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
              <Select value={settings.sessionTimeoutMin} onChange={(e) => updateSettings({ sessionTimeoutMin: Number(e.target.value) })}>
                <option value={5}>5 minutes</option><option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option><option value={60}>1 hour</option>
              </Select>
            </div>
            <p className="text-xs text-white/40 flex items-center gap-1.5"><Shield size={12} /> All data is stored locally & encrypted in your browser (IndexedDB).</p>
          </div>
        </Card>

        {/* Categories */}
        <Card className="p-5">
          <SectionCardHeader title="Categories" hint={`${categories.length} total`}
            action={<Button variant="ghost" onClick={() => setCatOpen(true)}><Plus size={15} /> Add</Button>} />
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar">
            {categories.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs">
                <CategoryIcon icon={c.icon} color={c.color} size={13} bg={false} emoji={c.emoji} />{c.name}
                {c.custom && <button onClick={() => deleteCategory(c.id)} className="text-white/30 hover:text-expense ml-1">×</button>}
              </span>
            ))}
          </div>
        </Card>

        {/* Data */}
        <Card className="p-5">
          <SectionCardHeader title="Data & backup" />
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" onClick={backup}><Download size={16} /> Export all data (JSON backup)</Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restore from backup</Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => csvRef.current?.click()}><Database size={16} /> Import bank CSV</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onRestore} />
            <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={onCSV} />
            <div className="rounded-xl bg-white/[0.03] p-3 mt-2">
              <p className="text-xs text-white/50 mb-2">Cloud sync (optional) — off by default. Your data never leaves your device unless enabled.</p>
              <ToggleRow icon={<Database size={16} />} title="Cloud sync" desc="Coming soon" checked={false} onChange={() => flash('Cloud sync is not enabled in this build')} />
            </div>
            <Button variant="danger" className="w-full justify-start mt-2"
              onClick={() => { if (confirm('Reset all data to sample data? This cannot be undone.')) { resetAll(); flash('Data reset'); } }}>
              <Trash2 size={16} /> Reset all data
            </Button>
          </div>
        </Card>
      </div>

      <CategoryModal open={catOpen} onClose={() => setCatOpen(false)} onSave={(c) => { addCategory(c); setCatOpen(false); }} />
    </Page>
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
          <p className="text-xs text-white/40 mb-2">Share this code. They sign up, then enter it below to join your shared books.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 font-mono tracking-widest text-lg text-center">{inviteCode || '—'}</div>
            <Button variant="ghost" onClick={copy}>{copied ? <Check size={16} className="text-income" /> : <Copy size={16} />}</Button>
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
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">{(m.name || '?').charAt(0).toUpperCase()}</span>
                <span className="text-sm">{m.name}{m.id === userId && <span className="text-white/40"> (you)</span>}</span>
                <Users size={14} className="ml-auto text-white/20" />
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-3">Everyone here shares the same transactions, budgets, goals and investments — updates sync live.</p>
        </div>
      </div>
    </Card>
  );
}

function ToggleRow({ icon, title, desc, checked, onChange }: { icon: React.ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3.5 py-3">
      <span className="text-white/60">{icon}</span>
      <div className="flex-1"><div className="text-sm font-medium">{title}</div><div className="text-xs text-white/40">{desc}</div></div>
      <button onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-blue-500' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

const ICONS = ['ShoppingBag', 'Coffee', 'Car', 'Home', 'Heart', 'Gamepad2', 'Book', 'Plane', 'Gift', 'Zap'];
const COLORS = ['#10b981', '#3b82f6', '#eab308', '#a855f7', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];
const EMOJIS = ['🛍️', '☕', '🚗', '🏠', '❤️', '🎮', '📚', '✈️', '🎁', '⚡', '💅', '🏬', '🍽️', '🐾', '🎬', '🏋️', '💊', '🍺'];
function CategoryModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (c: any) => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'income' | 'expense'>('expense');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState('🛍️');
  return (
    <Modal open={open} onClose={onClose} title="New category">
      <div className="space-y-4">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hobbies" /></div>
        <div><Label>Type</Label>
          <Select value={kind} onChange={(e) => setKind(e.target.value as any)}><option value="expense">Expense</option><option value="income">Income</option></Select>
        </div>
        <div><Label>Emoji</Label>
          <div className="flex flex-wrap gap-2">{EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} className={`rounded-lg px-2 py-1.5 text-lg border ${emoji === e ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-white/5'}`}>{e}</button>
          ))}</div>
        </div>
        <div><Label>Icon</Label>
          <div className="flex flex-wrap gap-2">{ICONS.map((ic) => (
            <button key={ic} onClick={() => setIcon(ic)} className={`rounded-lg p-2 border ${icon === ic ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-white/5'}`}>
              <CategoryIcon icon={ic} color={color} size={16} bg={false} /></button>
          ))}</div>
        </div>
        <div><Label>Colour</Label>
          <div className="flex gap-2">{COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}</div>
        </div>
        <Button className="w-full" disabled={!name} onClick={() => onSave({ name, kind, icon, color, emoji })}>Create category</Button>
      </div>
    </Modal>
  );
}
