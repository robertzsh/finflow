import { supabase } from './supabase';
import type {
  Transaction, Budget, Goal, Investment, Category, InvestmentPoint,
} from '@/types';

// ---------------------------------------------------------------------------
// Mappers: app objects (camelCase) <-> database rows (snake_case)
// ---------------------------------------------------------------------------
const rowToTx = (r: any): Transaction => ({
  id: r.id, type: r.type, amount: Number(r.amount), categoryId: r.category_id,
  merchant: r.merchant, method: r.method, date: r.date, notes: r.notes ?? '',
  recurring: !!r.recurring, frequency: r.frequency ?? undefined, receipt: r.receipt ?? undefined,
  createdAt: r.created_at ?? '', createdBy: r.created_by ?? undefined,
});
const txToRow = (t: Transaction, householdId: string, uid: string) => ({
  id: t.id, household_id: householdId, created_by: t.createdBy ?? uid, type: t.type,
  amount: t.amount, category_id: t.categoryId, merchant: t.merchant, method: t.method,
  date: t.date, notes: t.notes ?? '', recurring: t.recurring,
  frequency: t.frequency ?? null, receipt: t.receipt ?? null,
});

const rowToBudget = (r: any): Budget => ({ id: r.id, categoryId: r.category_id, amount: Number(r.amount), month: r.month ?? 'all' });
const budgetToRow = (b: Budget, h: string) => ({ id: b.id, household_id: h, category_id: b.categoryId, amount: b.amount, month: b.month });

const rowToGoal = (r: any): Goal => ({ id: r.id, name: r.name, target: Number(r.target), saved: Number(r.saved), monthlyContribution: Number(r.monthly_contribution), color: r.color, icon: r.icon, currency: r.currency ?? undefined, owner: r.owner ?? undefined, contributions: (r.contributions ?? []) as any, createdAt: r.created_at ?? '' });
const goalToRow = (g: Goal, h: string) => ({ id: g.id, household_id: h, name: g.name, target: g.target, saved: g.saved, monthly_contribution: g.monthlyContribution, color: g.color, icon: g.icon, currency: g.currency ?? null, owner: g.owner ?? null, contributions: g.contributions ?? [], created_at: g.createdAt || null });

const rowToInv = (r: any): Investment => ({ id: r.id, name: r.name, ticker: r.ticker ?? undefined, kind: r.kind, currency: r.currency ?? undefined, units: Number(r.units), costBasis: Number(r.cost_basis), currentValue: Number(r.current_value), history: (r.history ?? []) as InvestmentPoint[] });
const invToRow = (i: Investment, h: string) => ({ id: i.id, household_id: h, name: i.name, ticker: i.ticker ?? null, kind: i.kind, currency: i.currency ?? null, units: i.units, cost_basis: i.costBasis, current_value: i.currentValue, history: i.history });

const rowToCat = (r: any): Category => ({ id: r.id, name: r.name, kind: r.kind, icon: r.icon, color: r.color, emoji: r.emoji ?? undefined, parent: r.parent ?? undefined, custom: r.custom ?? false });
const catToRow = (c: Category, h: string) => ({ id: c.id, household_id: h, name: c.name, kind: c.kind, icon: c.icon, color: c.color, emoji: c.emoji ?? null, parent: c.parent ?? null, custom: c.custom ?? false });

export type Table = 'transactions' | 'budgets' | 'goals' | 'investments' | 'categories';
const TO_ROW: Record<Table, (o: any, h: string, uid: string) => any> = {
  transactions: (o, h, uid) => txToRow(o, h, uid),
  budgets: (o, h) => budgetToRow(o, h),
  goals: (o, h) => goalToRow(o, h),
  investments: (o, h) => invToRow(o, h),
  categories: (o, h) => catToRow(o, h),
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signUp(email: string, password: string, name: string) {
  if (!supabase) throw new Error('Cloud disabled');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw error;
  return data;
}
export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Cloud disabled');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
export async function signOut() { await supabase?.auth.signOut(); }

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase!.auth.getSession();
  return data.session?.user.id ?? null;
}
export function onAuthChange(cb: (userId: string | null) => void) {
  return supabase!.auth.onAuthStateChange((_e, session) => cb(session?.user.id ?? null));
}

