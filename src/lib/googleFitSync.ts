import { SymptomLog, DailyActivitySummary, GoogleHealthSyncConfig } from '../types';
import { storage } from './storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Capacitor } from '@capacitor/core';
import { healthService } from './health';
import { importProvider } from './health/ImportProvider';
import { toLocalDateString } from './dateUtils';

export { toLocalDateString };

export interface HealthImportEntry {
  date: string; // YYYY-MM-DD
  weightKg?: number;
  bodyFatPercent?: number;
  glucoseMgDl?: number;
  steps?: number;
  sleepHours?: number;
  heartRateBpm?: number;
  hydrationMl?: number;
  energy?: number;
  libido?: number;
  mood?: number;
  sleep?: number;
  notes?: string;
}

// Estrutura para Biometria Pontual (Prioritária para a Tabela)
interface PointInTimeBiometrics {
  weightKg?: number;
  weightTimestamp?: number;
  bodyFatPercent?: number;
  glucoseMgDl?: number;
  source?: string;
}

// Estrutura para Séries Temporais / Alta Frequência (Armazenamento Secundário)
interface TimeSeriesActivity {
  steps?: number;
  sleepHours?: number;
  heartRateSum?: number;
  heartRateCount?: number;
  hydrationMl?: number;
}

export const googleFitSync = {
  // Check if current user session has an active Google OAuth provider token or Google login
  hasProviderToken: async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const isGoogle = session?.user?.app_metadata?.provider === 'google' ||
                       session?.user?.identities?.some((id: any) => id.provider === 'google');
      return !!session?.provider_token || Boolean(isGoogle);
    } catch {
      return false;
    }
  },

  // Check if user is authenticated via Google OAuth
  isGoogleUser: async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      return session?.user?.app_metadata?.provider === 'google' ||
             session?.user?.identities?.some((id: any) => id.provider === 'google') ||
             !!session?.provider_token;
    } catch {
      return false;
    }
  },

  // Connect via Google OAuth
  connectOAuth: async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Serviço de nuvem Supabase não configurado.' };
    }
    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? 'steadysync://login-callback'
        : window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
          redirectTo,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('Erro no signInWithOAuth:', err);
      return { success: false, error: err.message || 'Erro ao abrir autorização do Google.' };
    }
  },

  // Connect directly by Google account email
  linkAccountEmail: (email: string, userId?: string): GoogleHealthSyncConfig => {
    const config: GoogleHealthSyncConfig = {
      connected: true,
      email: email.trim().toLowerCase(),
      provider: 'google_fit',
      lastSyncAt: new Date().toISOString(),
      autoSync: true,
    };
    storage.saveGoogleHealthConfig(config, userId);
    return config;
  },

  // Disconnect Google Account
  disconnect: (userId?: string): GoogleHealthSyncConfig => {
    const config: GoogleHealthSyncConfig = {
      connected: false,
      email: '',
      provider: 'google_fit',
      autoSync: false,
    };
    storage.saveGoogleHealthConfig(config, userId);
    return config;
  },

  // Toggle Auto Sync
  toggleAutoSync: (enabled: boolean, userId?: string): GoogleHealthSyncConfig => {
    const current = storage.getGoogleHealthConfig(userId);
    const updated: GoogleHealthSyncConfig = {
      ...current,
      autoSync: enabled,
    };
    storage.saveGoogleHealthConfig(updated, userId);
    return updated;
  },

  // Sincronização Inteligente delegada ao healthService
  syncData: async (
    existingSymptoms: SymptomLog[],
    _currentWeightKg: number = 82.0,
    heightCm: number = 175,
    userId?: string,
    prefetchedData?: any
  ): Promise<{
    success: boolean;
    newLogs: SymptomLog[];
    dailyActivities?: DailyActivitySummary[];
    count: number;
    message: string;
    lastSyncAt: string;
    hasOAuthToken: boolean;
  }> => {
    return healthService.sync(existingSymptoms, heightCm, userId, prefetchedData);
  },

  // Parse CSV exportado de Fitbit / Takeout
  parseFitbitCsv: (csvText: string, heightCm: number = 175): SymptomLog[] => {
    return importProvider.parseFitbitCsv(csvText, heightCm);
  },

  // Converter array manual em SymptomLogs
  createLogsFromEntries: (
    entries: HealthImportEntry[],
    existingSymptoms: SymptomLog[],
    heightCm: number = 175
  ): SymptomLog[] => {
    const existingMap = new Map<string, SymptomLog>(existingSymptoms.map(s => [s.date, s]));
    const results: SymptomLog[] = [];

    for (const entry of entries) {
      if ((!entry.weightKg || entry.weightKg <= 0) && (!entry.glucoseMgDl || entry.glucoseMgDl <= 0)) continue;

      const existing = existingMap.get(entry.date);
      if (existing) {
        results.push({
          ...existing,
          weightKg: entry.weightKg !== undefined ? entry.weightKg : existing.weightKg,
          bodyFatPercent: entry.bodyFatPercent !== undefined ? entry.bodyFatPercent : existing.bodyFatPercent,
          glucoseMgDl: entry.glucoseMgDl !== undefined ? entry.glucoseMgDl : existing.glucoseMgDl,
          steps: entry.steps !== undefined ? entry.steps : existing.steps,
          sleepHours: entry.sleepHours !== undefined ? entry.sleepHours : existing.sleepHours,
          heartRateBpm: entry.heartRateBpm !== undefined ? entry.heartRateBpm : existing.heartRateBpm,
          waterMl: entry.hydrationMl !== undefined ? entry.hydrationMl : existing.waterMl,
          notes: entry.notes || existing.notes,
          updatedAt: new Date().toISOString(),
        });
      } else {
        results.push({
          id: 'symp_entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          date: entry.date,
          weightKg: entry.weightKg,
          bodyFatPercent: entry.bodyFatPercent,
          glucoseMgDl: entry.glucoseMgDl,
          steps: entry.steps,
          sleepHours: entry.sleepHours,
          heartRateBpm: entry.heartRateBpm,
          waterMl: entry.hydrationMl,
          heightCm,
          energy: entry.energy,
          libido: entry.libido,
          mood: entry.mood,
          sleep: entry.sleep,
          notes: entry.notes || 'Importado de dados de saúde',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  },
};
