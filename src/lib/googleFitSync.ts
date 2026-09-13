import { SymptomLog, GoogleHealthSyncConfig } from '../types';
import { storage } from './storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Capacitor } from '@capacitor/core';

export interface HealthImportEntry {
  date: string; // YYYY-MM-DD
  weightKg?: number;
  bodyFatPercent?: number;
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

// Helper to convert any timestamp / ISO string / Date into local YYYY-MM-DD
export function toLocalDateString(val: any): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      if (typeof val === 'string') return val.slice(0, 10);
      return '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return typeof val === 'string' ? val.slice(0, 10) : '';
  }
}

interface DailyMetricsCollector {
  weightKg?: number;
  bodyFatPercent?: number;
  steps?: number;
  sleepHours?: number;
  heartRateSum?: number;
  heartRateCount?: number;
  hydrationMl?: number;
  source?: string;
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

  // Perform Cloud Sync with Google Fit REST API or Android Health Connect
  syncData: async (
    existingSymptoms: SymptomLog[],
    _currentWeightKg: number = 82.0,
    heightCm: number = 175,
    userId?: string,
    prefetchedData?: any
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
      } catch (err) {
        console.error('Erro ao verificar sessão Supabase:', err);
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

    // Daily collector map: key is YYYY-MM-DD
    const dailyMap = new Map<string, DailyMetricsCollector>();
    const getOrCreateDaily = (dateStr: string): DailyMetricsCollector => {
      let item = dailyMap.get(dateStr);
      if (!item) {
        item = {};
        dailyMap.set(dateStr, item);
      }
      return item;
    };

    let hasToken = false;

    // 1. Processar dados pré-obtidos (objeto completo ou lista de registros)
    if (prefetchedData) {
      hasToken = true;
      console.log('[Health Connect] Processando dados pré-obtidos:', prefetchedData);

      // Se prefetchedData for um objeto com métricas categorizadas
      const weights = prefetchedData.weights || prefetchedData.records || (Array.isArray(prefetchedData) ? prefetchedData : []);
      const bodyFat = prefetchedData.bodyFat || [];
      const steps = prefetchedData.steps || [];
      const sleep = prefetchedData.sleep || [];
      const heartRates = prefetchedData.heartRates || [];
      const hydration = prefetchedData.hydration || [];

      // Processar Pesos
      if (Array.isArray(weights)) {
        weights.forEach((rec: any) => {
          const w = rec?.weightKg ?? rec?.weight?.inKilograms ?? rec?.value;
          const dateStr = toLocalDateString(rec?.time || rec?.startTime || rec?.date);
          if (w && dateStr) {
            const daily = getOrCreateDaily(dateStr);
            daily.weightKg = parseFloat(Number(w).toFixed(1));
            daily.source = 'Health Connect';
          }
        });
      }

      // Processar Gordura Corporal
      if (Array.isArray(bodyFat)) {
        bodyFat.forEach((rec: any) => {
          const fat = rec?.percentage ?? rec?.value;
          const dateStr = toLocalDateString(rec?.time || rec?.startTime || rec?.date);
          if (fat && dateStr) {
            const daily = getOrCreateDaily(dateStr);
            daily.bodyFatPercent = parseFloat(Number(fat).toFixed(1));
            daily.source = 'Health Connect';
          }
        });
      }

      // Processar Passos (acumular soma do dia)
      if (Array.isArray(steps)) {
        steps.forEach((rec: any) => {
          const count = Number(rec?.count || 0);
          const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
          if (count > 0 && dateStr) {
            const daily = getOrCreateDaily(dateStr);
            daily.steps = (daily.steps || 0) + count;
            daily.source = 'Health Connect';
          }
        });
      }

      // Processar Sono (acumular horas de sessões)
      if (Array.isArray(sleep)) {
        sleep.forEach((rec: any) => {
          const hours = Number(rec?.hours || 0);
          const dateStr = toLocalDateString(rec?.startTime || rec?.endTime || rec?.time || rec?.date);
          if (hours > 0 && dateStr) {
            const daily = getOrCreateDaily(dateStr);
            daily.sleepHours = parseFloat(((daily.sleepHours || 0) + hours).toFixed(1));
            daily.source = 'Health Connect';
          }
        });
      }

      // Processar Frequência Cardíaca (média do dia)
      if (Array.isArray(heartRates)) {
        heartRates.forEach((rec: any) => {
          const bpm = Number(rec?.bpm || 0);
          const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
          if (bpm > 0 && dateStr) {
            const daily = getOrCreateDaily(dateStr);
            daily.heartRateSum = (daily.heartRateSum || 0) + bpm;
            daily.heartRateCount = (daily.heartRateCount || 0) + 1;
            daily.source = 'Health Connect';
          }
        });
      }

      // Processar Hidratação (acumular mL)
      if (Array.isArray(hydration)) {
        hydration.forEach((rec: any) => {
          const ml = Number(rec?.volumeMl || (rec?.volumeLiters ? rec.volumeLiters * 1000 : 0));
          const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
          if (ml > 0 && dateStr) {
            const daily = getOrCreateDaily(dateStr);
            daily.hydrationMl = (daily.hydrationMl || 0) + ml;
            daily.source = 'Health Connect';
          }
        });
      }
    }

    // 2. Se for Capacitor nativo e não veio prefetchedData, consultar diretamente o plugin nativo
    if (Capacitor.isNativePlatform() && (!prefetchedData || (Array.isArray(prefetchedData) && prefetchedData.length === 0))) {
      try {
        console.log('[Health Connect] Verificando runtime nativo do Health Connect...');
        const plugins = (window as any).Capacitor?.Plugins;
        const HealthConnect = plugins?.HealthConnect || plugins?.CapacitorHealthConnect;

        if (HealthConnect) {
          const startTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
          const endTime = new Date().toISOString();

          let resData: any = null;
          if (typeof HealthConnect.readAllHealthMetrics === 'function') {
            resData = await HealthConnect.readAllHealthMetrics({
              timeRangeFilter: { type: 'between', startTime, endTime }
            });
          } else if (typeof HealthConnect.readRecords === 'function') {
            resData = await HealthConnect.readRecords({
              type: 'All',
              timeRangeFilter: { type: 'between', startTime, endTime }
            });
          }

          if (resData) {
            hasToken = true;
            // Popular métricas a partir da resposta nativa
            const weights = resData.weights || resData.records || [];
            if (Array.isArray(weights)) {
              weights.forEach((rec: any) => {
                const w = rec?.weightKg ?? rec?.weight?.inKilograms ?? rec?.value;
                const dateStr = toLocalDateString(rec?.time || rec?.startTime || rec?.date);
                if (w && dateStr) {
                  const daily = getOrCreateDaily(dateStr);
                  daily.weightKg = parseFloat(Number(w).toFixed(1));
                  daily.source = 'Health Connect';
                }
              });
            }

            if (Array.isArray(resData.bodyFat)) {
              resData.bodyFat.forEach((rec: any) => {
                const fat = rec?.percentage ?? rec?.value;
                const dateStr = toLocalDateString(rec?.time || rec?.startTime || rec?.date);
                if (fat && dateStr) {
                  const daily = getOrCreateDaily(dateStr);
                  daily.bodyFatPercent = parseFloat(Number(fat).toFixed(1));
                  daily.source = 'Health Connect';
                }
              });
            }

            if (Array.isArray(resData.steps)) {
              resData.steps.forEach((rec: any) => {
                const count = Number(rec?.count || 0);
                const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
                if (count > 0 && dateStr) {
                  const daily = getOrCreateDaily(dateStr);
                  daily.steps = (daily.steps || 0) + count;
                  daily.source = 'Health Connect';
                }
              });
            }

            if (Array.isArray(resData.sleep)) {
              resData.sleep.forEach((rec: any) => {
                const hours = Number(rec?.hours || 0);
                const dateStr = toLocalDateString(rec?.startTime || rec?.endTime || rec?.time || rec?.date);
                if (hours > 0 && dateStr) {
                  const daily = getOrCreateDaily(dateStr);
                  daily.sleepHours = parseFloat(((daily.sleepHours || 0) + hours).toFixed(1));
                  daily.source = 'Health Connect';
                }
              });
            }

            if (Array.isArray(resData.heartRates)) {
              resData.heartRates.forEach((rec: any) => {
                const bpm = Number(rec?.bpm || 0);
                const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
                if (bpm > 0 && dateStr) {
                  const daily = getOrCreateDaily(dateStr);
                  daily.heartRateSum = (daily.heartRateSum || 0) + bpm;
                  daily.heartRateCount = (daily.heartRateCount || 0) + 1;
                  daily.source = 'Health Connect';
                }
              });
            }

            if (Array.isArray(resData.hydration)) {
              resData.hydration.forEach((rec: any) => {
                const ml = Number(rec?.volumeMl || (rec?.volumeLiters ? rec.volumeLiters * 1000 : 0));
                const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
                if (ml > 0 && dateStr) {
                  const daily = getOrCreateDaily(dateStr);
                  daily.hydrationMl = (daily.hydrationMl || 0) + ml;
                  daily.source = 'Health Connect';
                }
              });
            }
          }
        }
      } catch (hcErr) {
        console.error('[Health Connect Error] Erro ao consultar dados nativos do Health Connect:', hcErr);
      }
    }

    // 3. Consultar Google Fitness / Health Cloud API com Token OAuth (para usuários Web ou backup)
    if (isSupabaseConfigured()) {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const providerToken = session?.provider_token;

        if (providerToken) {
          hasToken = true;
          const startTimeMillis = Date.now() - 60 * 24 * 60 * 60 * 1000;
          const endTimeMillis = Date.now();

          console.log('[Google Fit API] Consultando métricas aggregate...');
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
                { dataTypeName: 'com.google.step_count.delta' },
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
                const dateStr = toLocalDateString(parseInt(b.startTimeMillis));
                if (!dateStr) return;

                const daily = getOrCreateDaily(dateStr);
                const weightPoint = b.dataset?.[0]?.point?.[0];
                const fatPoint = b.dataset?.[1]?.point?.[0];
                const stepPoint = b.dataset?.[2]?.point?.[0];

                if (weightPoint?.value?.[0]?.fpVal && !daily.weightKg) {
                  daily.weightKg = parseFloat(weightPoint.value[0].fpVal.toFixed(1));
                  daily.source = daily.source || 'Google Fit';
                }
                if (fatPoint?.value?.[0]?.fpVal && !daily.bodyFatPercent) {
                  daily.bodyFatPercent = parseFloat(fatPoint.value[0].fpVal.toFixed(1));
                  daily.source = daily.source || 'Google Fit';
                }
                if (stepPoint?.value?.[0]?.intVal && !daily.steps) {
                  daily.steps = stepPoint.value[0].intVal;
                  daily.source = daily.source || 'Google Fit';
                }
              });
            }
          }
        } else if (isGoogleSession) {
          hasToken = true;
        }
      } catch (err) {
        console.error('[Google Fit API Error] Erro ao consultar API:', err);
      }
    }

    // 4. Sincronização e Merge Inteligente por Data (Group & Merge)
    const existingByDate = new Map<string, SymptomLog>(existingSymptoms.map(s => [s.date, s]));
    const mergedLogs: SymptomLog[] = [];
    let updatedCount = 0;
    let createdCount = 0;

    dailyMap.forEach((data, dateStr) => {
      // Ignorar se a data não tiver dados reais
      if (!data.weightKg && !data.bodyFatPercent && !data.steps && !data.sleepHours && !data.heartRateSum && !data.hydrationMl) {
        return;
      }

      const avgBpm = data.heartRateCount ? Math.round(data.heartRateSum! / data.heartRateCount) : undefined;
      const existing = existingByDate.get(dateStr);

      if (existing) {
        // Atualizar registro existente com as novas medições da mesma data
        const updatedLog: SymptomLog = {
          ...existing,
          weightKg: data.weightKg !== undefined ? data.weightKg : existing.weightKg,
          bodyFatPercent: data.bodyFatPercent !== undefined ? data.bodyFatPercent : existing.bodyFatPercent,
          steps: data.steps !== undefined ? data.steps : existing.steps,
          sleepHours: data.sleepHours !== undefined ? data.sleepHours : existing.sleepHours,
          heartRateBpm: avgBpm !== undefined ? avgBpm : existing.heartRateBpm,
          waterMl: data.hydrationMl !== undefined ? data.hydrationMl : existing.waterMl,
          notes: existing.notes || (data.source ? `Sincronizado via ${data.source}` : 'Sincronizado via Health Connect Android'),
          updatedAt: new Date().toISOString(),
        };
        mergedLogs.push(updatedLog);
        updatedCount++;
      } else {
        // Criar novo registro para a data com todos os dados agrupados
        const newLog: SymptomLog = {
          id: 'symp_hc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          date: dateStr,
          weightKg: data.weightKg,
          bodyFatPercent: data.bodyFatPercent,
          steps: data.steps,
          sleepHours: data.sleepHours,
          heartRateBpm: avgBpm,
          waterMl: data.hydrationMl,
          heightCm,
          energy: 4,
          libido: 4,
          mood: 4,
          sleep: data.sleepHours ? Math.min(5, Math.max(1, Math.round(data.sleepHours / 1.6))) : 4,
          acne: 1,
          waterRetention: 1,
          notes: data.source ? `Sincronizado via ${data.source}` : 'Sincronizado via Health Connect Android',
          updatedAt: new Date().toISOString(),
        };
        mergedLogs.push(newLog);
        createdCount++;
      }
    });

    const updatedSyncTime = new Date().toISOString();
    config.lastSyncAt = updatedSyncTime;
    if (isGoogleSession && !config.connected) {
      config.connected = true;
    }
    storage.saveGoogleHealthConfig(config, userId);

    if (!hasToken && !isGoogleSession && mergedLogs.length === 0) {
      return {
        success: false,
        newLogs: [],
        count: 0,
        message: 'Aviso: Token OAuth do Google não encontrado na sessão atual. Conecte pelo botão Google OAuth ou acione o Health Connect no dispositivo Android.',
        lastSyncAt: updatedSyncTime,
        hasOAuthToken: false,
      };
    }

    return {
      success: true,
      newLogs: mergedLogs,
      count: mergedLogs.length,
      message: mergedLogs.length > 0
        ? `Sincronização concluída! ${mergedLogs.length} dias sincronizados (${createdCount} novos, ${updatedCount} atualizados).`
        : (isGoogleSession
            ? 'Nenhuma nova medição encontrada nos últimos 60 dias no Health Connect ou Google Fit.'
            : 'Nenhuma medição encontrada.'),
      lastSyncAt: updatedSyncTime,
      hasOAuthToken: true,
    };
  },

  // Parse CSV exported from Fitbit or Google Fit / Takeout
  parseFitbitCsv: (csvText: string, heightCm: number = 175): SymptomLog[] => {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/['"]/g, ''));
    
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

      let formattedDate = toLocalDateString(rawDate);
      if (!formattedDate) {
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(rawDate)) {
          const dparts = rawDate.split(/[\/-]/);
          const day = dparts[0].padStart(2, '0');
          const month = dparts[1].padStart(2, '0');
          const year = dparts[2].slice(0, 4);
          formattedDate = `${year}-${month}-${day}`;
        }
      }

      if (!formattedDate || seenDates.has(formattedDate)) continue;

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
    const existingMap = new Map<string, SymptomLog>(existingSymptoms.map(s => [s.date, s]));
    const results: SymptomLog[] = [];

    for (const entry of entries) {
      const existing = existingMap.get(entry.date);
      if (existing) {
        results.push({
          ...existing,
          weightKg: entry.weightKg !== undefined ? entry.weightKg : existing.weightKg,
          bodyFatPercent: entry.bodyFatPercent !== undefined ? entry.bodyFatPercent : existing.bodyFatPercent,
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
          steps: entry.steps,
          sleepHours: entry.sleepHours,
          heartRateBpm: entry.heartRateBpm,
          waterMl: entry.hydrationMl,
          heightCm,
          energy: entry.energy || 4,
          libido: entry.libido || 4,
          mood: entry.mood || 4,
          sleep: entry.sleep || 4,
          acne: 1,
          waterRetention: 1,
          notes: entry.notes || 'Importado de dados de saúde',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  },
};
