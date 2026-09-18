import { SymptomLog, DailyActivitySummary, ClinicalDataSource, HealthDataKind } from '../../types';

export type HealthMetricType =
  | 'weight'
  | 'body_fat'
  | 'glucose'
  | 'steps'
  | 'sleep'
  | 'heart_rate'
  | 'hydration';

export interface RawHealthMetricItem {
  time?: string;
  startTime?: string;
  endTime?: string;
  weightKg?: number;
  weight?: { inKilograms?: number };
  percentage?: number;
  value?: number;
  bodyFatPercent?: number;
  glucoseMgDl?: number;
  level?: number;
  count?: number;
  hours?: number;
  bpm?: number;
  volumeLiters?: number;
  volumeMl?: number;
  dataOrigin?: string;
  recordId?: string;
}

export interface ProviderMetricsPayload {
  weights?: RawHealthMetricItem[];
  records?: RawHealthMetricItem[];
  bodyFat?: RawHealthMetricItem[];
  glucose?: RawHealthMetricItem[];
  steps?: RawHealthMetricItem[];
  sleep?: RawHealthMetricItem[];
  heartRates?: RawHealthMetricItem[];
  hydration?: RawHealthMetricItem[];
}

export interface HealthDataProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  requestPermissions?(): Promise<{ granted: boolean; permissions?: string[] }>;
  fetchMetrics(timeRange: { startTime: string; endTime: string }): Promise<ProviderMetricsPayload>;
}

export interface HealthSyncResult {
  success: boolean;
  newLogs: SymptomLog[];
  dailyActivities?: DailyActivitySummary[];
  count: number;
  message: string;
  lastSyncAt: string;
  hasOAuthToken: boolean;
}