// ---------------------------------------------------------------------------
// Profile / household
// ---------------------------------------------------------------------------
export interface Member { id: string; name: string; openingBalance: number; salary: number; vouchers: number }
export async function getProfile(uid: string) {
  const { data, error } = await supabase!.from('profiles').select('name, household_id').eq('id', uid).single();
  if (error) throw error;
  return { name: data.name as string, householdId: data.household_id as string };
}
export async function setOpeningBalance(uid: string, amount: number) {
  await supabase!.from('profiles').update({ opening_balance: amount }).eq('id', uid);
}
export async function setIncome(uid: string, patch: { salary?: number; vouchers?: number }) {
  const row: any = {};
  if (patch.salary !== undefined) row.salary = patch.salary;
  if (patch.vouchers !== undefined) row.vouchers = patch.vouchers;
  if (Object.keys(row).length) await supabase!.from('profiles').update(row).eq('id', uid);
}
export async function getHousehold(householdId: string) {
  const { data, error } = await supabase!.from('households').select('name, invite_code, currency, fx_rates').eq('id', householdId).single();
  if (error) throw error;
  return {
    name: data.name as string,
    inviteCode: data.invite_code as string,
    currency: (data.currency ?? 'RON') as string,
    fxRates: (data.fx_rates ?? null) as Record<string, number> | null,
  };
}
export async function setHouseholdSettings(householdId: string, patch: { currency?: string; fxRates?: Record<string, number> }) {
  const row: any = {};
  if (patch.currency) row.currency = patch.currency;
  if (patch.fxRates) row.fx_rates = patch.fxRates;
  if (Object.keys(row).length) await supabase!.from('households').update(row).eq('id', householdId);
}
export async function getMembers(householdId: string): Promise<Member[]> {
  const { data, error } = await supabase!.from('profiles').select('id, name, opening_balance, salary, vouchers').eq('household_id', householdId);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name ?? 'Member', openingBalance: Number(r.opening_balance ?? 0), salary: Number(r.salary ?? 0), vouchers: Number(r.vouchers ?? 0) }));
}
export async function joinHousehold(code: string) {
  const { data, error } = await supabase!.rpc('join_household', { code: code.trim() });
  if (error) throw error;
  return data as string;
}
export async function setProfileName(uid: string, name: string) {
  await supabase!.from('profiles').update({ name }).eq('id', uid);
}

// ---------------------------------------------------------------------------
// Data: bulk fetch + single-row upsert/delete
// ---------------------------------------------------------------------------
export async function fetchAll(householdId: string) {
  const [tx, bg, gl, iv, ct] = await Promise.all([
    supabase!.from('transactions').select('*').eq('household_id', householdId).order('date', { ascending: false }),
    supabase!.from('budgets').select('*').eq('household_id', householdId),
    supabase!.from('goals').select('*').eq('household_id', householdId),
    supabase!.from('investments').select('*').eq('household_id', householdId),
    supabase!.from('categories').select('*').eq('household_id', householdId),
  ]);
  return {
    transactions: (tx.data ?? []).map(rowToTx),
    budgets: (bg.data ?? []).map(rowToBudget),
    goals: (gl.data ?? []).map(rowToGoal),
    investments: (iv.data ?? []).map(rowToInv),
    categories: (ct.data ?? []).map(rowToCat),
  };
}

export async function fetchTable(table: Table, householdId: string) {
  const { data } = await supabase!.from(table).select('*').eq('household_id', householdId);
  const map = { transactions: rowToTx, budgets: rowToBudget, goals: rowToGoal, investments: rowToInv, categories: rowToCat }[table];
  return (data ?? []).map(map as any);
}

export async function upsert(table: Table, obj: any, householdId: string, uid: string) {
  const row = TO_ROW[table](obj, householdId, uid);
  const { error } = await supabase!.from(table).upsert(row);
  if (error) console.error(`upsert ${table}`, error);
}
export async function upsertMany(table: Table, objs: any[], householdId: string, uid: string) {
  if (!objs.length) return;
  const rows = objs.map((o) => TO_ROW[table](o, householdId, uid));
  const { error } = await supabase!.from(table).upsert(rows);
  if (error) console.error(`upsertMany ${table}`, error);
}
export async function remove(table: Table, ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase!.from(table).delete().in('id', ids);
  if (error) console.error(`delete ${table}`, error);
}

// Seed a brand-new household with the default categories so budgets/labels work.
export async function seedIfEmpty(householdId: string, uid: string, categories: Category[]) {
  const { count } = await supabase!.from('categories').select('*', { count: 'exact', head: true }).eq('household_id', householdId);
  if ((count ?? 0) === 0) await upsertMany('categories', categories, householdId, uid);
}

// ---------------------------------------------------------------------------
// Realtime: notify when any household table changes
// ---------------------------------------------------------------------------
export type ChangeEvent = { table: Table; type: 'INSERT' | 'UPDATE' | 'DELETE'; obj: any };
const MAPPERS: Record<Table, (r: any) => any> = {
  transactions: rowToTx, budgets: rowToBudget, goals: rowToGoal, investments: rowToInv, categories: rowToCat,
};

// Apply changes incrementally (never a full-table replace), so a locally-added row
// can't be wiped by an in-flight refresh. Each partner's change is merged by id.
export function subscribe(householdId: string, onEvent: (e: ChangeEvent) => void) {
  const tables: Table[] = ['transactions', 'budgets', 'goals', 'investments', 'categories'];
  const channel = supabase!.channel(`hh-${householdId}`);
  for (const t of tables) {
    channel.on('postgres_changes',
      { event: '*', schema: 'public', table: t, filter: `household_id=eq.${householdId}` },
      (payload: any) => {
        const type = payload.eventType as ChangeEvent['type'];
        if (type === 'DELETE') onEvent({ table: t, type, obj: { id: payload.old?.id } });
        else onEvent({ table: t, type, obj: MAPPERS[t](payload.new) });
      });
  }
  channel.subscribe();
  return () => { supabase!.removeChannel(channel); };
}
