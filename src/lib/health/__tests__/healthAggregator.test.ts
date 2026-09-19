import { describe, it, expect } from 'vitest';
import { healthAggregator } from '../healthAggregator';
import { ProviderMetricsPayload } from '../types';

describe('healthAggregator', () => {
  it('deduplicates multi-origin steps by taking dominant source max rather than naive 2x sum', () => {
    const payload: ProviderMetricsPayload = {
      steps: [
        { startTime: '2026-09-18T08:00:00Z', endTime: '2026-09-18T12:00:00Z', count: 5000, dataOrigin: 'com.sec.android.app.shealth' },
        { startTime: '2026-09-18T13:00:00Z', endTime: '2026-09-18T18:00:00Z', count: 3000, dataOrigin: 'com.sec.android.app.shealth' },
        // Google Fit also recorded 7500 steps for the same day
        { startTime: '2026-09-18T08:00:00Z', endTime: '2026-09-18T20:00:00Z', count: 7500, dataOrigin: 'com.google.android.apps.fitness' },
      ],
    };

    const result = healthAggregator.aggregateMetrics(payload, []);
    expect(result.dailyActivities).toHaveLength(1);
    const day = result.dailyActivities[0];
    // Shealth = 8000, Google Fit = 7500. Dominant origin should be 8000 (not 15500)
    expect(day.steps).toBe(8000);
    expect(day.dataOrigin).toBeDefined();
  });

  it('pairs weight and body fat within 30-minute proximity window into a single log', () => {
    const payload: ProviderMetricsPayload = {
      weights: [
        { time: '2026-09-18T07:00:00Z', weightKg: 81.5, dataOrigin: 'com.withings.wiscale2' }
      ],
      bodyFat: [
        { time: '2026-09-18T07:05:00Z', percentage: 14.8, dataOrigin: 'com.withings.wiscale2' }
      ]
    };

    const result = healthAggregator.aggregateMetrics(payload, []);
    expect(result.symptomLogs).toHaveLength(1);
    const log = result.symptomLogs[0];
    expect(log.weightKg).toBe(81.5);
    expect(log.bodyFatPercent).toBe(14.8);
    expect(log.dataOrigin).toBe('com.withings.wiscale2');
    expect(log.dataKind).toBe('measured');
  });

  it('never injects synthetic subjective ratings (energy, libido, mood) for automated syncs', () => {
    const payload: ProviderMetricsPayload = {
      weights: [
        { time: '2026-09-18T07:00:00Z', weightKg: 80.0, dataOrigin: 'health_connect' }
      ]
    };

    const result = healthAggregator.aggregateMetrics(payload, []);
    const log = result.symptomLogs[0];
    expect(log.energy).toBeUndefined();
    expect(log.libido).toBeUndefined();
    expect(log.mood).toBeUndefined();
    expect(log.sleep).toBeUndefined();
    expect(log.waterRetention).toBeUndefined();
    expect(log.acne).toBeUndefined();
    // Audit notes should exist indicating origin
    expect(log.notes).toContain('Sincronizado via Health Connect');
  });

  it('discards days with zero biometrics so no ghost empty rows appear in table', () => {
    const payload: ProviderMetricsPayload = {
      steps: [
        { startTime: '2026-09-15T10:00:00Z', endTime: '2026-09-15T11:00:00Z', count: 2000 }
      ]
      // No weights or glucose
    };

    const result = healthAggregator.aggregateMetrics(payload, []);
    // Steps are saved in dailyActivities
    expect(result.dailyActivities).toHaveLength(1);
    // But symptomLogs (table rows) must NOT have empty ghost entries
    expect(result.symptomLogs).toHaveLength(0);
  });
});
