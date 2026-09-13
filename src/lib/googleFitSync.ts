import { SymptomLog, GoogleHealthSyncConfig } from '../types';
import { storage } from './storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Capacitor } from '@capacitor/core';

export interface HealthImportEntry {
  date: string; // YYYY-MM-DD
  weightKg: number;
  bodyFatPercent?: number;
  energy?: number;
  libido?: number;
  mood?: number;
  sleep?: number;
  notes?: string;
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
          scopes: 'https://www.googleapis.com/auth/fitness.body.read email profile',
          redirectTo,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
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

  // Perform Cloud Sync with Google Fit REST API
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
    hasOAuthToken: boolean;
  }> => {
    const config = storage.getGoogleHealthConfig(userId);
    let isGoogleSession = false;

    if (isSupabaseConfigured()) {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        isGoogleSession = session?.user?.app_metadata?.provider === 'google' ||
                          session?.user?.identities?.some((id: any) => id.provider === 'google') ||
                          !!session?.provider_token;
      } catch {
        // ignore
      }
    }

    if (!config.connected && !isGoogleSession) {
      return {
        success: false,
        newLogs: [],
        count: 0,
        message: 'Nenhuma conta Google conectada. Conecte com sua Conta Google para sincronizar.',
        lastSyncAt: config.lastSyncAt || '',
        hasOAuthToken: false,
      };
    }

    // Existing dates to avoid duplication
    const existingDates = new Set(existingSymptoms.map(s => s.date));
    const newLogs: SymptomLog[] = [];
    let hasToken = false;

    // Check Google OAuth token in Supabase session
    if (isSupabaseConfigured()) {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const providerToken = session?.provider_token;

        if (providerToken) {
          hasToken = true;
          const startTimeMillis = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 dias
          const endTimeMillis = Date.now();

          // Fetch Weight and Body Fat
          const response = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${providerToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              aggregateBy: [
                { dataTypeName: 'com.google.weight' },
                { dataTypeName: 'com.google.body.fat.percentage' },
              ],
              bucketByTime: { durationMillis: 86400000 },
              startTimeMillis,
              endTimeMillis,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.bucket) {
              data.bucket.forEach((b: any) => {
                const weightPoint = b.dataset?.[0]?.point?.[0];
                const fatPoint = b.dataset?.[1]?.point?.[0];

                if (weightPoint?.value?.[0]?.fpVal) {
                  const w = parseFloat(weightPoint.value[0].fpVal.toFixed(1));
                  const fat = fatPoint?.value?.[0]?.fpVal ? parseFloat(fatPoint.value[0].fpVal.toFixed(1)) : undefined;
                  const dateStr = new Date(parseInt(b.startTimeMillis)).toISOString().slice(0, 10);

                  if (!existingDates.has(dateStr)) {
                    newLogs.push({
                      id: 'symp_gfit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                      date: dateStr,
                      weightKg: w,
                      bodyFatPercent: fat,
                      heightCm,
                      energy: 4,
                      libido: 4,
                      mood: 4,
                      sleep: 4,
                      acne: 1,
                      waterRetention: 1,
                      notes: 'Sincronizado via Google Fit API',
                      updatedAt: new Date().toISOString(),
                    });
                    existingDates.add(dateStr);
                  }
                }
              });
            }
          }
        } else if (isGoogleSession) {
          hasToken = true;
        }
      } catch (err) {
        console.warn('Google Fit API query error:', err);
      }
    }

    const updatedSyncTime = new Date().toISOString();
    config.lastSyncAt = updatedSyncTime;
    if (isGoogleSession && !config.connected) {
      config.connected = true;
    }
    storage.saveGoogleHealthConfig(config, userId);

    if (!hasToken && !isGoogleSession) {
      return {
        success: false,
        newLogs: [],
        count: 0,
        message: 'Aviso: Token OAuth do Google não encontrado na sessão atual. Como você entrou com e-mail/senha, o Google não libera o acesso à API sem autorização OAuth. Conecte pelo botão Google OAuth ou utilize a Importação do Fitbit abaixo.',
        lastSyncAt: updatedSyncTime,
        hasOAuthToken: false,
      };
    }

    return {
      success: true,
      newLogs,
      count: newLogs.length,
      message: newLogs.length > 0
        ? `Sincronização concluída! ${newLogs.length} medições importadas do Google Fit.`
        : (isGoogleSession
            ? 'Conta Google conectada. Utilize a importação direta do Health Connect ou arquivos Fitbit para sincronizar novas pesagens.'
            : 'Nenhuma nova pesagem encontrada na API Google Fit para os últimos 60 dias.'),
      lastSyncAt: updatedSyncTime,
      hasOAuthToken: true,
    };
  },

  // Parse CSV exported from Fitbit or Google Fit / Takeout
  parseFitbitCsv: (csvText: string, heightCm: number = 175): SymptomLog[] => {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/['"]/g, ''));
    
    // Detect column indexes
    let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('data'));
    let weightIdx = headers.findIndex(h => h.includes('weight') || h.includes('peso') || h.includes('massa'));
    let fatIdx = headers.findIndex(h => h.includes('fat') || h.includes('gordura') || h.includes('bf'));

    if (dateIdx === -1) dateIdx = 0;
    if (weightIdx === -1) weightIdx = 1;

    const parsedLogs: SymptomLog[] = [];
    const seenDates = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]/).map(p => p.trim().replace(/['"]/g, ''));
      if (parts.length <= Math.max(dateIdx, weightIdx)) continue;

      const rawDate = parts[dateIdx];
      const rawWeight = parts[weightIdx];
      const rawFat = fatIdx !== -1 && parts[fatIdx] ? parts[fatIdx] : undefined;

      // Parse date (supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
      let formattedDate = '';
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        formattedDate = rawDate.slice(0, 10);
      } else if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(rawDate)) {
        const dparts = rawDate.split(/[\/-]/);
        const day = dparts[0].padStart(2, '0');
        const month = dparts[1].padStart(2, '0');
        const year = dparts[2].slice(0, 4);
        formattedDate = `${year}-${month}-${day}`;
      } else {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().slice(0, 10);
        }
      }

      if (!formattedDate || seenDates.has(formattedDate)) continue;

      // Parse weight (handles "83.5", "83,5", "83.5 kg")
      const cleanWeight = rawWeight.replace(/[^\d.,]/g, '').replace(',', '.');
      const weightVal = parseFloat(cleanWeight);

      if (isNaN(weightVal) || weightVal < 30 || weightVal > 300) continue;

      let fatVal: number | undefined;
      if (rawFat) {
        const cleanFat = rawFat.replace(/[^\d.,]/g, '').replace(',', '.');
        const parsedFat = parseFloat(cleanFat);
        if (!isNaN(parsedFat) && parsedFat > 3 && parsedFat < 60) {
          fatVal = parsedFat;
        }
      }

      seenDates.add(formattedDate);
      parsedLogs.push({
        id: 'symp_fitbit_csv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        date: formattedDate,
        weightKg: weightVal,
        bodyFatPercent: fatVal,
        heightCm,
        energy: 4,
        libido: 4,
        mood: 4,
        sleep: 4,
        acne: 1,
        waterRetention: 1,
        notes: 'Importado de arquivo Fitbit/Google Health',
        updatedAt: new Date().toISOString(),
      });
    }

    return parsedLogs;
  },

  // Helper to convert an array of manual or preset health entries into SymptomLogs
  createLogsFromEntries: (
    entries: HealthImportEntry[],
    existingSymptoms: SymptomLog[],
    heightCm: number = 175
  ): SymptomLog[] => {
    const existingDates = new Set(existingSymptoms.map(s => s.date));
    const created: SymptomLog[] = [];

    for (const entry of entries) {
      if (existingDates.has(entry.date)) {
        // Find and update existing record with weight and body fat
        const existing = existingSymptoms.find(s => s.date === entry.date);
        if (existing) {
          created.push({
            ...existing,
            weightKg: entry.weightKg,
            bodyFatPercent: entry.bodyFatPercent !== undefined ? entry.bodyFatPercent : existing.bodyFatPercent,
            notes: entry.notes || existing.notes,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        created.push({
          id: 'symp_fitbit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          date: entry.date,
          weightKg: entry.weightKg,
          bodyFatPercent: entry.bodyFatPercent,
          heightCm,
          energy: entry.energy || 4,
          libido: entry.libido || 4,
          mood: entry.mood || 4,
          sleep: entry.sleep || 4,
          acne: 1,
          waterRetention: 1,
          notes: entry.notes || 'Importado do Fitbit / Google Health',
          updatedAt: new Date().toISOString(),
        });
        existingDates.add(entry.date);
      }
    }

    return created;
  },
};
