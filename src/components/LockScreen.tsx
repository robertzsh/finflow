import { useState } from 'react';
import { Lock, Fingerprint, Delete } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { GateScreen } from '@/components/layout/GateScreen';
import { cx } from '@/lib/format';

const KEY = 'grid h-14 place-items-center rounded-full bg-fill hover:bg-hover active:bg-active font-display text-xl font-medium tabular-nums transition-colors';

export function LockScreen() {
  const { unlock, settings } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  // Show exactly as many dots as the PIN the user actually set.
  const pinLength = settings.pin?.length || 4;

  function press(n: string) {
    const next = (pin + n).slice(0, pinLength);
    setPin(next); setError(false);
    if (next.length === pinLength && settings.pin && next === settings.pin) unlock(next);
  }
  function submit() { if (!unlock(pin)) { setError(true); setPin(''); } }

  return (
    <GateScreen className="!max-w-xs text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[12px] bg-accent text-on-accent shadow-card"><Lock size={22} /></div>
        <h1 className="font-semibold text-xl">Welcome back, {settings.name}</h1>
        <p className="text-xs text-ink-muted mt-1 mb-5">Enter your PIN to unlock</p>
        <div className="flex justify-center gap-2 mb-5">
          {Array.from({ length: pinLength }).map((_, i) => (
            <span key={i} className={cx('w-3 h-3 rounded-full border-2 transition-colors', error ? 'border-expense' : i < pin.length ? 'bg-accent border-accent' : 'border-line-strong')} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button key={n} onClick={() => press(n)} className={KEY}>{n}</button>
          ))}
          {settings.biometric
            ? <button onClick={() => unlock(settings.pin)} aria-label="Unlock with biometrics" className={KEY}><Fingerprint size={20} /></button>
            : <span />}
          <button onClick={() => press('0')} className={KEY}>0</button>
          <button onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete digit" className={KEY}><Delete size={18} /></button>
        </div>
        <Button onClick={submit} className="mt-5 w-full">Unlock</Button>
    </GateScreen>
  );
}
