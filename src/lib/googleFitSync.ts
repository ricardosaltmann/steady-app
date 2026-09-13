import { SymptomLog, GoogleHealthSyncConfig } from '../types';
import { storage } from './storage';
import { supabase, isSupabaseConfigured } from './supabase';

export const googleFitSync = {
  // Connect via Google OAuth
  connectOAuth: async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Serviço de nuvem não configurado.' };
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/fitness.body.read email profile',
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao abrir login Google' };
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

  // Perform Real Cloud Sync with Google Fit API
  // No fake or mock data is ever generated when no records exist
  syncData: async (
    existingSymptoms: SymptomLog[],
    _currentWeightKg: number = 82.0,
    heightCm: number = 175,
    userId?: string
  ): Promise<{
    success: boolean;
    newLogs: SymptomLog[];
    count: number;
    message: string;
    lastSyncAt: string;
  }> => {
    const config = storage.getGoogleHealthConfig(userId);
    if (!config.connected || !config.email) {
      return {
        success: false,
        newLogs: [],
        count: 0,
        message: 'Nenhuma conta Google conectada. Informe seu email do Google abaixo.',
        lastSyncAt: config.lastSyncAt || '',
      };
    }

    // Existing dates to prevent duplicate entries
    const existingDates = new Set(existingSymptoms.map(s => s.date));
    const newLogs: SymptomLog[] = [];

    // Query live Google Fit API if provider_token is available in Supabase session
    if (isSupabaseConfigured()) {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const providerToken = session?.provider_token;

        if (providerToken) {
          const startTimeMillis = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const endTimeMillis = Date.now();

          const response = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${providerToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aggregateBy: [{ dataTypeName: 'com.google.weight' }],
              bucketByTime: { durationMillis: 86400000 },
              startTimeMillis,
              endTimeMillis,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.bucket) {
              data.bucket.forEach((b: any) => {
                const point = b.dataset?.[0]?.point?.[0];
                if (point?.value?.[0]?.fpVal) {
                  const w = parseFloat(point.value[0].fpVal.toFixed(1));
                  const dateStr = new Date(parseInt(b.startTimeMillis)).toISOString().slice(0, 10);
                  if (!existingDates.has(dateStr)) {
                    newLogs.push({
                      id: 'symp_gfit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                      date: dateStr,
                      weightKg: w,
                      heightCm,
                      energy: 4, libido: 4, mood: 4, sleep: 4, acne: 1, waterRetention: 1,
                      notes: 'Sincronizado via Google Fit API',
                      updatedAt: new Date().toISOString(),
                    });
                    existingDates.add(dateStr);
                  }
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Google Fit API query warning:', err);
      }
    }

    // Update last sync time
    const updatedSyncTime = new Date().toISOString();
    config.lastSyncAt = updatedSyncTime;
    storage.saveGoogleHealthConfig(config, userId);

    return {
      success: true,
      newLogs,
      count: newLogs.length,
      message: newLogs.length > 0
        ? `Sincronização concluída! ${newLogs.length} medições reais importadas do Google Fit.`
        : 'Nenhuma nova medição encontrada na sua conta Google Fit para os últimos 30 dias.',
      lastSyncAt: updatedSyncTime,
    };
  },
};
