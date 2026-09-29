import { Capacitor, registerPlugin } from '@capacitor/core';
import { HealthDataProvider, ProviderMetricsPayload } from './types';

interface HealthConnectNativePlugin {
  checkAvailability(): Promise<{ available: boolean; status?: number }>;
  requestPermissions(options?: { permissions?: string[] }): Promise<{ granted: boolean; [key: string]: any }>;
  checkPermissions(): Promise<any>;
  openHealthConnectSettings(): Promise<void>;
  readRecords(options: { type: string; timeRangeFilter: { type?: string; startTime: string; endTime: string } }): Promise<any>;
  readAllHealthMetrics(options: { timeRangeFilter: { type?: string; startTime: string; endTime: string } }): Promise<ProviderMetricsPayload>;
  writeExerciseSession(options: { title: string; startTime: string; endTime: string; notes?: string }): Promise<{ success: boolean; recordIds?: string[] }>;
  writeNutrition?(options: { name: string; proteinGrams: number; time?: string }): Promise<{ success: boolean; recordIds?: string[] }>;
}

export const NativeHealthConnect = registerPlugin<HealthConnectNativePlugin>('HealthConnect');

export const ALL_HEALTH_CONNECT_PERMISSIONS = [
  'weight',
  'bodyFat',
  'height',
  'glucose',
  'steps',
  'sleep',
  'heartRate',
  'hydration',
  'history',
  'exerciseRead',
  'exerciseWrite',
  'nutritionRead',
  'nutritionWrite',
];

export class HealthConnectProvider implements HealthDataProvider {
  id = 'health_connect';
  name = 'Health Connect (Android)';

  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const res = await NativeHealthConnect.checkAvailability();
      return Boolean(res?.available);
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<{ granted: boolean; permissions?: string[] }> {
    if (!Capacitor.isNativePlatform()) {
      return { granted: false };
    }
    try {
      console.log('[HealthConnectProvider] Solicitando permissões completas:', ALL_HEALTH_CONNECT_PERMISSIONS);
      const res = await NativeHealthConnect.requestPermissions({
        permissions: ALL_HEALTH_CONNECT_PERMISSIONS,
      });
      return {
        granted: true,
        permissions: ALL_HEALTH_CONNECT_PERMISSIONS,
      };
    } catch (err) {
      console.error('[HealthConnectProvider] Erro ao solicitar permissões:', err);
      return { granted: false };
    }
  }

  async openSettings(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeHealthConnect.openHealthConnectSettings();
      } catch (e) {
        console.error('[HealthConnectProvider] Erro ao abrir configurações:', e);
      }
    }
  }

  async fetchMetrics(timeRange: { startTime: string; endTime: string }): Promise<ProviderMetricsPayload> {
    if (!Capacitor.isNativePlatform()) {
      return {};
    }

    try {
      console.log(`[HealthConnectProvider] Consultando métricas de ${timeRange.startTime} até ${timeRange.endTime}`);
      if (typeof NativeHealthConnect.readAllHealthMetrics === 'function') {
        const data = await NativeHealthConnect.readAllHealthMetrics({
          timeRangeFilter: { type: 'between', startTime: timeRange.startTime, endTime: timeRange.endTime },
        });
        return data || {};
      } else {
        const data = await NativeHealthConnect.readRecords({
          type: 'All',
          timeRangeFilter: { type: 'between', startTime: timeRange.startTime, endTime: timeRange.endTime },
        });
        return data || {};
      }
    } catch (err) {
      console.error('[HealthConnectProvider] Erro na leitura de métricas:', err);
      return {};
    }
  }

  async writeExerciseSession(options: {
    title: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<{ success: boolean; recordIds?: string[] }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false };
    }
    try {
      if (typeof NativeHealthConnect.writeExerciseSession === 'function') {
        const result = await NativeHealthConnect.writeExerciseSession(options);
        return result;
      }
      return { success: false };
    } catch (err) {
      console.error('[HealthConnectProvider] Erro ao gravar treino:', err);
      return { success: false };
    }
  }

  async writeNutritionRecord(options: {
    name: string;
    proteinGrams: number;
    time?: string;
  }): Promise<{ success: boolean; recordIds?: string[] }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false };
    }
    try {
      if (typeof NativeHealthConnect.writeNutrition === 'function') {
        const result = await NativeHealthConnect.writeNutrition(options);
        return result;
      }
      return { success: false };
    } catch (err) {
      console.error('[HealthConnectProvider] Erro ao gravar nutrição:', err);
      return { success: false };
    }
  }
}

export const healthConnectProvider = new HealthConnectProvider();
