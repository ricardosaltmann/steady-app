import { supabaseSync } from './supabaseSync';
import { syncOutbox, OutboxItem } from './syncOutbox';
import { storage } from './storage';
import { auth } from './auth';
import { isSupabaseConfigured } from './supabase';
import { mergeCollections } from './syncMerge';
import { getLocalDateKey } from './dateUtils';
import { Injection, Protocol, LabResult, SymptomLog, UserProfile, DailyWaterData } from '../types';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  error?: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private isProcessing = false;
  private intervalId: any = null;
  private currentUserId: string | null = null;
  private state: SyncState = {
    status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
    error: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateState({ status: this.state.pendingCount > 0 ? 'syncing' : 'synced', error: null });
        this.processOutbox();
      });

      window.addEventListener('offline', () => {
        this.updateState({ status: 'offline' });
      });
    }
  }

  /**
   * Initializes the engine for a specific user session and starts background worker.
   */
  public init(userId: string) {
    this.currentUserId = userId;
    this.refreshPendingCount();

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Process outbox and check status every 30 seconds
    this.intervalId = setInterval(() => {
      if (this.isOnline() && !this.isProcessing) {
        this.processOutbox();
      }
    }, 30000);

    // Initial background push if pending
    if (this.isOnline()) {
      this.processOutbox();
    }
  }

  /**
   * Stops background worker on user logout.
   */
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentUserId = null;
    this.updateState({
      status: 'synced',
      pendingCount: 0,
      lastSyncedAt: null,
      error: null,
    });
  }

  public getState(): SyncState {
    return { ...this.state };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getState();
    this.listeners.forEach(l => {
      try {
        l(current);
      } catch (e) {
        console.error('[SyncEngine] Erro no listener:', e);
      }
    });
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  public refreshPendingCount(userId?: string): number {
    const uid = userId || this.currentUserId || auth.getCurrentUser()?.id;
    const count = syncOutbox.getPendingCount(uid);
    const newStatus: SyncStatus = !this.isOnline()
      ? 'offline'
      : count > 0 && this.isProcessing
      ? 'syncing'
      : count > 0 && this.state.status === 'error'
      ? 'error'
      : count > 0
      ? 'syncing'
      : 'synced';

    this.updateState({ pendingCount: count, status: newStatus });
    return count;
  }

  /**
   * Processes pending mutations from the outbox in FIFO order.
   */
  public async processOutbox(userId?: string): Promise<{ pushed: number; errors: number }> {
    const uid = userId || this.currentUserId || auth.getCurrentUser()?.id;
    if (!uid || uid.startsWith('user_demo') || !isSupabaseConfigured() || !this.isOnline()) {
      this.refreshPendingCount(uid);
      return { pushed: 0, errors: 0 };
    }

    if (this.isProcessing) {
      return { pushed: 0, errors: 0 };
    }

    this.isProcessing = true;
    this.updateState({ status: 'syncing', error: null });

    let pushed = 0;
    let errors = 0;

    try {
      const items = syncOutbox.peek(15, uid);
      if (items.length === 0) {
        this.updateState({
          status: 'synced',
          pendingCount: 0,
          lastSyncedAt: new Date().toISOString(),
        });
        return { pushed: 0, errors: 0 };
      }

      syncOutbox.markSyncing(items.map(i => i.id), uid);

      for (const item of items) {
        const success = await this.executeOutboxItem(item, uid);
        if (success) {
          syncOutbox.markCompleted([item.id], uid);
          pushed++;
        } else {
          syncOutbox.markFailed(item.id, 'Falha ao sincronizar com Supabase', uid);
          errors++;
        }
      }

      const remaining = syncOutbox.getPendingCount(uid);
      this.updateState({
        pendingCount: remaining,
        status: remaining > 0 ? (errors > 0 ? 'error' : 'syncing') : 'synced',
        lastSyncedAt: pushed > 0 ? new Date().toISOString() : this.state.lastSyncedAt,
        error: errors > 0 ? 'Algumas alterações falharam ao sincronizar' : null,
      });

      // If more items were queued in the meantime, process next batch
      if (remaining > 0 && errors === 0) {
        setTimeout(() => this.processOutbox(uid), 500);
      }
    } catch (err: any) {
      console.error('[SyncEngine] Falha geral ao processar outbox:', err);
      this.updateState({
        status: 'error',
        error: err?.message || 'Erro de conexão com servidor',
      });
    } finally {
      this.isProcessing = false;
    }

    return { pushed, errors };
  }

  /**
   * Executes a single outbox mutation against the Supabase backend.
   */
  private async executeOutboxItem(item: OutboxItem, userId: string): Promise<boolean> {
    try {
      switch (item.entityType) {
        case 'injection':
          if (item.action === 'delete') {
            return await supabaseSync.deleteInjection(item.entityId, userId);
          }
          return await supabaseSync.saveInjection(item.payload, userId);

        case 'protocol':
          if (item.action === 'delete') {
            const res = await supabaseSync.deleteProtocol(item.entityId, userId);
            return res.success;
          }
          return await supabaseSync.saveProtocol(item.payload, userId);

        case 'lab':
          if (item.action === 'delete') {
            return await supabaseSync.deleteLab(item.entityId, userId);
          }
          return await supabaseSync.saveLab(item.payload, userId);

        case 'symptom':
          if (item.action === 'delete') {
            return await supabaseSync.deleteSymptom(item.entityId, userId);
          }
          return await supabaseSync.saveSymptom(item.payload, userId);

        case 'water':
          return await supabaseSync.saveWaterData(item.payload, userId);

        case 'profile':
          return await supabaseSync.saveProfile(item.payload, userId);

        default:
          return true;
      }
    } catch (e) {
      console.error(`[SyncEngine] Erro executando outbox item ${item.id}:`, e);
      return false;
    }
  }

  /**
   * Pulls all collections from Supabase, performs 2-way conflict-resolved merge
   * with local storage (LWW), and updates local state.
   */
  public async pullAll(userId: string) {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo') || !this.isOnline()) {
      return null;
    }

    try {
      this.updateState({ status: 'syncing' });

      const today = getLocalDateKey();
      const [cloudInjections, cloudProtocols, cloudLabs, cloudSymptoms, cloudWater, cloudProfile] = await Promise.all([
        supabaseSync.getInjections(userId),
        supabaseSync.getProtocols(userId),
        supabaseSync.getLabs(userId),
        supabaseSync.getSymptoms(userId),
        supabaseSync.getWaterData(today, userId),
        supabaseSync.getProfile(userId),
      ]);

      // 1. Injections merge
      const localInjections = storage.getInjections(userId);
      const { merged: mergedInjections, itemsToPushToCloud: pushInjections } = mergeCollections(
        localInjections,
        cloudInjections || []
      );
      storage.saveInjections(mergedInjections, userId);
      pushInjections.forEach(item => syncOutbox.enqueue('injection', 'upsert', item.id, item, userId));

      // 2. Protocols merge (respects tombstones)
      const localProtocols = storage.getProtocols(userId);
      const deletedProtocolIds = storage.getDeletedProtocolIds(userId);
      const filteredCloudProtocols = (cloudProtocols || []).filter(p => !deletedProtocolIds.has(p.id));
      const { merged: mergedProtocols, itemsToPushToCloud: pushProtocols } = mergeCollections(
        localProtocols,
        filteredCloudProtocols
      );
      storage.saveProtocols(mergedProtocols, userId);
      pushProtocols.forEach(item => syncOutbox.enqueue('protocol', 'upsert', item.id, item, userId));

      // 3. Labs merge
      const localLabs = storage.getLabs(userId);
      const { merged: mergedLabs, itemsToPushToCloud: pushLabs } = mergeCollections(
        localLabs,
        cloudLabs || []
      );
      storage.saveLabs(mergedLabs, userId);
      pushLabs.forEach(item => syncOutbox.enqueue('lab', 'upsert', item.id, item, userId));

      // 4. Symptoms merge
      const localSymptoms = storage.getSymptoms(userId);
      const { merged: mergedSymptoms, itemsToPushToCloud: pushSymptoms } = mergeCollections(
        localSymptoms,
        cloudSymptoms || []
      );
      storage.saveSymptoms(mergedSymptoms, userId);
      pushSymptoms.forEach(item => syncOutbox.enqueue('symptom', 'upsert', item.id, item, userId));

      // 5. Water merge
      let mergedWater: DailyWaterData = storage.getWaterData(today, userId);
      if (cloudWater && cloudWater.entries.length > 0) {
        const existingIds = new Set(mergedWater.entries.map(e => e.id));
        const newFromCloud = cloudWater.entries.filter(e => !existingIds.has(e.id));
        if (newFromCloud.length > 0) {
          const mergedEntries = [...mergedWater.entries, ...newFromCloud];
          const totalMl = mergedEntries.reduce((acc, curr) => acc + curr.amountMl, 0);
          mergedWater = { ...mergedWater, totalMl, entries: mergedEntries };
          storage.saveWaterData(mergedWater, userId);
        }
      }

      // 6. Profile merge
      let mergedProfile: UserProfile = storage.getProfile(userId);
      if (cloudProfile) {
        mergedProfile = { ...mergedProfile, ...cloudProfile };
        storage.saveProfile(mergedProfile, userId);
      }

      // Process any local changes that were determined to be newer than cloud
      this.processOutbox(userId);

      this.updateState({
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
      });

      return {
        injections: mergedInjections,
        protocols: mergedProtocols,
        labs: mergedLabs,
        symptoms: mergedSymptoms,
        water: mergedWater,
        profile: mergedProfile,
      };
    } catch (e: any) {
      console.error('[SyncEngine] Erro ao sincronizar coleções completas:', e);
      this.updateState({
        status: 'error',
        error: e?.message || 'Falha ao sincronizar dados com a nuvem',
      });
      return null;
    }
  }

  /**
   * Triggers an immediate manual push and pull sync.
   */
  public async triggerSync(userId?: string): Promise<{ success: boolean; pushed: number; error?: string }> {
    const uid = userId || this.currentUserId || auth.getCurrentUser()?.id;
    if (!uid) {
      return { success: false, pushed: 0, error: 'Usuário não autenticado' };
    }

    if (!this.isOnline()) {
      this.updateState({ status: 'offline' });
      return { success: false, pushed: 0, error: 'Dispositivo sem conexão de internet' };
    }

    const { pushed, errors } = await this.processOutbox(uid);
    await this.pullAll(uid);

    return {
      success: errors === 0,
      pushed,
      error: errors > 0 ? 'Algumas alterações falharam ao sincronizar' : undefined,
    };
  }
}

export const syncEngine = new SyncEngine();
