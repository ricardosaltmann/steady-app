import { 
  Injection, 
  Protocol, 
  LabResult, 
  SymptomLog, 
  Compound, 
  ClinicalMetadata, 
  ClinicalDataSource 
} from '../types';
import { auth } from './auth';

export type ClinicalCollectionName = 'injections' | 'protocols' | 'labs' | 'symptoms' | 'compounds';

export interface RepositoryEntity extends ClinicalMetadata {
  id: string;
  [key: string]: any;
}

export interface QueryOptions {
  includeDeleted?: boolean;
}

export interface SaveOptions {
  source?: ClinicalDataSource;
}

/**
 * Resolves scoped storage key per user: steady_<userId>_<collection>
 */
export function getCollectionKey(collection: ClinicalCollectionName, userId?: string): string {
  const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
  return `steady_${uid}_${collection}`;
}

/**
 * LocalRepository
 * 
 * Provides unified, transactional, local-first persistence for clinical entities.
 * Enforces:
 * - Deterministic userId scoping
 * - Soft-deletes via `deletedAt`
 * - Monotonic `syncVersion` incrementing
 * - Reliable `updatedAt` stamping
 * - Provenance tracking via `dataSource`
 */
export const localRepository = {
  /**
   * Retrieves all items from a collection, excluding soft-deleted records by default.
   */
  getAll: <T extends RepositoryEntity>(
    collection: ClinicalCollectionName, 
    userId?: string, 
    options?: QueryOptions
  ): T[] => {
    const key = getCollectionKey(collection, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    try {
      const list: T[] = JSON.parse(raw);
      if (!Array.isArray(list)) return [];

      if (options?.includeDeleted) {
        return list;
      }
      return list.filter(item => !item.deletedAt);
    } catch (e) {
      console.error(`[LocalRepository] Erro ao ler coleção ${collection}:`, e);
      return [];
    }
  },

  /**
   * Retrieves a single entity by ID.
   */
  getById: <T extends RepositoryEntity>(
    collection: ClinicalCollectionName, 
    id: string, 
    userId?: string,
    options?: QueryOptions
  ): T | null => {
    const items = localRepository.getAll<T>(collection, userId, options);
    return items.find(item => item.id === id) || null;
  },

  /**
   * Saves or updates an entity with automatic versioning, timestamps, and data source tagging.
   */
  save: <T extends RepositoryEntity>(
    collection: ClinicalCollectionName, 
    item: T, 
    userId?: string, 
    options?: SaveOptions
  ): T => {
    const key = getCollectionKey(collection, userId);
    const allItems = localRepository.getAll<T>(collection, userId, { includeDeleted: true });
    
    const existingIndex = allItems.findIndex(existing => existing.id === item.id);
    const existing = existingIndex !== -1 ? allItems[existingIndex] : null;

    const currentVersion = Number(existing?.syncVersion || item.syncVersion || 0);
    const nextVersion = currentVersion + 1;
    const nowIso = new Date().toISOString();

    const preparedItem: T = {
      ...item,
      updatedAt: nowIso,
      syncVersion: nextVersion,
      deletedAt: null, // Any explicit save clears tombstone
      dataSource: options?.source || item.dataSource || existing?.dataSource || 'manual',
    };

    let updatedList: T[];
    if (existingIndex !== -1) {
      updatedList = [...allItems];
      updatedList[existingIndex] = preparedItem;
    } else {
      updatedList = [preparedItem, ...allItems];
    }

    localStorage.setItem(key, JSON.stringify(updatedList));
    return preparedItem;
  },

  /**
   * Batch saves entities.
   */
  saveMany: <T extends RepositoryEntity>(
    collection: ClinicalCollectionName, 
    items: T[], 
    userId?: string, 
    options?: SaveOptions
  ): T[] => {
    if (!items || items.length === 0) return [];
    const key = getCollectionKey(collection, userId);
    const allItems = localRepository.getAll<T>(collection, userId, { includeDeleted: true });
    
    const nowIso = new Date().toISOString();
    const map = new Map<string, T>(allItems.map(item => [item.id, item]));

    const preparedItems: T[] = items.map(item => {
      const existing = map.get(item.id);
      const currentVersion = Number(existing?.syncVersion || item.syncVersion || 0);
      return {
        ...item,
        updatedAt: nowIso,
        syncVersion: currentVersion + 1,
        deletedAt: null,
        dataSource: options?.source || item.dataSource || existing?.dataSource || 'manual',
      };
    });

    preparedItems.forEach(prepared => {
      map.set(prepared.id, prepared);
    });

    const resultList = Array.from(map.values());
    localStorage.setItem(key, JSON.stringify(resultList));
    return preparedItems;
  },

  /**
   * Soft-deletes an entity by stamping `deletedAt` and incrementing `syncVersion`.
   * Preserves historical record for outbox synchronization.
   */
  softDelete: (
    collection: ClinicalCollectionName, 
    id: string, 
    userId?: string
  ): boolean => {
    const key = getCollectionKey(collection, userId);
    const allItems = localRepository.getAll<RepositoryEntity>(collection, userId, { includeDeleted: true });
    
    const index = allItems.findIndex(item => item.id === id);
    if (index === -1) return false;

    const existing = allItems[index];
    const nowIso = new Date().toISOString();
    const currentVersion = Number(existing.syncVersion || 0);

    const updatedItem: RepositoryEntity = {
      ...existing,
      deletedAt: nowIso,
      updatedAt: nowIso,
      syncVersion: currentVersion + 1,
    };

    allItems[index] = updatedItem;
    localStorage.setItem(key, JSON.stringify(allItems));

    // Special backward compatibility for protocol deletion tracking in storage
    if (collection === 'protocols') {
      const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
      const delKey = `steady_${uid}_deleted_protocols`;
      try {
        const raw = localStorage.getItem(delKey);
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        set.add(id);
        localStorage.setItem(delKey, JSON.stringify(Array.from(set)));
      } catch {
        // Fallback
      }
    }

    return true;
  },

  /**
   * Hard-deletes an entity from local storage completely.
   */
  hardDelete: (
    collection: ClinicalCollectionName, 
    id: string, 
    userId?: string
  ): boolean => {
    const key = getCollectionKey(collection, userId);
    const allItems = localRepository.getAll<RepositoryEntity>(collection, userId, { includeDeleted: true });
    const filtered = allItems.filter(item => item.id !== id);

    if (filtered.length === allItems.length) return false;

    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  },

  /**
   * Returns all soft-deleted records in a collection (tombstones).
   */
  getDeleted: <T extends RepositoryEntity>(
    collection: ClinicalCollectionName, 
    userId?: string
  ): T[] => {
    const all = localRepository.getAll<T>(collection, userId, { includeDeleted: true });
    return all.filter(item => Boolean(item.deletedAt));
  },

  // Typed entity convenience methods
  injections: {
    getAll: (userId?: string, options?: QueryOptions): Injection[] => 
      localRepository.getAll<Injection>('injections', userId, options),
    save: (item: Injection, userId?: string, options?: SaveOptions): Injection => 
      localRepository.save<Injection>('injections', item, userId, options),
    saveMany: (items: Injection[], userId?: string, options?: SaveOptions): Injection[] => 
      localRepository.saveMany<Injection>('injections', items, userId, options),
    delete: (id: string, userId?: string): boolean => 
      localRepository.softDelete('injections', id, userId),
  },

  protocols: {
    getAll: (userId?: string, options?: QueryOptions): Protocol[] => 
      localRepository.getAll<Protocol>('protocols', userId, options),
    save: (item: Protocol, userId?: string, options?: SaveOptions): Protocol => 
      localRepository.save<Protocol>('protocols', item, userId, options),
    saveMany: (items: Protocol[], userId?: string, options?: SaveOptions): Protocol[] => 
      localRepository.saveMany<Protocol>('protocols', items, userId, options),
    delete: (id: string, userId?: string): boolean => 
      localRepository.softDelete('protocols', id, userId),
  },

  labs: {
    getAll: (userId?: string, options?: QueryOptions): LabResult[] => 
      localRepository.getAll<LabResult>('labs', userId, options),
    save: (item: LabResult, userId?: string, options?: SaveOptions): LabResult => 
      localRepository.save<LabResult>('labs', item, userId, options),
    saveMany: (items: LabResult[], userId?: string, options?: SaveOptions): LabResult[] => 
      localRepository.saveMany<LabResult>('labs', items, userId, options),
    delete: (id: string, userId?: string): boolean => 
      localRepository.softDelete('labs', id, userId),
  },

  symptoms: {
    getAll: (userId?: string, options?: QueryOptions): SymptomLog[] => 
      localRepository.getAll<SymptomLog>('symptoms', userId, options),
    save: (item: SymptomLog, userId?: string, options?: SaveOptions): SymptomLog => 
      localRepository.save<SymptomLog>('symptoms', item, userId, options),
    saveMany: (items: SymptomLog[], userId?: string, options?: SaveOptions): SymptomLog[] => 
      localRepository.saveMany<SymptomLog>('symptoms', items, userId, options),
    delete: (id: string, userId?: string): boolean => 
      localRepository.softDelete('symptoms', id, userId),
  },

  compounds: {
    getAll: (userId?: string, options?: QueryOptions): Compound[] => 
      localRepository.getAll<Compound>('compounds', userId, options),
    save: (item: Compound, userId?: string, options?: SaveOptions): Compound => 
      localRepository.save<Compound>('compounds', item, userId, options),
    saveMany: (items: Compound[], userId?: string, options?: SaveOptions): Compound[] => 
      localRepository.saveMany<Compound>('compounds', items, userId, options),
  },
};
