import type {
  Transaction, Budget, Goal, Investment, Settings, PaymentMethod, InvestmentPoint,
} from '@/types';
import { DEFAULT_CATEGORIES } from './categories';

// ---- deterministic PRNG so mock data is stable across reloads ----
let seed = 20260728;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(rnd() * arr.length)]; }
function between(min: number, max: number) { return Math.round((min + rnd() * (max - min)) * 100) / 100; }
const uid = (p: string) => `${p}_${Math.floor(rnd() * 1e9).toString(36)}`;

const methods: PaymentMethod[] = ['Card', 'Cash', 'Bank Transfer', 'Direct Debit', 'PayPal', 'Apple Pay'];

const MERCHANTS: Record<string, string[]> = {
  groceries: ['Tesco', 'Sainsbury\'s', 'Aldi', 'Lidl', 'Waitrose', 'M&S Food'],
  restaurants: ['Dishoom', 'Franco Manca', 'Nando\'s', 'Wagamama', 'Pizza Express', 'Honest Burgers'],
  coffee: ['Starbucks', 'Costa', 'Pret A Manger', 'Blank Street', 'Local Roastery'],
  shopping: ['Amazon', 'Zara', 'Uniqlo', 'John Lewis', 'ASOS', 'IKEA'],
  travel: ['British Airways', 'Airbnb', 'Booking.com', 'Trainline', 'EasyJet'],
  fuel: ['Shell', 'BP', 'Esso', 'Texaco'],
  transport: ['TfL', 'Uber', 'Bolt', 'National Rail'],
  entertainment: ['Odeon', 'Ticketmaster', 'Steam', 'PlayStation Store'],
  gym: ['PureGym', 'The Gym Group'],
  subscriptions: ['Netflix', 'Spotify', 'Disney+', 'iCloud', 'Adobe', 'YouTube Premium', 'Amazon Prime'],
  insurance: ['Aviva', 'Admiral', 'Direct Line'],
  healthcare: ['Boots Pharmacy', 'Bupa', 'Specsavers'],
  education: ['Udemy', 'Coursera', 'O\'Reilly'],
  electronics: ['Apple', 'Currys', 'Amazon'],
  family: ['Argos', 'Smyths Toys'],
  pets: ['Pets at Home', 'Vet Clinic'],
  misc: ['PayPal', 'Cash Withdrawal', 'Miscellaneous'],
};

interface Recur { categoryId: string; merchant: string; amount: number; day: number; freq: 'monthly' | 'yearly'; method: PaymentMethod; }
const RECURRING: Recur[] = [
  { categoryId: 'salary', merchant: 'Acme Corp Payroll', amount: 4200, day: 28, freq: 'monthly', method: 'Bank Transfer' },
  { categoryId: 'rent', merchant: 'Foxtons Lettings', amount: 1650, day: 1, freq: 'monthly', method: 'Direct Debit' },
  { categoryId: 'subscriptions', merchant: 'Netflix', amount: 12.99, day: 5, freq: 'monthly', method: 'Card' },
  { categoryId: 'subscriptions', merchant: 'Spotify', amount: 11.99, day: 7, freq: 'monthly', method: 'Card' },
  { categoryId: 'subscriptions', merchant: 'iCloud', amount: 2.99, day: 3, freq: 'monthly', method: 'Apple Pay' },
  { categoryId: 'subscriptions', merchant: 'Adobe', amount: 19.99, day: 14, freq: 'monthly', method: 'Card' },
  { categoryId: 'gym', merchant: 'PureGym', amount: 24.99, day: 2, freq: 'monthly', method: 'Direct Debit' },
  { categoryId: 'insurance', merchant: 'Admiral', amount: 42.5, day: 12, freq: 'monthly', method: 'Direct Debit' },
  { categoryId: 'transport', merchant: 'TfL', amount: 155, day: 4, freq: 'monthly', method: 'Card' },
];

function iso(d: Date) { return d.toISOString().slice(0, 10); }

