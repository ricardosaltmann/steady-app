import { SymptomLog, DailyActivitySummary, GoogleHealthSyncConfig } from '../types';
import { storage } from './storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Capacitor } from '@capacitor/core';

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

  // Sincronização Inteligente com Separação de Lojas de Dados:
  // 1. Biometria Pontual -> symptoms (tabela principal)
  // 2. Séries Temporais -> daily_activities (armazenamento de segundo plano)
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

    // Mapas separados para isolar Biometria de Séries Temporais
    const biometricsMap = new Map<string, PointInTimeBiometrics>();
    const activitiesMap = new Map<string, TimeSeriesActivity>();

    const getOrCreateBio = (dateStr: string): PointInTimeBiometrics => {
      let item = biometricsMap.get(dateStr);
      if (!item) {
        item = {};
        biometricsMap.set(dateStr, item);
      }
      return item;
    };

    const getOrCreateAct = (dateStr: string): TimeSeriesActivity => {
      let item = activitiesMap.get(dateStr);
      if (!item) {
        item = {};
        activitiesMap.set(dateStr, item);
      }
      return item;
    };

    // Buffer de gordura corporal para casar com precisão temporal
    const rawBodyFatRecords: Array<{ timestamp: number; dateStr: string; fat: number }> = [];

    let hasToken = false;

    // 1. Processar dados pré-obtidos (objeto nativo retornado pelo Health Connect)
    if (prefetchedData) {
      hasToken = true;
      console.log('[Health Connect Sync] Processando dados pré-obtidos:', prefetchedData);

      const weights = prefetchedData.weights || prefetchedData.records || (Array.isArray(prefetchedData) ? prefetchedData : []);
      const bodyFat = prefetchedData.bodyFat || [];
      const glucose = prefetchedData.glucose || [];
      const steps = prefetchedData.steps || [];
      const sleep = prefetchedData.sleep || [];
      const heartRates = prefetchedData.heartRates || [];
      const hydration = prefetchedData.hydration || [];

      // A) Biometria: Pesagens (WeightRecord)
      if (Array.isArray(weights)) {
        weights.forEach((rec: any) => {
          const w = rec?.weightKg ?? rec?.weight?.inKilograms ?? rec?.value;
          const rawTime = rec?.time || rec?.startTime || rec?.date;
          const dateStr = toLocalDateString(rawTime);
          if (w && dateStr) {
            const wNum = parseFloat(Number(w).toFixed(1));
            if (wNum > 0) {
              const bio = getOrCreateBio(dateStr);
              bio.weightKg = wNum;
              bio.weightTimestamp = rawTime ? new Date(rawTime).getTime() : undefined;
              bio.source = 'Health Connect';
            }
          }
        });
      }

      // B) Biometria: Gordura Corporal (BodyFatRecord)
      if (Array.isArray(bodyFat)) {
        bodyFat.forEach((rec: any) => {
          let fat = Number(rec?.percentage ?? rec?.value ?? rec?.bodyFatPercent ?? rec?.percentage?.value);
          if (!isNaN(fat) && fat > 0) {
            if (fat <= 1.0) fat = fat * 100;
            fat = parseFloat(fat.toFixed(1));

            const rawTime = rec?.time || rec?.startTime || rec?.date;
            const dateStr = toLocalDateString(rawTime);
            if (dateStr) {
              const t = rawTime ? new Date(rawTime).getTime() : 0;
              rawBodyFatRecords.push({ timestamp: t, dateStr, fat });
              const bio = getOrCreateBio(dateStr);
              bio.bodyFatPercent = fat;
              bio.source = 'Health Connect';
            }
          }
        });
      }

      // C) Biometria: Glicose (BloodGlucoseRecord)
      if (Array.isArray(glucose)) {
        glucose.forEach((rec: any) => {
          const gVal = Number(rec?.glucoseMgDl ?? rec?.value ?? rec?.level);
          const rawTime = rec?.time || rec?.startTime || rec?.date;
          const dateStr = toLocalDateString(rawTime);
          if (!isNaN(gVal) && gVal > 0 && dateStr) {
            const bio = getOrCreateBio(dateStr);
            bio.glucoseMgDl = parseFloat(gVal.toFixed(0));
            bio.source = 'Health Connect';
          }
        });
      }

      // D) Séries Temporais: Passos (StepsRecord) -> Loja Secundária
      if (Array.isArray(steps)) {
        steps.forEach((rec: any) => {
          const count = Number(rec?.count || 0);
          const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
          if (count > 0 && dateStr) {
            const act = getOrCreateAct(dateStr);
            act.steps = (act.steps || 0) + count;
          }
        });
      }

      // E) Séries Temporais: Sono (SleepSessionRecord) -> Loja Secundária
      if (Array.isArray(sleep)) {
        sleep.forEach((rec: any) => {
          const hours = Number(rec?.hours || 0);
          const dateStr = toLocalDateString(rec?.startTime || rec?.endTime || rec?.time || rec?.date);
          if (hours > 0 && dateStr) {
            const act = getOrCreateAct(dateStr);
            act.sleepHours = parseFloat(((act.sleepHours || 0) + hours).toFixed(1));
          }
        });
      }

      // F) Séries Temporais: Frequência Cardíaca (HeartRateRecord) -> Loja Secundária
      if (Array.isArray(heartRates)) {
        heartRates.forEach((rec: any) => {
          const bpm = Number(rec?.bpm || 0);
          const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
          if (bpm > 0 && dateStr) {
            const act = getOrCreateAct(dateStr);
            act.heartRateSum = (act.heartRateSum || 0) + bpm;
            act.heartRateCount = (act.heartRateCount || 0) + 1;
          }
        });
      }

      // G) Séries Temporais: Hidratação (HydrationRecord) -> Loja Secundária
      if (Array.isArray(hydration)) {
        hydration.forEach((rec: any) => {
          const ml = Number(rec?.volumeMl || (rec?.volumeLiters ? rec.volumeLiters * 1000 : 0));
          const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
          if (ml > 0 && dateStr) {
            const act = getOrCreateAct(dateStr);
            act.hydrationMl = (act.hydrationMl || 0) + ml;
          }
        });
      }
    }

    // 2. Se for Capacitor nativo e não veio prefetchedData, consultar diretamente o plugin nativo
    if (Capacitor.isNativePlatform() && (!prefetchedData || (Array.isArray(prefetchedData) && prefetchedData.length === 0))) {
      try {
        console.log('[Health Connect] Consultando runtime nativo...');
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
            const weights = resData.weights || resData.records || [];
            if (Array.isArray(weights)) {
              weights.forEach((rec: any) => {
                const w = rec?.weightKg ?? rec?.weight?.inKilograms ?? rec?.value;
                const rawTime = rec?.time || rec?.startTime || rec?.date;
                const dateStr = toLocalDateString(rawTime);
                if (w && dateStr) {
                  const wNum = parseFloat(Number(w).toFixed(1));
                  if (wNum > 0) {
                    const bio = getOrCreateBio(dateStr);
                    bio.weightKg = wNum;
                    bio.weightTimestamp = rawTime ? new Date(rawTime).getTime() : undefined;
                    bio.source = 'Health Connect';
                  }
                }
              });
            }

            if (Array.isArray(resData.bodyFat)) {
              resData.bodyFat.forEach((rec: any) => {
                let fat = Number(rec?.percentage ?? rec?.value ?? rec?.bodyFatPercent ?? rec?.percentage?.value);
                if (!isNaN(fat) && fat > 0) {
                  if (fat <= 1.0) fat = fat * 100;
                  fat = parseFloat(fat.toFixed(1));

                  const rawTime = rec?.time || rec?.startTime || rec?.date;
                  const dateStr = toLocalDateString(rawTime);
                  if (dateStr) {
                    const t = rawTime ? new Date(rawTime).getTime() : 0;
                    rawBodyFatRecords.push({ timestamp: t, dateStr, fat });
                    const bio = getOrCreateBio(dateStr);
                    bio.bodyFatPercent = fat;
                    bio.source = 'Health Connect';
                  }
                }
              });
            }

            if (Array.isArray(resData.glucose)) {
              resData.glucose.forEach((rec: any) => {
                const gVal = Number(rec?.glucoseMgDl ?? rec?.value);
                const dateStr = toLocalDateString(rec?.time || rec?.startTime || rec?.date);
                if (!isNaN(gVal) && gVal > 0 && dateStr) {
                  const bio = getOrCreateBio(dateStr);
                  bio.glucoseMgDl = parseFloat(gVal.toFixed(0));
                  bio.source = 'Health Connect';
                }
              });
            }

            if (Array.isArray(resData.steps)) {
              resData.steps.forEach((rec: any) => {
                const count = Number(rec?.count || 0);
                const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
                if (count > 0 && dateStr) {
                  const act = getOrCreateAct(dateStr);
                  act.steps = (act.steps || 0) + count;
                }
              });
            }

            if (Array.isArray(resData.sleep)) {
              resData.sleep.forEach((rec: any) => {
                const hours = Number(rec?.hours || 0);
                const dateStr = toLocalDateString(rec?.startTime || rec?.endTime || rec?.time || rec?.date);
                if (hours > 0 && dateStr) {
                  const act = getOrCreateAct(dateStr);
                  act.sleepHours = parseFloat(((act.sleepHours || 0) + hours).toFixed(1));
                }
              });
            }

            if (Array.isArray(resData.heartRates)) {
              resData.heartRates.forEach((rec: any) => {
                const bpm = Number(rec?.bpm || 0);
                const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
                if (bpm > 0 && dateStr) {
                  const act = getOrCreateAct(dateStr);
                  act.heartRateSum = (act.heartRateSum || 0) + bpm;
                  act.heartRateCount = (act.heartRateCount || 0) + 1;
                }
              });
            }

            if (Array.isArray(resData.hydration)) {
              resData.hydration.forEach((rec: any) => {
                const ml = Number(rec?.volumeMl || (rec?.volumeLiters ? rec.volumeLiters * 1000 : 0));
                const dateStr = toLocalDateString(rec?.startTime || rec?.time || rec?.date);
                if (ml > 0 && dateStr) {
                  const act = getOrCreateAct(dateStr);
                  act.hydrationMl = (act.hydrationMl || 0) + ml;
                }
              });
            }
          }
        }
      } catch (hcErr) {
        console.error('[Health Connect Error] Erro ao consultar Health Connect nativo:', hcErr);
      }
    }

    // 3. Consultar Google Fitness API com Token OAuth (para usuários Web ou backup)
    if (isSupabaseConfigured()) {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const providerToken = session?.provider_token;

        if (providerToken) {
          hasToken = true;
          const startTimeMillis = Date.now() - 60 * 24 * 60 * 60 * 1000;
          const endTimeMillis = Date.now();

          console.log('[Google Fit API] Consultando métricas via REST API...');
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

                const bio = getOrCreateBio(dateStr);
                const act = getOrCreateAct(dateStr);
                const weightPoint = b.dataset?.[0]?.point?.[0];
                const fatPoint = b.dataset?.[1]?.point?.[0];
                const stepPoint = b.dataset?.[2]?.point?.[0];

                if (weightPoint?.value?.[0]?.fpVal && !bio.weightKg) {
                  bio.weightKg = parseFloat(weightPoint.value[0].fpVal.toFixed(1));
                  bio.source = bio.source || 'Google Fit';
                }
                if (fatPoint?.value?.[0]?.fpVal && !bio.bodyFatPercent) {
                  let fVal = parseFloat(fatPoint.value[0].fpVal.toFixed(1));
                  if (fVal <= 1.0) fVal = fVal * 100;
                  bio.bodyFatPercent = fVal;
                  bio.source = bio.source || 'Google Fit';
                }
                if (stepPoint?.value?.[0]?.intVal && !act.steps) {
                  act.steps = stepPoint.value[0].intVal;
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

    // 4. Cruzamento Temporal de Gordura Corporal & Peso (Proximity Matching)
    // Garante que o peso e a % de gordura da mesma sessão na balança sejam atribuídos ao mesmo dia
    biometricsMap.forEach((bio, dateStr) => {
      if (bio.weightKg && !bio.bodyFatPercent && rawBodyFatRecords.length > 0) {
        // A) Match exato pela string de data local YYYY-MM-DD
        const exactMatch = rawBodyFatRecords.find(r => r.dateStr === dateStr);
        if (exactMatch) {
          bio.bodyFatPercent = exactMatch.fat;
        } else if (bio.weightTimestamp) {
          // B) Match por proximidade de até 12h para cobrir divergência de fuso horário da balança
          const closest = rawBodyFatRecords
            .map(r => ({ ...r, diff: Math.abs(r.timestamp - bio.weightTimestamp!) }))
            .filter(r => r.diff <= 12 * 3600 * 1000)
            .sort((a, b) => a.diff - b.diff)[0];

          if (closest) {
            bio.bodyFatPercent = closest.fat;
          }
        }
      }
    });

    // 5. Salvar Séries Temporais / Alta Frequência na Loja Secundária (DailyActivitySummary)
    const dailyActivities: DailyActivitySummary[] = [];
    activitiesMap.forEach((act, dateStr) => {
      const avgBpm = act.heartRateCount ? Math.round(act.heartRateSum! / act.heartRateCount) : undefined;
      if (act.steps || act.sleepHours || avgBpm || act.hydrationMl) {
        dailyActivities.push({
          date: dateStr,
          steps: act.steps,
          sleepHours: act.sleepHours,
          heartRateBpm: avgBpm,
          hydrationMl: act.hydrationMl,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    if (dailyActivities.length > 0) {
      storage.saveDailyActivities(dailyActivities, userId);
      console.log(`[Storage] Loja secundária atualizada: ${dailyActivities.length} dias de séries temporais.`);
    }

    // 6. Consolidação e Merge da Loja Primária (symptoms / Tabela de Histórico)
    // REGRA OBRIGATÓRIA: Descartar dias sem pesagem ou glicose. Nunca gerar linhas vazias/fantasmas!
    const existingByDate = new Map<string, SymptomLog>(existingSymptoms.map(s => [s.date, s]));
    const mergedLogs: SymptomLog[] = [];
    let updatedCount = 0;
    let createdCount = 0;

    biometricsMap.forEach((bio, dateStr) => {
      // Se NÃO houver peso registrado (nem glicose pontual), DESCARTE O DIA!
      if ((!bio.weightKg || bio.weightKg <= 0) && (!bio.glucoseMgDl || bio.glucoseMgDl <= 0)) {
        // Se o usuário já possuía um registro criado manualmente para o dia, apenas enriquece seus dados
        const existing = existingByDate.get(dateStr);
        if (existing && existing.weightKg && existing.weightKg > 0) {
          const act = activitiesMap.get(dateStr);
          const avgBpm = act?.heartRateCount ? Math.round(act.heartRateSum! / act.heartRateCount) : undefined;
          mergedLogs.push({
            ...existing,
            bodyFatPercent: bio.bodyFatPercent !== undefined ? bio.bodyFatPercent : existing.bodyFatPercent,
            glucoseMgDl: bio.glucoseMgDl !== undefined ? bio.glucoseMgDl : existing.glucoseMgDl,
            steps: act?.steps !== undefined ? act.steps : existing.steps,
            sleepHours: act?.sleepHours !== undefined ? act.sleepHours : existing.sleepHours,
            heartRateBpm: avgBpm !== undefined ? avgBpm : existing.heartRateBpm,
            waterMl: act?.hydrationMl !== undefined ? act.hydrationMl : existing.waterMl,
            updatedAt: new Date().toISOString(),
          });
          updatedCount++;
        }
        return; // Nunca crie uma nova linha vazia!
      }

      // Enriquecer a linha de biometria com os dados consolidados daquele dia (passos, sono, bpm)
      const act = activitiesMap.get(dateStr);
      const avgBpm = act?.heartRateCount ? Math.round(act.heartRateSum! / act.heartRateCount) : undefined;
      const existing = existingByDate.get(dateStr);

      if (existing) {
        mergedLogs.push({
          ...existing,
          weightKg: bio.weightKg !== undefined ? bio.weightKg : existing.weightKg,
          bodyFatPercent: bio.bodyFatPercent !== undefined ? bio.bodyFatPercent : existing.bodyFatPercent,
          glucoseMgDl: bio.glucoseMgDl !== undefined ? bio.glucoseMgDl : existing.glucoseMgDl,
          steps: act?.steps !== undefined ? act.steps : existing.steps,
          sleepHours: act?.sleepHours !== undefined ? act.sleepHours : existing.sleepHours,
          heartRateBpm: avgBpm !== undefined ? avgBpm : existing.heartRateBpm,
          waterMl: act?.hydrationMl !== undefined ? act.hydrationMl : existing.waterMl,
          notes: existing.notes || (bio.source ? `Sincronizado via ${bio.source}` : 'Sincronizado via Health Connect Android'),
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      } else {
        mergedLogs.push({
          id: 'symp_hc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          date: dateStr,
          weightKg: bio.weightKg,
          bodyFatPercent: bio.bodyFatPercent,
          glucoseMgDl: bio.glucoseMgDl,
          steps: act?.steps,
          sleepHours: act?.sleepHours,
          heartRateBpm: avgBpm,
          waterMl: act?.hydrationMl,
          heightCm,
          notes: bio.source ? `Sincronizado via ${bio.source}` : 'Sincronizado via Health Connect Android',
          updatedAt: new Date().toISOString(),
        });
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
        dailyActivities,
        count: 0,
        message: 'Aviso: Token OAuth do Google não encontrado na sessão atual. Conecte pelo botão Google OAuth ou acione o Health Connect no dispositivo Android.',
        lastSyncAt: updatedSyncTime,
        hasOAuthToken: false,
      };
    }

    return {
      success: true,
      newLogs: mergedLogs,
      dailyActivities,
      count: mergedLogs.length,
      message: mergedLogs.length > 0
        ? `Sincronização concluída! ${mergedLogs.length} medições biométricas consolidadas (${createdCount} novas, ${updatedCount} atualizadas).`
        : (isGoogleSession
            ? 'Nenhuma nova pesagem encontrada nos últimos 60 dias no Health Connect ou Google Fit.'
            : 'Nenhuma pesagem encontrada.'),
      lastSyncAt: updatedSyncTime,
      hasOAuthToken: true,
    };
  },

  // Parse CSV exportado de Fitbit / Takeout
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
        if (!isNaN(parsedFat) && parsedFat > 0 && parsedFat < 60) {
          fatVal = parsedFat <= 1.0 ? parsedFat * 100 : parsedFat;
        }
      }

      seenDates.add(formattedDate);
      parsedLogs.push({
        id: 'symp_fitbit_csv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        date: formattedDate,
        weightKg: weightVal,
        bodyFatPercent: fatVal,
        heightCm,
        notes: 'Importado de arquivo Fitbit/Google Health',
        updatedAt: new Date().toISOString(),
      });
    }

    return parsedLogs;
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
