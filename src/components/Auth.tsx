import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Input, Label } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export function Auth() {
  const { signIn, signUp, authError } = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setConfirm(false);
    if (mode === 'in') await signIn(email.trim(), password);
    else {
      const r = await signUp(email.trim(), password, name.trim() || 'Me');
      if (r === 'confirm') setConfirm(true);
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 p-2 shadow-glow"><Sparkles size={18} className="text-white" /></div>
          <div>
            <div className="font-extrabold tracking-tight leading-none">FinFlow</div>
            <div className="text-[10px] text-white/40 tracking-wider uppercase">Family finances</div>
          </div>
        </div>

        <h1 className="text-xl font-extrabold">{mode === 'in' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="text-sm text-white/50 mt-1 mb-6">
          {mode === 'in' ? 'Sign in to your shared household.' : 'Start a household — invite your partner afterwards.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'up' && (
            <div>
              <Label>Your name</Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Robert" className="!pl-9" />
              </div>
            </div>
          )}
          <div>
            <Label>Email</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="!pl-9" />
            </div>
          </div>
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="!pl-9" />
            </div>
          </div>

          {authError && <p className="text-sm text-expense">{authError}</p>}
          {confirm && <p className="text-sm text-income">Check your email to confirm your account, then sign in.</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <>{mode === 'in' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></>}
          </Button>
        </form>

        <button onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setConfirm(false); }}
          className="mt-5 text-sm text-white/50 hover:text-white w-full text-center">
          {mode === 'in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </motion.div>
    </div>
  );
}
