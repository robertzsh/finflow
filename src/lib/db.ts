import { openDB, type IDBPDatabase } from 'idb';
import type { AppData } from '@/types';

const DB_NAME = 'finflow-db';
const STORE = 'appdata';
const KEY = 'main';

let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      },
    });
  }
  return dbp;
}

export async function loadData(): Promise<AppData | null> {
  try {
    const d = await db();
    return (await d.get(STORE, KEY)) ?? null;
  } catch {
    // fallback to localStorage if IndexedDB unavailable
    const raw = localStorage.getItem('finflow-data');
    return raw ? (JSON.parse(raw) as AppData) : null;
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    const d = await db();
    await d.put(STORE, data, KEY);
  } catch {
    localStorage.setItem('finflow-data', JSON.stringify(data));
  }
}

export async function clearData(): Promise<void> {
  try {
    const d = await db();
    await d.delete(STORE, KEY);
  } catch { /* ignore */ }
  localStorage.removeItem('finflow-data');
}
