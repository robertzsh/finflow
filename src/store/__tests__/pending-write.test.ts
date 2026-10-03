import { describe, it, expect } from 'vitest';
import { hasPendingWrite, type OutboxOp } from '@/store/sync';

const op = (p: Partial<OutboxOp>): OutboxOp => ({ id: Math.random().toString(36).slice(2), kind: 'upsert', ...p });

describe('hasPendingWrite', () => {
  it('is false with an empty outbox', () => {
    expect(hasPendingWrite([], 'transactions', 'tx1')).toBe(false);
  });

  it('matches a single upsert of the same row', () => {
    const outbox = [op({ kind: 'upsert', table: 'transactions', obj: { id: 'tx1' } })];
    expect(hasPendingWrite(outbox, 'transactions', 'tx1')).toBe(true);
    expect(hasPendingWrite(outbox, 'transactions', 'tx2')).toBe(false);
  });

  it('matches a row inside a batched upsert', () => {
    const outbox = [op({ kind: 'upsertMany', table: 'categories', objs: [{ id: 'a' }, { id: 'b' }] })];
    expect(hasPendingWrite(outbox, 'categories', 'b')).toBe(true);
  });

  it('matches a pending delete', () => {
    const outbox = [op({ kind: 'remove', table: 'goals', ids: ['g1', 'g2'] })];
    expect(hasPendingWrite(outbox, 'goals', 'g2')).toBe(true);
  });

  it('does not confuse the same id across tables', () => {
    const outbox = [op({ kind: 'upsert', table: 'budgets', obj: { id: 'x' } })];
    expect(hasPendingWrite(outbox, 'transactions', 'x')).toBe(false);
  });

  it('ignores profile/household ops that are not table rows', () => {
    const outbox = [op({ kind: 'opening', uid: 'tx1', amount: 5 }), op({ kind: 'household', householdId: 'tx1' })];
    expect(hasPendingWrite(outbox, 'transactions', 'tx1')).toBe(false);
  });
});
