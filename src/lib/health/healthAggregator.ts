import { SymptomLog, DailyActivitySummary, ClinicalDataSource, HealthDataKind } from '../../types';
import { ProviderMetricsPayload, RawHealthMetricItem } from './types';
import { toLocalDateString } from '../dateUtils';

interface PointInTimeBiometrics {
  date: string;
  weightKg?: number;
  weightTimestamp?: number;
  bodyFatPercent?: number;
  glucoseMgDl?: number;
  dataOrigin?: string;
  dataSource?: ClinicalDataSource;
}

interface TimeSeriesBucket {
  date: string;
  // Steps mapped by origin to avoid double counting across multiple apps
  stepsByOrigin: Map<string, number>;
  sleepHours: number;
  heartRateSum: number;
  heartRateCount: number;
  hydrationMl: number;
  origins: Set<string>;
}

export const healthAggregator = {
  /**
   * Processa métricas brutas provenientes de um provedor de saúde, aplicando:
   * 1. Desduplicação de séries temporais entre múltiplos Data Origins (ex: Samsung Health + Google Fit)
   * 2. Pareamento temporal estrito de balança (peso + % gordura corporal)
   * 3. Eliminação absoluta de valores subjetivos sintéticos (energy, libido, humor, etc.)
   * 4. Descarte de dias sem pesagem ou glicose (sem linhas fantasmas na tabela)
   */
  aggregateMetrics(
    payload: ProviderMetricsPayload,
    existingSymptoms: SymptomLog[],
    heightCm: number = 175,
    defaultSource: ClinicalDataSource = 'health_connect'
  ): {
    symptomLogs: SymptomLog[];
    dailyActivities: DailyActivitySummary[];
    createdCount: number;
    updatedCount: number;
  } {
    const biometricsMap = new Map<string, PointInTimeBiometrics>();
    const activityMap = new Map<string, TimeSeriesBucket>();

    const getOrCreateBio = (dateStr: string): PointInTimeBiometrics => {
      let b = biometricsMap.get(dateStr);
      if (!b) {
        b = { date: dateStr, dataSource: defaultSource };
        biometricsMap.set(dateStr, b);
      }
      return b;
    };

    const getOrCreateAct = (dateStr: string): TimeSeriesBucket => {
      let a = activityMap.get(dateStr);
      if (!a) {
        a = {
          date: dateStr,
          stepsByOrigin: new Map(),
          sleepHours: 0,
          heartRateSum: 0,
          heartRateCount: 0,
          hydrationMl: 0,
          origins: new Set(),
        };
        activityMap.set(dateStr, a);
      }
      return a;
    };

    const rawBodyFatRecords: Array<{ timestamp: number; dateStr: string; fat: number; origin?: string }> = [];

    // 1. Processar Pesagens (WeightRecord)
    const weights = payload.weights || payload.records || [];
    for (const rec of weights) {
      const w = rec.weightKg ?? rec.weight?.inKilograms ?? rec.value;
      const rawTime = rec.time || rec.startTime;
      const dateStr = toLocalDateString(rawTime);
      if (w && dateStr) {
        const wNum = parseFloat(Number(w).toFixed(1));
        if (wNum > 0) {
          const bio = getOrCreateBio(dateStr);
          bio.weightKg = wNum;
          bio.weightTimestamp = rawTime ? new Date(rawTime).getTime() : undefined;
          if (rec.dataOrigin) bio.dataOrigin = rec.dataOrigin;
        }
      }
    }

    // 2. Processar Gordura Corporal (BodyFatRecord)
    const bodyFats = payload.bodyFat || [];
    for (const rec of bodyFats) {
      let fat = Number(rec.percentage ?? rec.value ?? rec.bodyFatPercent);
      if (!isNaN(fat) && fat > 0) {
        if (fat <= 1.0) fat = fat * 100;
        fat = parseFloat(fat.toFixed(1));
        const rawTime = rec.time || rec.startTime;
        const dateStr = toLocalDateString(rawTime);
        if (dateStr) {
          const t = rawTime ? new Date(rawTime).getTime() : 0;
          rawBodyFatRecords.push({ timestamp: t, dateStr, fat, origin: rec.dataOrigin });
          const bio = getOrCreateBio(dateStr);
          bio.bodyFatPercent = fat;
          if (rec.dataOrigin && !bio.dataOrigin) bio.dataOrigin = rec.dataOrigin;
        }
      }
    }

    // 3. Processar Glicose (BloodGlucoseRecord)
    const glucoses = payload.glucose || [];
    for (const rec of glucoses) {
      const gVal = Number(rec.glucoseMgDl ?? rec.value ?? rec.level);
      const rawTime = rec.time || rec.startTime;
      const dateStr = toLocalDateString(rawTime);
      if (!isNaN(gVal) && gVal > 0 && dateStr) {
        const bio = getOrCreateBio(dateStr);
        bio.glucoseMgDl = parseFloat(gVal.toFixed(0));
        if (rec.dataOrigin && !bio.dataOrigin) bio.dataOrigin = rec.dataOrigin;
      }
    }

    // 4. Cruzamento Temporal de Gordura Corporal & Peso (Proximity Matching)
    biometricsMap.forEach((bio, dateStr) => {
      if (bio.weightKg && !bio.bodyFatPercent && rawBodyFatRecords.length > 0) {
        const exactMatch = rawBodyFatRecords.find(r => r.dateStr === dateStr);
        if (exactMatch) {
          bio.bodyFatPercent = exactMatch.fat;
          if (!bio.dataOrigin && exactMatch.origin) bio.dataOrigin = exactMatch.origin;
        } else if (bio.weightTimestamp) {
          // Proximidade de até 12h
          const closest = rawBodyFatRecords
            .map(r => ({ ...r, diff: Math.abs(r.timestamp - bio.weightTimestamp!) }))
            .filter(r => r.diff <= 12 * 3600 * 1000)
            .sort((a, b) => a.diff - b.diff)[0];

          if (closest) {
            bio.bodyFatPercent = closest.fat;
            if (!bio.dataOrigin && closest.origin) bio.dataOrigin = closest.origin;
          }
        }
      }
    });

    // 5. Processar Séries Temporais com Desduplicação por Data Origin
    // A) Passos (StepsRecord)
    const steps = payload.steps || [];
    for (const rec of steps) {
      const count = Number(rec.count || 0);
      const dateStr = toLocalDateString(rec.startTime || rec.time);
      if (count > 0 && dateStr) {
        const act = getOrCreateAct(dateStr);
        const origin = rec.dataOrigin || 'default';
        act.origins.add(origin);
        act.stepsByOrigin.set(origin, (act.stepsByOrigin.get(origin) || 0) + count);
      }
    }

    // B) Sono (SleepSessionRecord)
    const sleeps = payload.sleep || [];
    for (const rec of sleeps) {
      const hours = Number(rec.hours || 0);
      const dateStr = toLocalDateString(rec.startTime || rec.endTime || rec.time);
      if (hours > 0 && dateStr) {
        const act = getOrCreateAct(dateStr);
        act.sleepHours = parseFloat((act.sleepHours + hours).toFixed(1));
        if (rec.dataOrigin) act.origins.add(rec.dataOrigin);
      }
    }

    // C) Frequência Cardíaca (HeartRateRecord)
    const heartRates = payload.heartRates || [];
    for (const rec of heartRates) {
      const bpm = Number(rec.bpm || 0);
      const dateStr = toLocalDateString(rec.startTime || rec.time);
      if (bpm > 0 && dateStr) {
        const act = getOrCreateAct(dateStr);
        act.heartRateSum += bpm;
        act.heartRateCount += 1;
        if (rec.dataOrigin) act.origins.add(rec.dataOrigin);
      }
    }

    // D) Hidratação (HydrationRecord)
    const hydrations = payload.hydration || [];
    for (const rec of hydrations) {
      const ml = Number(rec.volumeMl || (rec.volumeLiters ? rec.volumeLiters * 1000 : 0));
      const dateStr = toLocalDateString(rec.startTime || rec.time);
      if (ml > 0 && dateStr) {
        const act = getOrCreateAct(dateStr);
        act.hydrationMl += ml;
        if (rec.dataOrigin) act.origins.add(rec.dataOrigin);
      }
    }

    // 6. Construir Séries Temporais Agregadas (Loja Secundária)
    const dailyActivities: DailyActivitySummary[] = [];
    activityMap.forEach((act, dateStr) => {
      // Para passos: se múltiplas origens reportaram no mesmo dia, pega o máximo entre as origens
      // para evitar somar 10.000 (Samsung) + 10.000 (Google Fit) = 20.000 passos falsos
      let resolvedSteps: number | undefined;
      if (act.stepsByOrigin.size > 0) {
        resolvedSteps = Math.max(...Array.from(act.stepsByOrigin.values()));
      }

      const avgBpm = act.heartRateCount > 0 ? Math.round(act.heartRateSum / act.heartRateCount) : undefined;
      const primaryOrigin = Array.from(act.origins)[0];

      if (resolvedSteps || act.sleepHours || avgBpm || act.hydrationMl) {
        dailyActivities.push({
          date: dateStr,
          steps: resolvedSteps,
          sleepHours: act.sleepHours > 0 ? act.sleepHours : undefined,
          heartRateBpm: avgBpm,
          hydrationMl: act.hydrationMl > 0 ? act.hydrationMl : undefined,
          dataSource: defaultSource,
          dataKind: 'measured' as HealthDataKind,
          dataOrigin: primaryOrigin,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    // 7. Consolidação com a Loja Primária (symptoms / Tabela de Biometria)
    const existingByDate = new Map<string, SymptomLog>(existingSymptoms.map(s => [s.date, s]));
    const mergedLogs: SymptomLog[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    biometricsMap.forEach((bio, dateStr) => {
      const act = activityMap.get(dateStr);
      let resolvedSteps: number | undefined;
      if (act && act.stepsByOrigin.size > 0) {
        resolvedSteps = Math.max(...Array.from(act.stepsByOrigin.values()));
      }
      const avgBpm = act && act.heartRateCount > 0 ? Math.round(act.heartRateSum / act.heartRateCount) : undefined;
      const existing = existingByDate.get(dateStr);

      // REGRA OBRIGATÓRIA: Descartar dias sem pesagem ou glicose. Nunca gerar linhas vazias/fantasmas!
      if ((!bio.weightKg || bio.weightKg <= 0) && (!bio.glucoseMgDl || bio.glucoseMgDl <= 0)) {
        // Se o usuário já possuía uma linha existente válida naquele dia, enriquece sem duplicar
        if (existing && existing.weightKg && existing.weightKg > 0) {
          mergedLogs.push({
            ...existing,
            bodyFatPercent: bio.bodyFatPercent !== undefined ? bio.bodyFatPercent : existing.bodyFatPercent,
            glucoseMgDl: bio.glucoseMgDl !== undefined ? bio.glucoseMgDl : existing.glucoseMgDl,
            steps: resolvedSteps !== undefined ? resolvedSteps : existing.steps,
            sleepHours: act && act.sleepHours > 0 ? act.sleepHours : existing.sleepHours,
            heartRateBpm: avgBpm !== undefined ? avgBpm : existing.heartRateBpm,
            waterMl: act && act.hydrationMl > 0 ? act.hydrationMl : existing.waterMl,
            updatedAt: new Date().toISOString(),
          });
          updatedCount++;
        }
        return; // Ignora dias vazios
      }

      if (existing) {
        mergedLogs.push({
          ...existing,
          weightKg: bio.weightKg !== undefined ? bio.weightKg : existing.weightKg,
          bodyFatPercent: bio.bodyFatPercent !== undefined ? bio.bodyFatPercent : existing.bodyFatPercent,
          glucoseMgDl: bio.glucoseMgDl !== undefined ? bio.glucoseMgDl : existing.glucoseMgDl,
          steps: resolvedSteps !== undefined ? resolvedSteps : existing.steps,
          sleepHours: act && act.sleepHours > 0 ? act.sleepHours : existing.sleepHours,
          heartRateBpm: avgBpm !== undefined ? avgBpm : existing.heartRateBpm,
          waterMl: act && act.hydrationMl > 0 ? act.hydrationMl : existing.waterMl,
          dataSource: existing.dataSource || bio.dataSource || defaultSource,
          dataKind: existing.dataKind || 'measured',
          dataOrigin: bio.dataOrigin || existing.dataOrigin,
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      } else {
        // NOVO REGISTRO: NUNCA FABRICAR VALORES ARTIFICIAIS DE SINTOMAS (energy, libido, etc. devem ser undefined)
        mergedLogs.push({
          id: 'symp_hc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          date: dateStr,
          weightKg: bio.weightKg,
          bodyFatPercent: bio.bodyFatPercent,
          glucoseMgDl: bio.glucoseMgDl,
          steps: resolvedSteps,
          sleepHours: act && act.sleepHours > 0 ? act.sleepHours : undefined,
          heartRateBpm: avgBpm,
          waterMl: act && act.hydrationMl > 0 ? act.hydrationMl : undefined,
          heightCm,
          dataSource: bio.dataSource || defaultSource,
          dataKind: 'measured',
          dataOrigin: bio.dataOrigin,
          notes: bio.dataOrigin ? `Sincronizado via Health Connect (${bio.dataOrigin})` : 'Sincronizado via Health Connect',
          updatedAt: new Date().toISOString(),
        });
        createdCount++;
      }
    });

    // Manter logs existentes que não tiveram dados novos no intervalo
    for (const [dateStr, existingLog] of existingByDate.entries()) {
      if (!biometricsMap.has(dateStr)) {
        mergedLogs.push(existingLog);
      }
    }

    // Ordenar cronologicamente decrescente
    mergedLogs.sort((a, b) => b.date.localeCompare(a.date));

    return {
      symptomLogs: mergedLogs,
      dailyActivities,
      createdCount,
      updatedCount,
    };
  },
};
