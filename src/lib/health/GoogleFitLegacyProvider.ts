import { supabase, isSupabaseConfigured } from '../supabase';
import { HealthDataProvider, ProviderMetricsPayload } from './types';
import { toLocalDateString } from '../dateUtils';

/**
 * @deprecated Provedor legado Google Fit REST API.
 * Mantido exclusivamente para compatibilidade temporária na Web ou contas legadas.
 * Não adicionar novas funcionalidades aqui. Preferir HealthConnectProvider no Android.
 */
export class GoogleFitLegacyProvider implements HealthDataProvider {
  id = 'google_fit';
  name = 'Google Fit (Legado REST)';

  async isAvailable(): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      return Boolean(session?.provider_token);
    } catch {
      return false;
    }
  }

  async fetchMetrics(timeRange: { startTime: string; endTime: string }): Promise<ProviderMetricsPayload> {
    if (!isSupabaseConfigured()) return {};

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const providerToken = session?.provider_token;
      if (!providerToken) return {};

      const startTimeMillis = new Date(timeRange.startTime).getTime();
      const endTimeMillis = new Date(timeRange.endTime).getTime();

      console.warn('[GoogleFitLegacyProvider] Consultando dados via Google Fit REST API (Legado)...');
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

      if (!response.ok) return {};
      const data = await response.json();

      const weights: any[] = [];
      const bodyFat: any[] = [];
      const steps: any[] = [];

      if (data.bucket) {
        data.bucket.forEach((b: any) => {
          const dateStr = toLocalDateString(parseInt(b.startTimeMillis));
          if (!dateStr) return;

          const weightPoint = b.dataset?.[0]?.point?.[0];
          const fatPoint = b.dataset?.[1]?.point?.[0];
          const stepPoint = b.dataset?.[2]?.point?.[0];

          if (weightPoint?.value?.[0]?.fpVal) {
            weights.push({
              time: new Date(parseInt(b.startTimeMillis)).toISOString(),
              weightKg: parseFloat(weightPoint.value[0].fpVal.toFixed(1)),
              dataOrigin: 'com.google.android.apps.fitness',
            });
          }

          if (fatPoint?.value?.[0]?.fpVal) {
            let fVal = parseFloat(fatPoint.value[0].fpVal.toFixed(1));
            if (fVal <= 1.0) fVal = fVal * 100;
            bodyFat.push({
              time: new Date(parseInt(b.startTimeMillis)).toISOString(),
              percentage: fVal,
              dataOrigin: 'com.google.android.apps.fitness',
            });
          }

          if (stepPoint?.value?.[0]?.intVal) {
            steps.push({
              startTime: new Date(parseInt(b.startTimeMillis)).toISOString(),
              count: stepPoint.value[0].intVal,
              dataOrigin: 'com.google.android.apps.fitness',
            });
          }
        });
      }

      return { weights, bodyFat, steps };
    } catch (err) {
      console.error('[GoogleFitLegacyProvider] Erro ao consultar REST:', err);
      return {};
    }
  }
}

export const googleFitLegacyProvider = new GoogleFitLegacyProvider();
