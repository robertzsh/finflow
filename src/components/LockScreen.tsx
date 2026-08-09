import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Fingerprint, Delete } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function LockScreen() {
  const { unlock, settings } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function press(n: string) {
    const next = (pin + n).slice(0, 6);
    setPin(next); setError(false);
    if (next.length >= 4 && settings.pin && next === settings.pin) unlock(next);
  }
  function submit() { if (!unlock(pin)) { setError(true); setPin(''); } }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-3xl p-8 w-full max-w-xs text-center">
        <div className="mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 p-3 w-fit"><Lock size={22} className="text-white" /></div>
        <h1 className="font-bold text-lg">Welcome back, {settings.name}</h1>
        <p className="text-xs text-white/50 mb-5">Enter your PIN to unlock</p>
        <div className="flex justify-center gap-2 mb-5">
          {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length || 4)).map((i) => (
            <span key={i} className={`w-3 h-3 rounded-full border ${i < pin.length ? 'bg-blue-400 border-blue-400' : 'border-white/30'} ${error ? 'border-expense' : ''}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button key={n} onClick={() => press(n)} className="rounded-xl bg-white/5 hover:bg-white/10 py-3 text-lg font-semibold">{n}</button>
          ))}
          {settings.biometric
            ? <button onClick={() => unlock(settings.pin)} className="rounded-xl bg-white/5 hover:bg-white/10 py-3 flex items-center justify-center"><Fingerprint size={20} /></button>
            : <span />}
          <button onClick={() => press('0')} className="rounded-xl bg-white/5 hover:bg-white/10 py-3 text-lg font-semibold">0</button>
          <button onClick={() => setPin(pin.slice(0, -1))} className="rounded-xl bg-white/5 hover:bg-white/10 py-3 flex items-center justify-center"><Delete size={18} /></button>
        </div>
        <button onClick={submit} className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 py-2.5 text-sm font-semibold">Unlock</button>
      </motion.div>
    </div>
  );
}
