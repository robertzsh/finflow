import type { Table } from '@/lib/cloud';

// Cloud write queue ("outbox"). Every write is queued, flushed to Supabase in order,
// and retried on reconnect, so a change made offline is never lost.
export type OutboxOp = {
  id: string;
  kind: 'upsert' | 'upsertMany' | 'remove' | 'opening' | 'income' | 'profileName' | 'household';
  table?: Table;
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

/** True while this device still has an unsent write for the row `table`/`id`.
 *  A realtime event for such a row is older than what's on screen (the echo of an
 *  earlier write, or a partner's edit that our queued write will supersede), so
 *  applying it would briefly revert the user's own change. */
export function hasPendingWrite(outbox: OutboxOp[], table: Table, id: string): boolean {
  return outbox.some((op) => op.table === table && (
    (op.kind === 'upsert' && op.obj?.id === id) ||
    (op.kind === 'upsertMany' && (op.objs ?? []).some((o) => o?.id === id)) ||
    (op.kind === 'remove' && (op.ids ?? []).includes(id))
  ));
}
