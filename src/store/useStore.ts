import { create } from 'zustand';
import type { AppData, Transaction, Category, Budget, Goal, Investment, Settings } from '@/types';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import {
  generateTransactions, defaultBudgets, defaultGoals, defaultInvestments, DEFAULT_SETTINGS,
} from '@/data/mockData';
import { loadData, saveData, clearData } from '@/lib/db';

const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function seedData(): AppData {
  return {
    transactions: generateTransactions(8),
    categories: DEFAULT_CATEGORIES,
    budgets: defaultBudgets(),
    goals: defaultGoals(),
    investments: defaultInvestments(),
    settings: { ...DEFAULT_SETTINGS },
  };
}

interface StoreState extends AppData {
  ready: boolean;
  locked: boolean;
  init: () => Promise<void>;
  persist: () => void;

  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactions: (ids: string[]) => void;
  bulkUpdate: (ids: string[], patch: Partial<Transaction>) => void;
  importTransactions: (list: Partial<Transaction>[]) => void;

  addCategory: (c: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;

  setBudget: (categoryId: string, amount: number) => void;
  removeBudget: (id: string) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  contributeGoal: (id: string, amount: number) => void;

  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, patch: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  lock: () => void;
  unlock: (pin?: string) => boolean;
  restore: (data: AppData) => void;
  resetAll: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  ...seedData(),
  ready: false,
  locked: false,

  init: async () => {
    const saved = await loadData();
    if (saved) {
      set({ ...saved, ready: true, locked: !!saved.settings.pinEnabled });
    } else {
      const seeded = seedData();
      await saveData(seeded);
      set({ ...seeded, ready: true });
    }
    applyTheme(get().settings.theme);
  },

  persist: () => {
    const { transactions, categories, budgets, goals, investments, settings } = get();
    saveData({ transactions, categories, budgets, goals, investments, settings });
  },

  addTransaction: (t) => {
    const tx: Transaction = { ...t, id: uid('tx'), createdAt: new Date().toISOString() };
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    get().persist();
  },
  updateTransaction: (id, patch) => {
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    get().persist();
  },
  deleteTransaction: (id) => {
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
    get().persist();
  },
  deleteTransactions: (ids) => {
    const set2 = new Set(ids);
    set((s) => ({ transactions: s.transactions.filter((t) => !set2.has(t.id)) }));
    get().persist();
  },
  bulkUpdate: (ids, patch) => {
    const set2 = new Set(ids);
    set((s) => ({ transactions: s.transactions.map((t) => (set2.has(t.id) ? { ...t, ...patch } : t)) }));
    get().persist();
  },
  importTransactions: (list) => {
    const now = new Date().toISOString();
    const mapped: Transaction[] = list.map((p) => ({
      id: uid('tx'), type: p.type ?? 'expense', amount: p.amount ?? 0,
      categoryId: p.categoryId ?? 'misc', merchant: p.merchant ?? 'Imported',
      method: p.method ?? 'Card', date: p.date ?? new Date().toISOString().slice(0, 10),
      notes: p.notes ?? '', recurring: p.recurring ?? false, frequency: p.frequency,
      createdAt: now,
    }));
    set((s) => ({ transactions: [...mapped, ...s.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)) }));
    get().persist();
  },

  addCategory: (c) => {
    set((s) => ({ categories: [...s.categories, { ...c, id: uid('cat'), custom: true }] }));
    get().persist();
  },
  deleteCategory: (id) => {
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id || !c.custom) }));
    get().persist();
  },

  setBudget: (categoryId, amount) => {
    set((s) => {
      const existing = s.budgets.find((b) => b.categoryId === categoryId);
      if (existing) return { budgets: s.budgets.map((b) => (b.categoryId === categoryId ? { ...b, amount } : b)) };
      return { budgets: [...s.budgets, { id: uid('bg'), categoryId, amount, month: 'all' }] };
    });
    get().persist();
  },
  removeBudget: (id) => {
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
    get().persist();
  },

  addGoal: (g) => {
    set((s) => ({ goals: [...s.goals, { ...g, id: uid('gl'), createdAt: new Date().toISOString().slice(0, 10) }] }));
    get().persist();
  },
  updateGoal: (id, patch) => {
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
    get().persist();
  },
  deleteGoal: (id) => {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    get().persist();
  },
  contributeGoal: (id, amount) => {
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g)) }));
    get().persist();
  },

  addInvestment: (i) => {
    set((s) => ({ investments: [...s.investments, { ...i, id: uid('iv') }] }));
    get().persist();
  },
  updateInvestment: (id, patch) => {
    set((s) => ({ investments: s.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
    get().persist();
  },
  deleteInvestment: (id) => {
    set((s) => ({ investments: s.investments.filter((i) => i.id !== id) }));
    get().persist();
  },

  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    if (patch.theme) applyTheme(patch.theme);
    get().persist();
  },
  lock: () => set({ locked: true }),
  unlock: (pin) => {
    const s = get();
    if (!s.settings.pinEnabled) { set({ locked: false }); return true; }
    if (pin === s.settings.pin) { set({ locked: false }); return true; }
    return false;
  },
  restore: (data) => {
    set({ ...data });
    get().persist();
    applyTheme(data.settings.theme);
  },
  resetAll: async () => {
    await clearData();
    const seeded = seedData();
    await saveData(seeded);
    set({ ...seeded });
    applyTheme(seeded.settings.theme);
  },
}));

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}