export function generateTransactions(months = 8): Transaction[] {
  const txs: Transaction[] = [];
  const now = new Date('2026-07-28T00:00:00Z');
  const expenseCats = DEFAULT_CATEGORIES.filter((c) => c.kind === 'expense' && MERCHANTS[c.id]);

  for (let m = months - 1; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isCurrent = m === 0;
    const lastDay = isCurrent ? now.getDate() : daysInMonth;

    // recurring
    for (const r of RECURRING) {
      const day = Math.min(r.day, daysInMonth);
      if (day > lastDay) continue;
      const d = new Date(year, month, day);
      txs.push({
        id: uid('tx'),
        type: r.categoryId === 'salary' ? 'income' : 'expense',
        amount: r.amount,
        categoryId: r.categoryId,
        merchant: r.merchant,
        method: r.method,
        date: iso(d),
        recurring: true,
        frequency: r.freq === 'yearly' ? 'yearly' : 'monthly',
        notes: '',
        createdAt: iso(d),
      });
    }

    // occasional freelance
    if (rnd() > 0.55) {
      const day = Math.min(Math.floor(between(8, 24)), lastDay);
      txs.push({
        id: uid('tx'), type: 'income', amount: between(300, 1400),
        categoryId: 'freelance', merchant: pick(['Design Studio', 'Upwork Client', 'Consulting Ltd']),
        method: 'Bank Transfer', date: iso(new Date(year, month, day)), recurring: false, createdAt: '',
      });
    }

    // variable expenses — spread across the month
    const count = Math.floor(between(35, 55));
    for (let i = 0; i < count; i++) {
      const day = Math.min(Math.max(1, Math.floor(rnd() * daysInMonth) + 1), lastDay);
      const cat = pick(expenseCats);
      const merchant = pick(MERCHANTS[cat.id]);
      let amount = between(4, 120);
      if (cat.id === 'groceries') amount = between(18, 95);
      if (cat.id === 'coffee') amount = between(2.6, 6.4);
      if (cat.id === 'restaurants') amount = between(14, 85);
      if (cat.id === 'shopping') amount = between(15, 240);
      if (cat.id === 'travel') amount = between(60, 620);
      if (cat.id === 'electronics') amount = between(40, 900);
      txs.push({
        id: uid('tx'), type: 'expense', amount, categoryId: cat.id, merchant,
        method: pick(methods), date: iso(new Date(year, month, day)),
        recurring: false, notes: rnd() > 0.85 ? 'One-off' : '', createdAt: '',
      });
    }
  }
  return txs.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function defaultBudgets(): Budget[] {
  const plan: Record<string, number> = {
    groceries: 450, restaurants: 260, coffee: 90, shopping: 300, travel: 400,
    fuel: 140, transport: 170, entertainment: 120, subscriptions: 95,
    gym: 25, healthcare: 80, rent: 1650, insurance: 45, misc: 120, electronics: 150,
  };
  return Object.entries(plan).map(([categoryId, amount]) => ({
    id: uid('bg'), categoryId, amount, month: 'all',
  }));
}

function investHistory(start: number, end: number, months = 12): InvestmentPoint[] {
  const pts: InvestmentPoint[] = [];
  const now = new Date('2026-07-28');
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const t = (months - 1 - i) / (months - 1);
    const noise = (rnd() - 0.5) * (end - start) * 0.18;
    pts.push({ date: iso(d), value: Math.round((start + (end - start) * t + noise) * 100) / 100 });
  }
  pts[pts.length - 1].value = end;
  return pts;
}

export function defaultInvestments(): Investment[] {
  return [
    { id: uid('iv'), name: 'Vanguard S&P 500', ticker: 'VUSA', kind: 'ETF', units: 42, costBasis: 3100, currentValue: 3820, history: investHistory(3100, 3820) },
    { id: uid('iv'), name: 'Apple Inc.', ticker: 'AAPL', kind: 'Stock', units: 15, costBasis: 2400, currentValue: 3150, history: investHistory(2400, 3150) },
    { id: uid('iv'), name: 'Bitcoin', ticker: 'BTC', kind: 'Crypto', units: 0.08, costBasis: 3600, currentValue: 4980, history: investHistory(3600, 4980) },
    { id: uid('iv'), name: 'Ethereum', ticker: 'ETH', kind: 'Crypto', units: 1.4, costBasis: 2100, currentValue: 1760, history: investHistory(2100, 1760) },
    { id: uid('iv'), name: 'Marcus Savings', kind: 'Savings', units: 1, costBasis: 8000, currentValue: 8340, history: investHistory(8000, 8340) },
    { id: uid('iv'), name: 'Workplace Pension', kind: 'Pension', units: 1, costBasis: 15200, currentValue: 18900, history: investHistory(15200, 18900) },
  ];
}

export function defaultGoals(): Goal[] {
  return [
    { id: uid('gl'), name: 'Emergency Fund', target: 12000, saved: 8200, monthlyContribution: 400, color: '#a855f7', icon: 'ShieldCheck', createdAt: '2025-09-01' },
    { id: uid('gl'), name: 'New Car', target: 18000, saved: 5400, monthlyContribution: 500, color: '#c084fc', icon: 'Car', createdAt: '2026-01-01' },
    { id: uid('gl'), name: 'Holiday — Japan', target: 4500, saved: 2900, monthlyContribution: 300, color: '#8b5cf6', icon: 'Plane', createdAt: '2026-03-01' },
    { id: uid('gl'), name: 'House Deposit', target: 40000, saved: 14500, monthlyContribution: 800, color: '#7c3aed', icon: 'Home', createdAt: '2025-06-01' },
    { id: uid('gl'), name: 'New PC', target: 2500, saved: 1650, monthlyContribution: 200, color: '#d8b4fe', icon: 'Monitor', createdAt: '2026-05-01' },
  ];
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'GBP', theme: 'dark', pinEnabled: false, biometric: false,
  sessionTimeoutMin: 15, name: 'Robert', onboarded: false,
};
