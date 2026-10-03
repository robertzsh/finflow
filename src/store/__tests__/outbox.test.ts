import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Drive the real store in cloud mode with Supabase (`@/lib/cloud`) and IndexedDB mocked,
// to check the write queue: writes are sent in order, kept on failure/offline, and retried.
const cloud = vi.hoisted(() => ({
  upsert: vi.fn(async () => true),
  upsertMany: vi.fn(async () => true),
  remove: vi.fn(async () => true),
}));
vi.mock('@/lib/cloud', () => cloud);
vi.mock('@/lib/db', () => ({ loadData: vi.fn(async () => null), saveData: vi.fn(async () => {}), clearData: vi.fn(async () => {}) }));

let ls: Record<string, string>;
let net: { onLine: boolean };

async function cloudStore() {
  const { useStore } = await import('@/store/useStore');
  useStore.setState({ cloud: true, authed: true, householdId: 'h1', userId: 'u1', outbox: [], syncState: 'idle', transactions: [] });
  return useStore;
}

const expense = { type: 'expense' as const, amount: 300, categoryId: 'groceries', merchant: 'Kaufland', method: 'Card' as const, date: '2026-10-03', recurring: false };

beforeEach(() => {
  vi.resetModules(); // fresh store + module-level "flushing" flag per test
  ls = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in ls ? ls[k] : null),
    setItem: (k: string, v: string) => { ls[k] = v; },
    removeItem: (k: string) => { delete ls[k]; },
  });
  net = { onLine: true };
  vi.stubGlobal('navigator', net);
  for (const fn of Object.values(cloud)) { fn.mockReset(); fn.mockResolvedValue(true); }
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('cloud write outbox', () => {
  it('sends a new transaction to Supabase and drains the queue', async () => {
    const store = await cloudStore();
    store.getState().addTransaction(expense);
    const tx = store.getState().transactions[0];

    await vi.waitFor(() => expect(store.getState().syncState).toBe('idle'));
    expect(cloud.upsert).toHaveBeenCalledWith('transactions', tx, 'h1', 'u1');
    expect(store.getState().outbox).toEqual([]);
    expect(JSON.parse(ls.ff_outbox)).toEqual([]);
  });

  it('keeps a failed write queued (and persisted), then sends it on retry', async () => {
    cloud.upsert.mockResolvedValueOnce(false);
    const store = await cloudStore();
    store.getState().addTransaction(expense);

    await vi.waitFor(() => expect(store.getState().syncState).toBe('error'));
    expect(store.getState().outbox).toHaveLength(1);
    expect(JSON.parse(ls.ff_outbox)).toHaveLength(1); // survives an app restart

    store.getState().retrySync();
    await vi.waitFor(() => expect(store.getState().syncState).toBe('idle'));
    expect(cloud.upsert).toHaveBeenCalledTimes(2);
    expect(store.getState().outbox).toEqual([]);
  });

  it('treats a thrown network error like a failure', async () => {
    cloud.upsert.mockRejectedValueOnce(new Error('fetch failed'));
    const store = await cloudStore();
    store.getState().addTransaction(expense);
    await vi.waitFor(() => expect(store.getState().syncState).toBe('error'));
    expect(store.getState().outbox).toHaveLength(1);
  });

  it('replays queued writes in the order they were made', async () => {
    cloud.upsert.mockResolvedValueOnce(false); // first attempt fails → add stays queued
    const store = await cloudStore();
    store.getState().addTransaction(expense);
    const id = store.getState().transactions[0].id;
    await vi.waitFor(() => expect(store.getState().syncState).toBe('error'));

    store.getState().deleteTransaction(id); // queued behind the add; triggers a flush
    await vi.waitFor(() => expect(store.getState().syncState).toBe('idle'));

    expect(cloud.remove).toHaveBeenCalledWith('transactions', [id]);
    const lastUpsert = Math.max(...cloud.upsert.mock.invocationCallOrder);
    expect(lastUpsert).toBeLessThan(cloud.remove.mock.invocationCallOrder[0]); // add before delete
  });

  it('holds writes while offline and sends them once back online', async () => {
    net.onLine = false;
    const store = await cloudStore();
    store.getState().addTransaction(expense);

    expect(cloud.upsert).not.toHaveBeenCalled();
    expect(store.getState().syncState).toBe('pending');
    expect(store.getState().outbox).toHaveLength(1);

    net.onLine = true;
    store.getState().retrySync(); // what the 'online' listener does
    await vi.waitFor(() => expect(store.getState().syncState).toBe('idle'));
    expect(cloud.upsert).toHaveBeenCalledTimes(1);
  });

  it('queues nothing when not signed in to the cloud', async () => {
    const store = await cloudStore();
    store.setState({ cloud: false, authed: false });
    store.getState().addTransaction(expense);
    expect(store.getState().outbox).toEqual([]);
    expect(cloud.upsert).not.toHaveBeenCalled();
  });
});
