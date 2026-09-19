import { SymptomLog, DailyActivitySummary, GoogleHealthSyncConfig } from '../../types';
import { storage } from '../storage';
import { syncOutbox } from '../syncOutbox';
import { syncEngine } from '../syncEngine';
import { healthConnectProvider } from './HealthConnectProvider';
import { importProvider } from './ImportProvider';
import { googleFitLegacyProvider } from './GoogleFitLegacyProvider';
import { healthAggregator } from './healthAggregator';
import { HealthSyncResult, ProviderMetricsPayload } from './types';
import { Capacitor } from '@capacitor/core';

export * from './types';
export * from './HealthConnectProvider';
export * from './ImportProvider';
export * from './GoogleFitLegacyProvider';
export * from './healthAggregator';

export const healthService = {
  /**
   * Sincroniza dados de saúde utilizando o provedor ativo (Health Connect preferencialmente no Android).
   */
  async sync(
    existingSymptoms: SymptomLog[],
    heightCm: number = 175,
    userId?: string,
    prefetchedPayload?: ProviderMetricsPayload
  ): Promise<HealthSyncResult> {
    const config = storage.getGoogleHealthConfig(userId);
    const isNative = Capacitor.isNativePlatform();

    // 1. Determinar intervalo de busca (padrão: 60 dias)
    const startTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();

    let rawPayload: ProviderMetricsPayload = prefetchedPayload || {};
    let activeSource: 'health_connect' | 'google_fit' = 'health_connect';

    // 2. Se não recebemos dados pré-obtidos, consultar o provedor disponível
    if (!prefetchedPayload || Object.keys(prefetchedPayload).length === 0) {
      if (isNative && (await healthConnectProvider.isAvailable())) {
        activeSource = 'health_connect';
        rawPayload = await healthConnectProvider.fetchMetrics({ startTime, endTime });
      } else if (await googleFitLegacyProvider.isAvailable()) {
        activeSource = 'google_fit';
        rawPayload = await googleFitLegacyProvider.fetchMetrics({ startTime, endTime });
      }
    }

    // 3. Agregar métricas sem criar dados subjetivos sintéticos e desduplicando origens
    const { symptomLogs, dailyActivities, createdCount, updatedCount } = healthAggregator.aggregateMetrics(
      rawPayload,
      existingSymptoms,
      heightCm,
      activeSource
    );

    const updatedSyncTime = new Date().toISOString();
    config.lastSyncAt = updatedSyncTime;
    if (activeSource === 'health_connect') {
      config.connected = true;
    }
    storage.saveGoogleHealthConfig(config, userId);

    // 4. Persistir Séries Temporais na Loja Secundária
    if (dailyActivities.length > 0) {
      storage.saveDailyActivities(dailyActivities, userId);
    }

    // 5. Persistir Biometria Consolidada e Enfileirar no Outbox para Sincronização
    if (createdCount > 0 || updatedCount > 0) {
      storage.saveSymptoms(symptomLogs, userId);
      // Enfileirar no outbox
      if (userId) {
        for (const log of symptomLogs) {
          // Apenas enfileira registros novos ou atualizados recentemente
          if (log.updatedAt === updatedSyncTime || log.id.startsWith('symp_hc_')) {
            syncOutbox.enqueue('symptom', 'upsert', log.id, log, userId);
          }
        }
        syncEngine.processOutbox(userId).catch(console.error);
      }
    }

    const totalBiometrics = symptomLogs.length;
    const message = totalBiometrics > 0
      ? `Sincronização concluída! ${totalBiometrics} medições biométricas consolidadas (${createdCount} novas, ${updatedCount} atualizadas).`
      : 'Nenhuma pesagem encontrada nos últimos 60 dias.';

    return {
      success: true,
      newLogs: symptomLogs,
      dailyActivities,
      count: totalBiometrics,
      message,
      lastSyncAt: updatedSyncTime,
      hasOAuthToken: isNative || (await googleFitLegacyProvider.isAvailable()),
    };
  },
};
