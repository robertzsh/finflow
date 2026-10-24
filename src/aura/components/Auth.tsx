import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Input, Label } from '@/aura/components/ui/Field';
import { Button } from '@/aura/components/ui/Button';
import { Callout } from '@/aura/components/ui/Callout';
import { GateScreen, BrandMark } from '@/aura/components/layout/GateScreen';

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
    <GateScreen>
        <div className="mb-7"><BrandMark tagline="Family finances" /></div>

        <h1 className="text-[1.75rem] font-bold leading-tight">{mode === 'in' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="text-sm text-ink-muted mt-1 mb-6">
          {mode === 'in' ? 'Sign in to your shared household.' : 'Start a household — invite your partner afterwards.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'up' && (
            <div>
              <Label>Your name</Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Robert" className="!pl-9" />
              </div>
            </div>
          )}
          <div>
            <Label>Email</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="!pl-9" />
            </div>
          </div>
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="!pl-9" />
            </div>
          </div>

          {authError && <Callout tone="red"><span className="text-expense">{authError}</span></Callout>}
          {confirm && <Callout tone="green">Check your email to confirm your account, then sign in.</Callout>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <>{mode === 'in' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></>}
          </Button>
        </form>

        <button onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setConfirm(false); }}
          className="mt-5 text-sm text-ink-muted hover:text-ink w-full text-center transition-colors">
          {mode === 'in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
    </GateScreen>
  );
}
