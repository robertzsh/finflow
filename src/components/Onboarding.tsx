import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wallet, PieChart, Target, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Input, Select, Label } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Aura } from '@/components/ui/Aura';
import { GateScreen, BrandMark } from '@/components/layout/GateScreen';
import type { CurrencyCode } from '@/types';

const SLIDES = [
  { icon: Sparkles, title: 'Welcome to FinFlow', text: 'A calm, private place to see where your money moves — all stored locally on your device.' },
  { icon: Wallet, title: 'Track every transaction', text: 'Log income and expenses, tag categories, set recurring bills, and let insights surface the rest.' },
  { icon: PieChart, title: 'Understand your money', text: 'Beautiful charts break down spending, income sources, savings and investments at a glance.' },
  { icon: Target, title: 'Reach your goals', text: 'Set budgets and savings goals, then watch your financial health score climb.' },
];

export function Onboarding() {
  const { updateSettings, settings } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.name);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const last = step === SLIDES.length;

  return (
    <GateScreen className="overflow-hidden">
      <div className="flex justify-center mb-6"><BrandMark /></div>
        <AnimatePresence mode="wait">
          {!last ? (
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="relative mx-auto mb-5 grid h-28 w-28 place-items-center">
                <Aura variant="orb" className="absolute inset-0" />
                {(() => { const I = SLIDES[step].icon; return <I size={30} strokeWidth={1.8} className="relative text-accent-ink" />; })()}
              </div>
              <h1 className="text-2xl font-bold text-center">{SLIDES[step].title}</h1>
              <p className="text-sm text-ink-muted text-center mt-2 leading-relaxed">{SLIDES[step].text}</p>
              <div className="flex justify-center gap-1.5 my-6">
                {SLIDES.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-line-strong'}`} />)}
              </div>
              <Button className="w-full" onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></Button>
            </motion.div>
          ) : (
            <motion.div key="setup" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-2xl font-bold text-center mb-1">Let's set you up</h1>
              <p className="text-sm text-ink-muted text-center mb-6">You can change these anytime in Settings.</p>
              <div className="space-y-4">
                <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /></div>
                <div><Label>Currency</Label>
                  <Select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                    <option value="RON">lei RON — Leu românesc</option>
                    <option value="EUR">€ EUR — Euro</option>
                    <option value="USD">$ USD — US Dollar</option>
                    <option value="GBP">£ GBP — British Pound</option>
                  </Select>
                </div>
              </div>
              <Button className="w-full mt-6" onClick={() => updateSettings({ name: name || 'Robert', currency, onboarded: true })}>
                Enter FinFlow <ArrowRight size={16} />
              </Button>
              <p className="text-center text-xs text-ink-muted mt-3">Sample data is preloaded so you can explore right away.</p>
            </motion.div>
          )}
        </AnimatePresence>
    </GateScreen>
  );
}
