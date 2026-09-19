import { describe, it, expect, beforeEach } from 'vitest';
import { syncOutbox } from '../syncOutbox';

// Simple mock for localStorage if running in node environment
if (typeof localStorage === 'undefined' || !localStorage.getItem) {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

describe('syncOutbox', () => {
  const testUserId = 'test_user_outbox_1';

  beforeEach(() => {
    syncOutbox.clear(testUserId);
  });

  it('enqueues an item and increments pending count', () => {
    syncOutbox.enqueue('injection', 'upsert', 'inj_1', { dose: 100 }, testUserId);
    expect(syncOutbox.getPendingCount(testUserId)).toBe(1);
  });

  it('collapses rapid modifications to the same entity', () => {
    syncOutbox.enqueue('injection', 'upsert', 'inj_1', { dose: 100 }, testUserId);
    syncOutbox.enqueue('injection', 'upsert', 'inj_1', { dose: 125 }, testUserId);
    expect(syncOutbox.getPendingCount(testUserId)).toBe(1);

    const items = syncOutbox.getAll(testUserId);
    expect(items).toHaveLength(1);
    expect(items[0].payload.dose).toBe(125);
  });

  it('collapses upsert followed by delete into a single delete operation', () => {
    syncOutbox.enqueue('protocol', 'upsert', 'proto_1', { name: 'TRT' }, testUserId);
    syncOutbox.enqueue('protocol', 'delete', 'proto_1', undefined, testUserId);

    const items = syncOutbox.getAll(testUserId);
    expect(items).toHaveLength(1);
    expect(items[0].action).toBe('delete');
    expect(items[0].payload).toBeUndefined();
  });

  it('acknowledges completed items by removing them from outbox via markCompleted', () => {
    const item = syncOutbox.enqueue('lab', 'upsert', 'lab_1', { date: '2026-09-18' }, testUserId);
    expect(syncOutbox.getPendingCount(testUserId)).toBe(1);

    syncOutbox.markCompleted([item.id], testUserId);
    expect(syncOutbox.getPendingCount(testUserId)).toBe(0);
    expect(syncOutbox.getAll(testUserId)).toHaveLength(0);
  });
});
