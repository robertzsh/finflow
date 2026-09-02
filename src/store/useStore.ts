import { create } from 'zustand';
import type { AppData, Transaction, Category, Budget, Goal, Investment, Settings } from '@/types';
import { DEFAULT_CATEGORIES } from '@/data/categories';
import {
  generateTransactions, defaultBudgets, defaultGoals, defaultInvestments, DEFAULT_SETTINGS,
} from '@/data/mockData';
import { loadData, saveData, clearData } from '@/lib/db';
import { CLOUD_ENABLED } from '@/lib/config';
import * as cloud from '@/lib/cloud';
import { fetchFxRates, snapshotRates, rateForDate } from '@/lib/rates';
import { setMoneyPrivacy } from '@/lib/format';
import { dueOccurrences } from '@/lib/recurring';

const SKIP_KEY = 'ff_skipped_recur';
const loadSkipped = (): string[] => { try { return JSON.parse(localStorage.getItem(SKIP_KEY) || '[]'); } catch { return []; } };
const saveSkipped = (s: string[]) => { try { localStorage.setItem(SKIP_KEY, JSON.stringify(s)); } catch { /* ignore */ } };

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
  return { transactions: [], categories: DEFAULT_CATEGORIES, budgets: [], goals: [], investments: [], settings: { ...DEFAULT_SETTINGS, openingBalance: 0, onboarded: true } };
}

interface StoreState extends AppData {
  ready: boolean;
  locked: boolean;
  privacy: boolean;
  togglePrivacy: () => void;
  outbox: OutboxOp[];
  syncState: SyncState;
  retrySync: () => void;

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
  setMyOpeningBalance: (amount: number) => Promise<void>;
  setMyIncome: (salary: number, vouchers: number) => Promise<void>;
  ensureStandingIncome: () => void;

  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactions: (ids: string[]) => void;
  bulkUpdate: (ids: string[], patch: Partial<Transaction>) => void;
  importTransactions: (list: Partial<Transaction>[]) => void;

  // recurring auto-posting
  pendingRecurring: import('@/lib/recurring').DueOccurrence[];
  runRecurringPosting: () => void;                       // auto-post fixed due bills, queue variable ones
  confirmRecurring: (recurrenceKey: string, amount: number) => void;
  skipRecurring: (recurrenceKey: string) => void;

  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  setBudget: (categoryId: string, amount: number) => void;
  removeBudget: (id: string) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  contributeGoal: (id: string, baseAmount: number, by?: string) => void;

  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, patch: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  importInvestments: (list: { name: string; ticker?: string; kind: string; units: number; costBasis: number; currency: string }[]) => number;

  updateSettings: (patch: Partial<Settings>) => void;
  refreshRates: () => Promise<boolean>;
  lock: () => void;
  unlock: (pin?: string) => boolean;
  restore: (data: AppData) => void;
  resetAll: () => Promise<void>;
}

let unsubRealtime: (() => void) | null = null;
let flushing = false;

export type OutboxOp = {
  id: string;
  kind: 'upsert' | 'upsertMany' | 'remove' | 'opening' | 'income' | 'profileName' | 'household';
  table?: cloud.Table;
  obj?: any;
  objs?: any[];
  ids?: string[];
  uid?: string;
  amount?: number;
  salary?: number;
  vouchers?: number;
  name?: string;
  householdId?: string;
  patch?: { currency?: string; fxRates?: Record<string, number> };
};
export type SyncState = 'idle' | 'pending' | 'error';

