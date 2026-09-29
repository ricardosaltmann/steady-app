import { auth } from './auth';

export type OutboxEntityType = 'injection' | 'protocol' | 'lab' | 'symptom' | 'water' | 'profile' | 'workout';
export type OutboxAction = 'upsert' | 'delete';

export interface OutboxItem {
  id: string;
  mutationId: string;
  entityId: string;
  entityType: OutboxEntityType;
  action: OutboxAction;
  payload?: any;
  clientTimestamp: string;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed';
}

const getOutboxKey = (userId?: string): string => {
  const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
  return `steady_${uid}_sync_outbox`;
};

export const syncOutbox = {
  /**
   * Universal Tombstone Helpers to prevent deleted items from resurrecting on pull.
   */
  addTombstone: (entityType: OutboxEntityType, entityId: string, userId?: string) => {
    const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
    const key = `steady_${uid}_tombstones`;
    const raw = localStorage.getItem(key);
    let list: Array<{ entityType: OutboxEntityType; entityId: string; deletedAt: string }> = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch { list = []; }
    }
    if (!list.some(t => t.entityType === entityType && t.entityId === entityId)) {
      list.push({ entityType, entityId, deletedAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
    }
  },

  isTombstoned: (entityType: OutboxEntityType, entityId: string, userId?: string): boolean => {
    const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
    const key = `steady_${uid}_tombstones`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      const list: Array<{ entityType: OutboxEntityType; entityId: string }> = JSON.parse(raw);
      return list.some(t => t.entityType === entityType && t.entityId === entityId);
    } catch {
      return false;
    }
  },

  getTombstones: (userId?: string): Array<{ entityType: OutboxEntityType; entityId: string; deletedAt: string }> => {
    const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
    const key = `steady_${uid}_tombstones`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  /**
   * Retrieves all outbox items stored in localStorage.
   */
  getAll: (userId?: string): OutboxItem[] => {
    const key = getOutboxKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const items = JSON.parse(raw);
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  },

  /**
   * Returns count of mutations waiting to sync.
   */
  getPendingCount: (userId?: string): number => {
    const all = syncOutbox.getAll(userId);
    return all.filter(i => i.status === 'pending' || i.status === 'failed').length;
  },

  /**
   * Enqueues a change (upsert or delete).
   * Smartly collapses rapid modifications to the same entity to prevent churn.
   * Generates idempotent mutationId for exactly-once cloud processing.
   */
  enqueue: (
    entityType: OutboxEntityType,
    action: OutboxAction,
    entityId: string,
    payload?: any,
    userId?: string
  ): OutboxItem => {
    const key = getOutboxKey(userId);
    const all = syncOutbox.getAll(userId);
    const nowIso = new Date().toISOString();
    const mutationId = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (action === 'delete') {
      syncOutbox.addTombstone(entityType, entityId, userId);
    }

    const existingIndex = all.findIndex(
      i => i.entityType === entityType && i.entityId === entityId
    );

    let item: OutboxItem;

    if (existingIndex !== -1) {
      const existing = all[existingIndex];
      // Collapse mutations
      item = {
        ...existing,
        mutationId,
        action,
        payload: action === 'delete' ? undefined : payload,
        clientTimestamp: nowIso,
        status: 'pending',
        retryCount: 0,
        lastError: undefined,
      };
      all[existingIndex] = item;
    } else {
      const id = `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      item = {
        id,
        mutationId,
        entityId,
        entityType,
        action,
        payload: action === 'delete' ? undefined : payload,
        clientTimestamp: nowIso,
        retryCount: 0,
        status: 'pending',
      };
      all.push(item);
    }

    localStorage.setItem(key, JSON.stringify(all));
    return item;
  },

  /**
   * Retrieves next batch of pending mutations to process.
   */
  peek: (limit = 10, userId?: string): OutboxItem[] => {
    const all = syncOutbox.getAll(userId);
    return all
      .filter(i => i.status === 'pending' || (i.status === 'failed' && i.retryCount < 5))
      .slice(0, limit);
  },

  /**
   * Marks a set of items as actively syncing.
   */
  markSyncing: (ids: string[], userId?: string) => {
    if (ids.length === 0) return;
    const key = getOutboxKey(userId);
    const all = syncOutbox.getAll(userId);
    const idSet = new Set(ids);

    const updated = all.map(i => {
      if (idSet.has(i.id)) {
        return { ...i, status: 'syncing' as const };
      }
      return i;
    });

    localStorage.setItem(key, JSON.stringify(updated));
  },

  /**
   * Removes successfully synced items from outbox.
   */
  markCompleted: (ids: string[], userId?: string) => {
    if (ids.length === 0) return;
    const key = getOutboxKey(userId);
    const all = syncOutbox.getAll(userId);
    const idSet = new Set(ids);

    const remaining = all.filter(i => !idSet.has(i.id));
    localStorage.setItem(key, JSON.stringify(remaining));
  },

  /**
   * Records failure and schedules retry with incremented retry count.
   */
  markFailed: (id: string, error: string, userId?: string) => {
    const key = getOutboxKey(userId);
    const all = syncOutbox.getAll(userId);

    const updated = all.map(i => {
      if (i.id === id) {
        return {
          ...i,
          status: 'failed' as const,
          retryCount: i.retryCount + 1,
          lastError: error,
        };
      }
      return i;
    });

    localStorage.setItem(key, JSON.stringify(updated));
  },

  /**
   * Clears outbox completely (e.g., user logout).
   */
  clear: (userId?: string) => {
    const key = getOutboxKey(userId);
    localStorage.removeItem(key);
  },
};
