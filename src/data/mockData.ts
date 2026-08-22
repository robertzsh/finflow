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
  groceries: ['Kaufland', 'Lidl', 'Mega Image', 'Auchan', 'Carrefour', 'Profi'],
  restaurants: ['La Mama', 'Caru\' cu Bere', 'KFC', 'Wu Xing', 'Trattoria Buongiorno', 'Shift Pub'],
  coffee: ['Starbucks', 'Ted\'s Coffee', '5 to go', 'Origo', 'Gloria Jean\'s'],
  shopping: ['eMAG', 'Zara', 'H&M', 'Answear', 'Fashion Days', 'IKEA'],
  travel: ['TAROM', 'Wizz Air', 'Booking.com', 'Airbnb', 'Blue Air'],
  fuel: ['OMV', 'Petrom', 'MOL', 'Rompetrol'],
  transport: ['STB', 'Uber', 'Bolt', 'CFR Călători'],
  entertainment: ['Cinema City', 'iabilet.ro', 'Steam', 'PlayStation Store'],
  gym: ['World Class', 'Stay Fit Gym'],
  subscriptions: ['Netflix', 'Spotify', 'HBO Max', 'iCloud', 'Adobe', 'YouTube Premium', 'Digi'],
  insurance: ['Groupama', 'Allianz-Țiriac', 'Omniasig'],
  healthcare: ['Farmacia Tei', 'Regina Maria', 'Catena'],
  education: ['Udemy', 'Coursera', 'O\'Reilly'],
  electronics: ['Apple', 'Altex', 'eMAG'],
  family: ['Noriel', 'Jumbo'],
  pets: ['Animax', 'Clinica Veterinară'],
  misc: ['PayPal', 'Retragere Numerar', 'Diverse'],
};

interface Recur { categoryId: string; merchant: string; amount: number; day: number; freq: 'monthly' | 'yearly'; method: PaymentMethod; }
const RECURRING: Recur[] = [
  { categoryId: 'salary', merchant: 'Salariu — Firma SRL', amount: 9500, day: 12, freq: 'monthly', method: 'Bank Transfer' },
  { categoryId: 'rent', merchant: 'Chirie apartament', amount: 2800, day: 1, freq: 'monthly', method: 'Bank Transfer' },
  { categoryId: 'subscriptions', merchant: 'Netflix', amount: 55.99, day: 5, freq: 'monthly', method: 'Card' },
  { categoryId: 'subscriptions', merchant: 'Spotify', amount: 29.99, day: 7, freq: 'monthly', method: 'Card' },
  { categoryId: 'subscriptions', merchant: 'iCloud', amount: 14.99, day: 3, freq: 'monthly', method: 'Apple Pay' },
  { categoryId: 'subscriptions', merchant: 'Adobe', amount: 109, day: 14, freq: 'monthly', method: 'Card' },
  { categoryId: 'gym', merchant: 'World Class', amount: 199, day: 2, freq: 'monthly', method: 'Direct Debit' },
  { categoryId: 'insurance', merchant: 'Groupama', amount: 210, day: 12, freq: 'monthly', method: 'Direct Debit' },
  { categoryId: 'transport', merchant: 'STB Abonament', amount: 80, day: 4, freq: 'monthly', method: 'Card' },
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
        id: uid('tx'), type: 'income', amount: between(1500, 7000),
        categoryId: 'freelance', merchant: pick(['Proiect Freelance', 'Client Upwork', 'Consultanță SRL']),
        method: 'Bank Transfer', date: iso(new Date(year, month, day)), recurring: false, createdAt: '',
      });
    }

    // variable expenses — spread across the month
    const count = Math.floor(between(35, 55));
    for (let i = 0; i < count; i++) {
      const day = Math.min(Math.max(1, Math.floor(rnd() * daysInMonth) + 1), lastDay);
      const cat = pick(expenseCats);
      const merchant = pick(MERCHANTS[cat.id]);
      let amount = between(20, 600);
      if (cat.id === 'groceries') amount = between(90, 480);
      if (cat.id === 'coffee') amount = between(13, 32);
      if (cat.id === 'restaurants') amount = between(70, 420);
      if (cat.id === 'shopping') amount = between(75, 1200);
      if (cat.id === 'travel') amount = between(300, 3100);
      if (cat.id === 'electronics') amount = between(200, 4500);
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
    groceries: 2200, restaurants: 1300, coffee: 450, shopping: 1500, travel: 2000,
    fuel: 700, transport: 350, entertainment: 600, subscriptions: 420,
    gym: 199, healthcare: 400, rent: 2800, insurance: 210, misc: 600, electronics: 800,
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
    { id: uid('iv'), name: 'Vanguard S&P 500', ticker: 'VUSA', kind: 'ETF', currency: 'EUR', units: 42, costBasis: 3100, currentValue: 3820, history: investHistory(3100, 3820) },
    { id: uid('iv'), name: 'Apple Inc.', ticker: 'AAPL', kind: 'Stock', currency: 'USD', units: 15, costBasis: 2400, currentValue: 3150, history: investHistory(2400, 3150) },
    { id: uid('iv'), name: 'Bitcoin', ticker: 'BTC', kind: 'Crypto', currency: 'EUR', units: 0.08, costBasis: 3600, currentValue: 4980, history: investHistory(3600, 4980) },
    { id: uid('iv'), name: 'Ethereum', ticker: 'ETH', kind: 'Crypto', currency: 'EUR', units: 1.4, costBasis: 2100, currentValue: 1760, history: investHistory(2100, 1760) },
    { id: uid('iv'), name: 'Depozit BT', kind: 'Savings', currency: 'RON', units: 1, costBasis: 40000, currentValue: 41700, history: investHistory(40000, 41700) },
    { id: uid('iv'), name: 'Pensie Pilon III', kind: 'Pension', currency: 'RON', units: 1, costBasis: 76000, currentValue: 94500, history: investHistory(76000, 94500) },
  ];
}

export function defaultGoals(): Goal[] {
  return [
    { id: uid('gl'), name: 'Fond de urgență', target: 60000, saved: 41000, monthlyContribution: 2000, color: '#a855f7', icon: 'ShieldCheck', createdAt: '2025-09-01' },
    { id: uid('gl'), name: 'Mașină nouă', target: 90000, saved: 27000, monthlyContribution: 2500, color: '#c084fc', icon: 'Car', createdAt: '2026-01-01' },
    { id: uid('gl'), name: 'Vacanță — Japonia', target: 4500, saved: 2900, monthlyContribution: 300, color: '#8b5cf6', icon: 'Plane', createdAt: '2026-03-01', currency: 'EUR' },
    { id: uid('gl'), name: 'Avans casă', target: 200000, saved: 72500, monthlyContribution: 4000, color: '#7c3aed', icon: 'Home', createdAt: '2025-06-01' },
    { id: uid('gl'), name: 'PC nou', target: 12500, saved: 8250, monthlyContribution: 1000, color: '#d8b4fe', icon: 'Monitor', createdAt: '2026-05-01' },
  ];
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'RON',
  fxRates: { RON: 1, EUR: 5.0, USD: 4.6, GBP: 5.9 }, // lei per 1 unit — editable in Settings
  openingBalance: 5000,
  theme: 'dark', pinEnabled: false, biometric: false,
  sessionTimeoutMin: 15, name: 'Robert', onboarded: false,
};