export const useStore = create<StoreState>((set, get) => {
  // --- Offline-safe write outbox -------------------------------------------
  // Every cloud write goes through a queue. If it fails (offline / server error)
  // it stays queued and is retried on reconnect, so changes are never lost and
  // both devices converge. syncState drives the little indicator in the top bar.
  const OUTBOX_KEY = 'ff_outbox';
  const persistOutbox = () => { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(get().outbox)); } catch { /* ignore */ } };
  const enqueue = (op: OutboxOp) => {
    set((s) => ({ outbox: [...s.outbox, op], syncState: 'pending' }));
    persistOutbox();
    void flushOutbox();
  };
  const push = (table: cloud.Table, obj: any) => {
    const s = get();
    if (s.cloud && s.authed && s.householdId && s.userId) enqueue({ id: uid('ob'), kind: 'upsert', table, obj });
  };
  const pushMany = (table: cloud.Table, objs: any[]) => {
    const s = get();
    if (s.cloud && s.authed && s.householdId && s.userId && objs.length) enqueue({ id: uid('ob'), kind: 'upsertMany', table, objs });
  };
  const del = (table: cloud.Table, ids: string[]) => {
    const s = get();
    if (s.cloud && s.authed && s.householdId && s.userId && ids.length) enqueue({ id: uid('ob'), kind: 'remove', table, ids });
  };
  const flushOutbox = async () => {
    const s = get();
    if (!s.cloud || !s.authed || !s.householdId || !s.userId) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) { set((st) => ({ syncState: st.outbox.length ? 'pending' : 'idle' })); return; }
    if (flushing) return;
    flushing = true;
    try {
      while (get().outbox.length) {
        const op = get().outbox[0];
        let ok = false;
        try {
          if (op.kind === 'upsert') ok = await cloud.upsert(op.table!, op.obj, s.householdId, s.userId);
          else if (op.kind === 'upsertMany') ok = await cloud.upsertMany(op.table!, op.objs ?? [], s.householdId, s.userId);
          else if (op.kind === 'remove') ok = await cloud.remove(op.table!, op.ids ?? []);
          else if (op.kind === 'opening') ok = await cloud.setOpeningBalance(op.uid!, op.amount ?? 0);
          else if (op.kind === 'income') ok = await cloud.setIncome(op.uid!, { salary: op.salary, vouchers: op.vouchers });
          else if (op.kind === 'profileName') ok = await cloud.setProfileName(op.uid!, op.name ?? '');
          else if (op.kind === 'household') ok = await cloud.setHouseholdSettings(op.householdId!, op.patch ?? {});
        } catch { ok = false; }
        if (!ok) { set({ syncState: 'error' }); break; }
        set((st) => ({ outbox: st.outbox.slice(1) }));
        persistOutbox();
      }
      if (get().outbox.length === 0) set({ syncState: 'idle' });
    } finally {
      flushing = false;
    }
  };
  const findTx = (id: string) => get().transactions.find((t) => t.id === id);

  // Apply the device theme on boot (localStorage wins over the loaded settings) and
  // keep the store's settings.theme in sync so the Settings toggle highlights correctly.
  const bootTheme = (fallback: 'dark' | 'light' | 'pink') => {
    const t = deviceTheme(fallback);
    applyTheme(t);
    if (t !== get().settings.theme) set((s) => ({ settings: { ...s.settings, theme: t } }));
  };

  const monthKeyNow = () => new Date().toISOString().slice(0, 7);
  const incomeOwner = () => (get().cloud && get().authed ? get().userId : 'local');
  const siId = (kind: string, owner: string, mk: string) => `si-${kind}-${owner}-${mk}`;

  // Create this month's salary/vouchers income if they don't exist yet (never overwrites edits).
  const ensureStandingIncome = () => {
    const s = get();
    const owner = incomeOwner();
    if (!owner) return;
    const mk = monthKeyNow();
    const date = `${mk}-01`;
    const defs = [
      { kind: 'salary', categoryId: 'salary', name: 'Salary', amount: s.settings.salary },
      { kind: 'vouchers', categoryId: 'vouchers', name: 'Bonuri', amount: s.settings.vouchers },
    ];
    const byId = new Map(s.transactions.map((t) => [t.id, t] as const));
    const toCreate: Transaction[] = [];
    const toFix: Transaction[] = [];
    for (const d of defs) {
      const id = siId(d.kind, owner, mk);
      const ex = byId.get(id);
      if (!ex && d.amount > 0) {
        toCreate.push({
          id, type: 'income', amount: d.amount, categoryId: d.categoryId,
          merchant: d.name, method: 'Bank Transfer', date, recurring: true, frequency: 'monthly',
          notes: '', createdAt: new Date().toISOString(), createdBy: s.cloud && s.authed ? (s.userId ?? undefined) : undefined,
        });
      } else if (ex && ex.merchant !== d.name) {
        // fix a stale name (e.g. old "Vouchers" → "Bonuri"); amount is left untouched
        toFix.push({ ...ex, merchant: d.name });
      }
    }
    if (toCreate.length || toFix.length) {
      const fixMap = new Map(toFix.map((t) => [t.id, t] as const));
      set((st) => ({ transactions: [...toCreate, ...st.transactions.map((t) => fixMap.get(t.id) ?? t)].sort((a, b) => (a.date < b.date ? 1 : -1)) }));
      get().persist();
      pushMany('transactions', [...toCreate, ...toFix]);
    }
  };

  // Add bank sub-categories (ING, BRD, …) under the user's "Card de credit" category,
  // mirroring how grocery stores nest under Groceries. Idempotent + deterministic ids
  // so both members converge on the same rows without duplicates.
  const BANK_SUBS = [
    { slug: 'ing', name: 'ING', color: '#ff6200' },
    { slug: 'brd', name: 'BRD', color: '#e2001a' },
    { slug: 'bcr', name: 'BCR', color: '#0a5ed7' },
    { slug: 'bt', name: 'Banca Transilvania', color: '#eab308' },
    { slug: 'raiffeisen', name: 'Raiffeisen', color: '#facc15' },
    { slug: 'revolut', name: 'Revolut', color: '#191c1f' },
    { slug: 'other-bank', name: 'Other bank', color: '#64748b' },
  ];
  const ensureBankSubcategories = () => {
    const s = get();
    const card = s.categories.find((c) => !c.parent && /card.*credit/i.test(c.name));
    if (!card) return;
    const haveNames = new Set(s.categories.filter((c) => c.parent === card.id).map((c) => c.name.toLowerCase()));
    const haveIds = new Set(s.categories.map((c) => c.id));
    const toAdd: Category[] = [];
    for (const b of BANK_SUBS) {
      const id = `sub-${card.id}-${b.slug}`;
      if (haveIds.has(id) || haveNames.has(b.name.toLowerCase())) continue;
      toAdd.push({ id, name: b.name, kind: card.kind, icon: 'Landmark', color: b.color, emoji: '🏦', parent: card.id, custom: true });
    }
    if (toAdd.length) {
      set((st) => ({ categories: [...st.categories, ...toAdd] }));
      get().persist();
      pushMany('categories', toAdd);
    }
  };

  // Apply new salary/vouchers amounts to the CURRENT month immediately (create/update/remove).
  const applyIncomeToCurrentMonth = (salary: number, vouchers: number) => {
    const s = get();
    const owner = incomeOwner();
    if (!owner) return;
    const mk = monthKeyNow();
    const date = `${mk}-01`;
    const items = [
      { kind: 'salary', categoryId: 'salary', name: 'Salary', amount: salary },
      { kind: 'vouchers', categoryId: 'vouchers', name: 'Bonuri', amount: vouchers },
    ];
    for (const it of items) {
      const id = siId(it.kind, owner, mk);
      const present = get().transactions.some((t) => t.id === id);
      if (it.amount > 0) {
        if (present) {
          set((st) => ({ transactions: st.transactions.map((t) => (t.id === id ? { ...t, amount: it.amount } : t)) }));
        } else {
          const tx: Transaction = { id, type: 'income', amount: it.amount, categoryId: it.categoryId, merchant: it.name, method: 'Bank Transfer', date, recurring: true, frequency: 'monthly', notes: '', createdAt: new Date().toISOString(), createdBy: s.cloud && s.authed ? (s.userId ?? undefined) : undefined };
          set((st) => ({ transactions: [tx, ...st.transactions] }));
        }
        const row = get().transactions.find((t) => t.id === id);
        if (row) push('transactions', row);
      } else if (present) {
        set((st) => ({ transactions: st.transactions.filter((t) => t.id !== id) }));
        del('transactions', [id]);
      }
    }
    get().persist();
  };

  return {
    ...seedData(),
    ready: false,
    locked: false,
    privacy: (() => { try { return localStorage.getItem('ff_privacy') === '1'; } catch { return false; } })(),
    outbox: (() => { try { return JSON.parse(localStorage.getItem('ff_outbox') || '[]'); } catch { return []; } })(),
    pendingRecurring: [],
    syncState: 'idle',
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
      // Retry queued writes whenever we come back online; reflect offline in the badge.
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => { void flushOutbox(); });
        window.addEventListener('offline', () => set((st) => ({ syncState: st.outbox.length ? 'pending' : 'idle' })));
      }
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
        bootTheme(get().settings.theme);
        ensureStandingIncome();
        ensureBankSubcategories();
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
      bootTheme(get().settings.theme);
    },

    loadFromCloud: async (userId) => {
      const profile = await cloud.getProfile(userId);
      const household = await cloud.getHousehold(profile.householdId);
      await cloud.seedIfEmpty(profile.householdId, userId, DEFAULT_CATEGORIES);
      const data = await cloud.fetchAll(profile.householdId);
      const members = await cloud.getMembers(profile.householdId);

      // Reconcile categories: add any new default categories (e.g. Lidl, Mani + Pedi)
      // and backfill emojis onto existing ones, then push the additions to the cloud.
      const byId = new Map(data.categories.map((c) => [c.id, c] as const));
      const toUpsert: Category[] = [];
      for (const d of DEFAULT_CATEGORIES) {
        const ex = byId.get(d.id);
        if (!ex) { byId.set(d.id, { ...d, custom: false }); toUpsert.push({ ...d, custom: false }); }
        // Built-in categories (matched by id) are kept in sync with the code — including
        // fixing any wrongly-set custom flag and stamping the parent link.
        else if (ex.name !== d.name || ex.emoji !== d.emoji || ex.icon !== d.icon || ex.color !== d.color || ex.parent !== d.parent || ex.custom) {
          const merged = { ...ex, name: d.name, emoji: d.emoji, icon: d.icon, color: d.color, parent: d.parent, custom: false };
          byId.set(d.id, merged); toUpsert.push(merged);
        }
      }
      const categories = data.categories.length ? [...byId.values()] : DEFAULT_CATEGORIES;
      if (toUpsert.length) cloud.upsertMany('categories', toUpsert, profile.householdId, userId);

      // Repair orphaned transactions (their category was deleted) → move to Miscellaneous.
      const validCatIds = new Set(categories.map((c) => c.id));
      const txOrphans: Transaction[] = [];
      data.transactions = data.transactions.map((t) => {
        if (t.categoryId && !validCatIds.has(t.categoryId)) { const fixed = { ...t, categoryId: 'misc' }; txOrphans.push(fixed); return fixed; }
        return t;
      });
      if (txOrphans.length) cloud.upsertMany('transactions', txOrphans, profile.householdId, userId);
      // device-local preferences (theme, currency, fx, pin) stay in IndexedDB
      const local = await loadData();
      const me = members.find((m) => m.id === userId);
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        ...(local?.settings ?? {}),
        // currency + fx rates are shared at household level (so every device matches)
        currency: (household.currency as Settings['currency']) || DEFAULT_SETTINGS.currency,
        fxRates: { ...DEFAULT_SETTINGS.fxRates, ...(household.fxRates ?? {}) },
        // per-person figures come from the profile
        salary: me?.salary ?? 0,
        vouchers: me?.vouchers ?? 0,
        name: profile.name || DEFAULT_SETTINGS.name,
        onboarded: true,
      };
      set({
        transactions: data.transactions,
        categories,
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
        locked: !!settings.pinEnabled,
        authError: '',
      });
      bootTheme(settings.theme);
      ensureStandingIncome(); // auto-add this month's salary + vouchers if missing
      ensureBankSubcategories(); // nest ING/BRD/… under "Card de credit"
      void flushOutbox(); // retry any writes queued while offline in a previous session

      if (unsubRealtime) unsubRealtime();
      unsubRealtime = cloud.subscribe(profile.householdId, ({ table, type, obj }) => {
        set((st: any) => {
          const list = (st[table] as any[]) ?? [];
          let next: any[];
          if (type === 'DELETE') next = list.filter((x) => x.id !== obj.id);
          else {
            const i = list.findIndex((x) => x.id === obj.id);
            next = i >= 0 ? list.map((x) => (x.id === obj.id ? obj : x)) : [obj, ...list];
          }
          if (table === 'transactions') next = (next as Transaction[]).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
          return { [table]: next };
        });
      });
    },

    refreshMembers: async () => {
      const s = get();
      if (s.householdId) set({ members: await cloud.getMembers(s.householdId) });
    },

    setMyOpeningBalance: async (amount) => {
      const s = get();
      if (s.cloud && s.authed && s.userId) {
        const ok = await cloud.setOpeningBalance(s.userId, amount);
        if (ok) await get().refreshMembers();
        else enqueue({ id: uid('ob'), kind: 'opening', uid: s.userId, amount }); // offline → retry on reconnect
      } else {
        get().updateSettings({ openingBalance: amount });
      }
    },

    setMyIncome: async (salary, vouchers) => {
      set((st) => ({ settings: { ...st.settings, salary, vouchers } }));
      get().persist();
      const s = get();
      if (s.cloud && s.authed && s.userId) {
        const ok = await cloud.setIncome(s.userId, { salary, vouchers });
        if (ok) await get().refreshMembers();
        else enqueue({ id: uid('ob'), kind: 'income', uid: s.userId, salary, vouchers });
      }
      applyIncomeToCurrentMonth(salary, vouchers);
    },
    ensureStandingIncome,

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
      const tx: Transaction = { ...t, id: uid('tx'), createdAt: new Date().toISOString(), createdBy: t.createdBy ?? get().userId ?? undefined };
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

    runRecurringPosting: () => {
      const s = get();
      const due = dueOccurrences(s.transactions, new Date(), loadSkipped(), s.categories);
      const fixed = due.filter((d) => !d.variable);
      const variable = due.filter((d) => d.variable);
      if (fixed.length) {
        const now = new Date().toISOString();
        const fx = s.settings.fxRates;
        const posted: Transaction[] = fixed.map((d) => {
          // Foreign bills post at the rate on their occurrence date (not today's).
          const amount = d.base.origCurrency && d.base.origAmount != null
            ? Math.round(d.base.origAmount * rateForDate(d.date, d.base.origCurrency, fx) * 100) / 100
            : d.amount;
          return {
            ...d.base, id: uid('tx'), date: d.date, amount,
            auto: true, recurrenceKey: d.recurrenceKey, createdAt: now,
            createdBy: d.base.createdBy, // keep it recurring so the template lineage continues, keep payer
          };
        });
        set((st) => ({ transactions: [...posted, ...st.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)) }));
        get().persist(); pushMany('transactions', posted);
      }
      // variable bills wait for the user to confirm the amount
      set({ pendingRecurring: variable });
    },
    confirmRecurring: (recurrenceKey, amount) => {
      const s = get();
      const occ = s.pendingRecurring.find((d) => d.recurrenceKey === recurrenceKey);
      if (!occ || !(amount > 0)) return;
      const tx: Transaction = {
        ...occ.base, id: uid('tx'), date: occ.date, amount,
        auto: true, recurrenceKey, createdAt: new Date().toISOString(), createdBy: occ.base.createdBy,
      };
      set((st) => ({
        transactions: [tx, ...st.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)),
        pendingRecurring: st.pendingRecurring.filter((d) => d.recurrenceKey !== recurrenceKey),
      }));
      get().persist(); push('transactions', tx);
    },
    skipRecurring: (recurrenceKey) => {
      const next = [...loadSkipped(), recurrenceKey];
      saveSkipped(next);
      set((st) => ({ pendingRecurring: st.pendingRecurring.filter((d) => d.recurrenceKey !== recurrenceKey) }));
    },

    addCategory: (c) => {
      const cat: Category = { ...c, id: uid('cat'), custom: true };
      set((s) => ({ categories: [...s.categories, cat] }));
      get().persist(); push('categories', cat);
    },
    updateCategory: (id, patch) => {
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      get().persist();
      const c = get().categories.find((x) => x.id === id);
      if (c) push('categories', c);
    },
    deleteCategory: (id) => {
      // reassign any transactions in this category to Miscellaneous so none are orphaned
      const affected = get().transactions.filter((t) => t.categoryId === id);
      set((s) => ({
        categories: s.categories.filter((c) => c.id !== id || !c.custom),
        transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: 'misc' } : t)),
      }));
      get().persist(); del('categories', [id]);
      if (affected.length) pushMany('transactions', get().transactions.filter((t) => affected.some((a) => a.id === t.id)));
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
    contributeGoal: (id, baseAmount, by) => {
      const s = get();
      const g = s.goals.find((x) => x.id === id);
      if (!g || baseAmount <= 0) return;
      const rate = s.settings.fxRates[(g.currency ?? s.settings.currency)] ?? 1; // lei per 1 unit of goal currency
      const inGoalCurrency = baseAmount / rate;                                   // convert lei → goal currency
      const contribution = { date: new Date().toISOString(), amount: baseAmount, by: by ?? (s.userId ?? undefined) };
      set((st) => ({ goals: st.goals.map((x) => (x.id === id ? { ...x, saved: Math.min(x.target, x.saved + inGoalCurrency), contributions: [...(x.contributions ?? []), contribution] } : x)) }));
      get().persist(); const updated = get().goals.find((x) => x.id === id); if (updated) push('goals', updated);
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
    importInvestments: (list) => {
      const valid = new Set(['RON', 'EUR', 'USD', 'GBP']);
      const base = get().settings.currency;
      const today = new Date().toISOString().slice(0, 10);
      const mapped: Investment[] = list.map((h) => ({
        id: uid('iv'), name: h.name, ticker: h.ticker, kind: (h.kind as any) ?? 'Stock',
        currency: (valid.has(h.currency) ? h.currency : base) as any,
        units: h.units, costBasis: h.costBasis, currentValue: h.costBasis,
        history: [{ date: today, value: h.costBasis }],
      }));
      set((s) => ({ investments: [...s.investments, ...mapped] }));
      get().persist(); pushMany('investments', mapped);
      return mapped.length;
    },

    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }));
      if (patch.theme) applyTheme(patch.theme);
      get().persist();
      const s = get();
      if (patch.name && s.cloud && s.authed && s.userId) {
        const u = s.userId, nm = patch.name;
        cloud.setProfileName(u, nm).then((ok) => { if (!ok) enqueue({ id: uid('ob'), kind: 'profileName', uid: u, name: nm }); });
      }
      // currency + fx rates are household-wide → persist to the cloud for both members
      if ((patch.currency || patch.fxRates) && s.cloud && s.authed && s.householdId) {
        const hh = s.householdId;
        const hpatch = { currency: patch.currency, fxRates: patch.fxRates ? s.settings.fxRates : undefined };
        cloud.setHouseholdSettings(hh, hpatch).then((ok) => { if (!ok) enqueue({ id: uid('ob'), kind: 'household', householdId: hh, patch: hpatch }); });
      }
    },
    refreshRates: async () => {
      const rates = await fetchFxRates();
      if (!rates) return false;
      get().updateSettings({ fxRates: { ...get().settings.fxRates, ...rates, RON: 1 } });
      snapshotRates(get().settings.fxRates); // record today's rates for historical conversion
      return true;
    },
    togglePrivacy: () => set((s) => { const v = !s.privacy; setMoneyPrivacy(v); try { localStorage.setItem('ff_privacy', v ? '1' : '0'); } catch {} return { privacy: v }; }),
    retrySync: () => { void flushOutbox(); },
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

function applyTheme(theme: 'dark' | 'light' | 'pink') {
  // Persist synchronously so the choice survives an immediate reload (IndexedDB
  // writes are async) and there's no theme flash on next load.
  try { localStorage.setItem('ff_theme', theme); } catch { /* ignore */ }
  const root = document.documentElement;
  // Pink is a light-based theme, so it reuses the light utility remaps and adds a pink skin on top.
  const isLightLike = theme === 'light' || theme === 'pink';
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', isLightLike);
  root.classList.toggle('pink', theme === 'pink');
}

// The device's current theme — localStorage (most recent, synchronous) wins over the fallback.
function deviceTheme(fallback: 'dark' | 'light' | 'pink'): 'dark' | 'light' | 'pink' {
  try {
    const s = localStorage.getItem('ff_theme');
    if (s === 'dark' || s === 'light' || s === 'pink') return s;
  } catch { /* ignore */ }
  return fallback;
}
