import { create } from 'zustand';
import type { AppData, Transaction, Category, Budget, Goal, Investment, Settings } from '@/types';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import {
  generateTransactions, defaultBudgets, defaultGoals, defaultInvestments, DEFAULT_SETTINGS,
} from '@/data/mockData';
import { loadData, saveData, clearData } from '@/lib/db';
import { CLOUD_ENABLED } from '@/lib/config';
import * as cloud from '@/lib/cloud';

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

function emptyData(): AppData {
  return { transactions: [], categories: DEFAULT_CATEGORIES, budgets: [], goals: [], investments: [], settings: { ...DEFAULT_SETTINGS, onboarded: true } };
}

interface StoreState extends AppData {
  ready: boolean;
  locked: boolean;

  // cloud / multi-user
  cloud: boolean;
  authReady: boolean;
  authed: boolean;
  userId: string | null;
  householdId: string | null;
  householdName: string;
  inviteCode: string;
  members: cloud.Member[];
  authError: string;

  init: () => Promise<void>;
  persist: () => void;

  // auth
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<'ok' | 'confirm' | 'error'>;
  signOutCloud: () => Promise<void>;
  joinHousehold: (code: string) => Promise<boolean>;
  loadFromCloud: (userId: string) => Promise<void>;
  refreshMembers: () => Promise<void>;

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

let unsubRealtime: (() => void) | null = null;

export const useStore = create<StoreState>((set, get) => {
  // fire-and-forget helpers that push a local change up to the cloud
  const push = (table: cloud.Table, obj: any) => {
    const s = get();
    if (s.cloud && s.authed && s.householdId && s.userId) cloud.upsert(table, obj, s.householdId, s.userId);
  };
  const pushMany = (table: cloud.Table, objs: any[]) => {
    const s = get();
    if (s.cloud && s.authed && s.householdId && s.userId) cloud.upsertMany(table, objs, s.householdId, s.userId);
  };
  const del = (table: cloud.Table, ids: string[]) => {
    const s = get();
    if (s.cloud && s.authed) cloud.remove(table, ids);
  };
  const findTx = (id: string) => get().transactions.find((t) => t.id === id);

  return {
    ...seedData(),
    ready: false,
    locked: false,
    cloud: CLOUD_ENABLED,
    authReady: false,
    authed: false,
    userId: null,
    householdId: null,
    householdName: 'Household',
    inviteCode: '',
    members: [],
    authError: '',

    init: async () => {
      if (!CLOUD_ENABLED) {
        const saved = await loadData();
        if (saved) {
          const settings = { ...DEFAULT_SETTINGS, ...saved.settings, fxRates: { ...DEFAULT_SETTINGS.fxRates, ...saved.settings.fxRates } };
          set({ ...saved, settings, ready: true, authReady: true, locked: !!settings.pinEnabled });
        } else {
          const seeded = seedData();
          await saveData(seeded);
          set({ ...seeded, ready: true, authReady: true });
        }
        applyTheme(get().settings.theme);
        return;
      }
      // cloud mode
      try {
        const id = await cloud.getUserId();
        if (id) await get().loadFromCloud(id);
        else set({ authReady: true, ready: true });
      } catch {
        set({ authReady: true, ready: true });
      }
      cloud.onAuthChange((id) => {
        if (id) { if (!get().authed) get().loadFromCloud(id); }
        else { if (unsubRealtime) { unsubRealtime(); unsubRealtime = null; } set({ authed: false, authReady: true, ready: true }); }
      });
      applyTheme(get().settings.theme);
    },

    loadFromCloud: async (userId) => {
      const profile = await cloud.getProfile(userId);
      const household = await cloud.getHousehold(profile.householdId);
      await cloud.seedIfEmpty(profile.householdId, userId, DEFAULT_CATEGORIES);
      const data = await cloud.fetchAll(profile.householdId);
      const members = await cloud.getMembers(profile.householdId);
      // device-local preferences (theme, currency, fx, pin) stay in IndexedDB
      const local = await loadData();
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        ...(local?.settings ?? {}),
        fxRates: { ...DEFAULT_SETTINGS.fxRates, ...(local?.settings?.fxRates ?? {}) },
        name: profile.name || DEFAULT_SETTINGS.name,
        onboarded: true,
      };
      set({
        transactions: data.transactions,
        categories: data.categories.length ? data.categories : DEFAULT_CATEGORIES,
        budgets: data.budgets,
        goals: data.goals,
        investments: data.investments,
        settings,
        userId,
        householdId: profile.householdId,
        householdName: household.name,
        inviteCode: household.inviteCode,
        members,
        authed: true,
        authReady: true,
        ready: true,
        locked: false,
        authError: '',
      });
      applyTheme(settings.theme);

      if (unsubRealtime) unsubRealtime();
      unsubRealtime = cloud.subscribe(profile.householdId, async (table) => {
        const rows = await cloud.fetchTable(table, profile.householdId);
        if (table === 'transactions') set({ transactions: (rows as Transaction[]).sort((a, b) => (a.date < b.date ? 1 : -1)) });
        else if (table === 'budgets') set({ budgets: rows as Budget[] });
        else if (table === 'goals') set({ goals: rows as Goal[] });
        else if (table === 'investments') set({ investments: rows as Investment[] });
        else if (table === 'categories') set({ categories: rows as Category[] });
      });
    },

    refreshMembers: async () => {
      const s = get();
      if (s.householdId) set({ members: await cloud.getMembers(s.householdId) });
    },

    signIn: async (email, password) => {
      try {
        set({ authError: '' });
        const { user } = await cloud.signIn(email, password);
        if (user) await get().loadFromCloud(user.id);
        return true;
      } catch (e: any) { set({ authError: e?.message ?? 'Sign in failed' }); return false; }
    },
    signUp: async (email, password, name) => {
      try {
        set({ authError: '' });
        const { session, user } = await cloud.signUp(email, password, name);
        if (session && user) { await get().loadFromCloud(user.id); return 'ok'; }
        return 'confirm'; // email confirmation required
      } catch (e: any) { set({ authError: e?.message ?? 'Sign up failed' }); return 'error'; }
    },
    signOutCloud: async () => {
      await cloud.signOut();
      if (unsubRealtime) { unsubRealtime(); unsubRealtime = null; }
      set({ authed: false, userId: null, householdId: null, ...emptyData() });
    },
    joinHousehold: async (code) => {
      try {
        set({ authError: '' });
        await cloud.joinHousehold(code);
        const s = get();
        if (s.userId) await get().loadFromCloud(s.userId);
        return true;
      } catch (e: any) { set({ authError: e?.message ?? 'Could not join' }); return false; }
    },

    persist: () => {
      const { transactions, categories, budgets, goals, investments, settings } = get();
      // In cloud mode we still cache locally for instant reloads / offline read.
      saveData({ transactions, categories, budgets, goals, investments, settings });
    },

    addTransaction: (t) => {
      const tx: Transaction = { ...t, id: uid('tx'), createdAt: new Date().toISOString(), createdBy: get().userId ?? undefined };
      set((s) => ({ transactions: [tx, ...s.transactions] }));
      get().persist(); push('transactions', tx);
    },
    updateTransaction: (id, patch) => {
      set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      get().persist(); const t = findTx(id); if (t) push('transactions', t);
    },
    deleteTransaction: (id) => {
      set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
      get().persist(); del('transactions', [id]);
    },
    deleteTransactions: (ids) => {
      const set2 = new Set(ids);
      set((s) => ({ transactions: s.transactions.filter((t) => !set2.has(t.id)) }));
      get().persist(); del('transactions', ids);
    },
    bulkUpdate: (ids, patch) => {
      const set2 = new Set(ids);
      set((s) => ({ transactions: s.transactions.map((t) => (set2.has(t.id) ? { ...t, ...patch } : t)) }));
      get().persist();
      pushMany('transactions', get().transactions.filter((t) => set2.has(t.id)));
    },
    importTransactions: (list) => {
      const now = new Date().toISOString();
      const mapped: Transaction[] = list.map((p) => ({
        id: uid('tx'), type: p.type ?? 'expense', amount: p.amount ?? 0,
        categoryId: p.categoryId ?? 'misc', merchant: p.merchant ?? 'Imported',
        method: p.method ?? 'Card', date: p.date ?? new Date().toISOString().slice(0, 10),
        notes: p.notes ?? '', recurring: p.recurring ?? false, frequency: p.frequency,
        createdAt: now, createdBy: get().userId ?? undefined,
      }));
      set((s) => ({ transactions: [...mapped, ...s.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)) }));
      get().persist(); pushMany('transactions', mapped);
    },

    addCategory: (c) => {
      const cat: Category = { ...c, id: uid('cat'), custom: true };
      set((s) => ({ categories: [...s.categories, cat] }));
      get().persist(); push('categories', cat);
    },
    deleteCategory: (id) => {
      set((s) => ({ categories: s.categories.filter((c) => c.id !== id || !c.custom) }));
      get().persist(); del('categories', [id]);
    },

    setBudget: (categoryId, amount) => {
      let updated: Budget | undefined;
      set((s) => {
        const existing = s.budgets.find((b) => b.categoryId === categoryId);
        if (existing) { updated = { ...existing, amount }; return { budgets: s.budgets.map((b) => (b.categoryId === categoryId ? updated! : b)) }; }
        updated = { id: uid('bg'), categoryId, amount, month: 'all' };
        return { budgets: [...s.budgets, updated] };
      });
      get().persist(); if (updated) push('budgets', updated);
    },
    removeBudget: (id) => {
      set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
      get().persist(); del('budgets', [id]);
    },

    addGoal: (g) => {
      const goal: Goal = { ...g, id: uid('gl'), createdAt: new Date().toISOString().slice(0, 10) };
      set((s) => ({ goals: [...s.goals, goal] }));
      get().persist(); push('goals', goal);
    },
    updateGoal: (id, patch) => {
      set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
      get().persist(); const g = get().goals.find((x) => x.id === id); if (g) push('goals', g);
    },
    deleteGoal: (id) => {
      set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
      get().persist(); del('goals', [id]);
    },
    contributeGoal: (id, amount) => {
      set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g)) }));
      get().persist(); const g = get().goals.find((x) => x.id === id); if (g) push('goals', g);
    },

    addInvestment: (i) => {
      const inv: Investment = { ...i, id: uid('iv') };
      set((s) => ({ investments: [...s.investments, inv] }));
      get().persist(); push('investments', inv);
    },
    updateInvestment: (id, patch) => {
      set((s) => ({ investments: s.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
      get().persist(); const i = get().investments.find((x) => x.id === id); if (i) push('investments', i);
    },
    deleteInvestment: (id) => {
      set((s) => ({ investments: s.investments.filter((i) => i.id !== id) }));
      get().persist(); del('investments', [id]);
    },

    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }));
      if (patch.theme) applyTheme(patch.theme);
      get().persist();
      const s = get();
      if (patch.name && s.cloud && s.authed && s.userId) cloud.setProfileName(s.userId, patch.name);
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
      // push a full restore up to the cloud
      const s = get();
      if (s.cloud && s.authed) {
        pushMany('categories', data.categories);
        pushMany('transactions', data.transactions);
        pushMany('budgets', data.budgets);
        pushMany('goals', data.goals);
        pushMany('investments', data.investments);
      }
    },
    resetAll: async () => {
      const s = get();
      if (s.cloud && s.authed && s.householdId) {
        // clear this household's rows in the cloud
        await cloud.remove('transactions', s.transactions.map((r) => r.id));
        await cloud.remove('budgets', s.budgets.map((r) => r.id));
        await cloud.remove('goals', s.goals.map((r) => r.id));
        await cloud.remove('investments', s.investments.map((r) => r.id));
        set({ ...emptyData() });
        get().persist();
        return;
      }
      await clearData();
      const seeded = seedData();
      await saveData(seeded);
      set({ ...seeded });
      applyTheme(seeded.settings.theme);
    },
  };
});

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}
