import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SymptomLog, UserProfile, Injection, GoogleHealthSyncConfig } from '../../types';
import { googleFitSync, HealthImportEntry } from '../../lib/googleFitSync';
import { storage } from '../../lib/storage';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { registerPlugin, Capacitor } from '@capacitor/core';

interface HealthConnectPlugin {
  checkAvailability(): Promise<{ available: boolean }>;
  requestPermissions(options?: { permissions?: string[] }): Promise<any>;
  checkPermissions(): Promise<any>;
  openHealthConnectSettings(): Promise<void>;
  readRecords(options: any): Promise<any>;
}

const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');
import { 
  Heart, 
  Plus, 
  Calendar, 
  Smile, 
  Moon, 
  Flame, 
  Droplets, 
  Trash2, 
  Gauge, 
  Scale, 
  Ruler, 
  TrendingDown, 
  TrendingUp, 
  Download, 
  Upload,
  Smartphone, 
  Target, 
  CheckCircle2, 
  Info, 
  X, 
  Check, 
  Activity,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  Link2,
  Unlink,
  AlertCircle
} from 'lucide-react';

interface SymptomTrackerProps {
  symptoms: SymptomLog[];
  onSaveSymptom: (log: SymptomLog) => void;
  onDeleteSymptom: (id: string) => void;
  profile?: UserProfile;
  onSaveProfile?: (profile: UserProfile) => void;
  injections?: Injection[];
}

export function calculateIMC(weightKg: number, heightCm: number): { 
  value: number; 
  label: string; 
  color: string; 
  badgeBg: string;
} {
  if (!weightKg || !heightCm || heightCm <= 0) {
    return { value: 0, label: 'Indefinido', color: 'text-slate-400', badgeBg: 'bg-slate-800 text-slate-300' };
  }
  const heightM = heightCm / 100;
  const imc = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  if (imc < 18.5) return { value: imc, label: 'Abaixo do peso', color: 'text-sky-400', badgeBg: 'bg-sky-950/70 border border-sky-800/60 text-sky-300' };
  if (imc < 25.0) return { value: imc, label: 'Peso Saudável', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300' };
  if (imc < 30.0) return { value: imc, label: 'Sobrepeso', color: 'text-amber-400', badgeBg: 'bg-amber-950/70 border border-amber-800/60 text-amber-300' };
  if (imc < 35.0) return { value: imc, label: 'Obesidade Grau I', color: 'text-orange-400', badgeBg: 'bg-orange-950/70 border border-orange-800/60 text-orange-300' };
  if (imc < 40.0) return { value: imc, label: 'Obesidade Grau II', color: 'text-rose-400', badgeBg: 'bg-rose-950/70 border border-rose-800/60 text-rose-300' };
  return { value: imc, label: 'Obesidade Grau III', color: 'text-red-400', badgeBg: 'bg-red-950/70 border border-red-800/60 text-red-300' };
}

export const SymptomTracker: React.FC<SymptomTrackerProps> = ({
  symptoms,
  onSaveSymptom,
  onDeleteSymptom,
  profile,
  onSaveProfile,
  injections = [],
}) => {
  // Navigation tabs: 'weight' | 'symptoms' | 'health_sync'
  const [activeTab, setActiveTab] = useState<'weight' | 'symptoms' | 'health_sync'>('weight');

  // Modals
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  // Height and Target Weight
  const currentHeight = profile?.heightCm || 175;
  const [heightInput, setHeightInput] = useState<string>(String(currentHeight));
  const [targetWeightInput, setTargetWeightInput] = useState<string>(profile?.targetWeightKg ? String(profile.targetWeightKg) : '');

  // Weight & Body Measurements Form State
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightValue, setWeightValue] = useState<string>('82.0');
  const [waistCm, setWaistCm] = useState<string>('');
  const [hipCm, setHipCm] = useState<string>('');
  const [armCm, setArmCm] = useState<string>('');
  const [thighCm, setThighCm] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [weightNotes, setWeightNotes] = useState<string>('');

  // Symptoms Form State
  const [sympDate, setSympDate] = useState(new Date().toISOString().slice(0, 10));
  const [energy, setEnergy] = useState<number>(4);
  const [libido, setLibido] = useState<number>(4);
  const [mood, setMood] = useState<number>(4);
  const [sleep, setSleep] = useState<number>(4);
  const [acne, setAcne] = useState<number>(1);
  const [waterRetention, setWaterRetention] = useState<number>(1);
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [sympNotes, setSympNotes] = useState<string>('');

  // Google Account Sync State
  const [googleConfig, setGoogleConfig] = useState<GoogleHealthSyncConfig>(() => storage.getGoogleHealthConfig());
  const [googleEmailInput, setGoogleEmailInput] = useState<string>(() => {
    const cfg = storage.getGoogleHealthConfig();
    if (cfg.email) return cfg.email;
    if (profile?.phone && profile.phone.includes('@')) return profile.phone;
    return '';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hasOAuthToken, setHasOAuthToken] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [quickImportDate, setQuickImportDate] = useState(new Date().toISOString().slice(0, 10));
  const [quickImportWeight, setQuickImportWeight] = useState('');
  const [quickImportFat, setQuickImportFat] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkGoogleAuth = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isGoogle = session?.user?.app_metadata?.provider === 'google' ||
                         session?.user?.identities?.some((id: any) => id.provider === 'google') ||
                         !!session?.provider_token;
        setIsGoogleUser(Boolean(isGoogle));
        if (isGoogle) {
          setHasOAuthToken(true);
          if (session?.user?.email) {
            const currentCfg = storage.getGoogleHealthConfig();
            if (!currentCfg.connected || currentCfg.email !== session.user.email) {
              const updated = googleFitSync.linkAccountEmail(session.user.email);
              setGoogleConfig(updated);
            }
          }
        } else {
          const hasToken = await googleFitSync.hasProviderToken();
          setHasOAuthToken(hasToken);
        }
      } catch (err) {
        console.warn('Error checking google session in SymptomTracker:', err);
      }
    };

    checkGoogleAuth();

    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const isGoogle = session?.user?.app_metadata?.provider === 'google' ||
                         session?.user?.identities?.some((id: any) => id.provider === 'google') ||
                         !!session?.provider_token;
        setIsGoogleUser(Boolean(isGoogle));
        if (isGoogle) {
          setHasOAuthToken(true);
          if (session?.user?.email) {
            const currentCfg = storage.getGoogleHealthConfig();
            if (!currentCfg.connected || currentCfg.email !== session.user.email) {
              const updated = googleFitSync.linkAccountEmail(session.user.email);
              setGoogleConfig(updated);
            }
          }
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  // Filter and sort weight entries
  const weightEntries = useMemo(() => {
    return symptoms
      .filter(s => s.weightKg && s.weightKg > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [symptoms]);

  const latestWeight = weightEntries[0]?.weightKg || profile?.weightKg || 82.0;
  const oldestWeight = weightEntries[weightEntries.length - 1]?.weightKg || latestWeight;
  const weightChange = latestWeight - oldestWeight;
  const currentIMC = calculateIMC(latestWeight, currentHeight);

  // Realtime IMC for modal calculator
  const previewWeightNum = parseFloat(weightValue) || 0;
  const previewHeightNum = parseFloat(heightInput) || currentHeight;
  const previewIMC = calculateIMC(previewWeightNum, previewHeightNum);

  // Save Weight & Measurements
  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const wNum = parseFloat(weightValue);
    if (!wNum || isNaN(wNum)) return;

    const hNum = parseFloat(heightInput);
    if (hNum && onSaveProfile && profile) {
      onSaveProfile({
        ...profile,
        heightCm: hNum,
        weightKg: wNum,
      });
    }

    const newLog: SymptomLog = {
      id: 'symp_' + Date.now(),
      date: weightDate,
      weightKg: wNum,
      heightCm: hNum || currentHeight,
      waistCm: waistCm ? parseFloat(waistCm) : undefined,
      hipCm: hipCm ? parseFloat(hipCm) : undefined,
      armCm: armCm ? parseFloat(armCm) : undefined,
      thighCm: thighCm ? parseFloat(thighCm) : undefined,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : undefined,
      notes: weightNotes.trim() || undefined,
      energy: 4,
      libido: 4,
      mood: 4,
      sleep: 4,
      acne: 1,
      waterRetention: 1,
    };

    onSaveSymptom(newLog);
    setIsWeightModalOpen(false);
  };

  // Save Symptoms & Well-being
  const handleSaveSymptoms = (e: React.FormEvent) => {
    e.preventDefault();

    const newLog: SymptomLog = {
      id: 'symp_' + Date.now(),
      date: sympDate,
      energy,
      libido,
      mood,
      sleep,
      acne,
      waterRetention,
      bloodPressureSystolic: systolic ? parseInt(systolic) : undefined,
      bloodPressureDiastolic: diastolic ? parseInt(diastolic) : undefined,
      notes: sympNotes.trim() || undefined,
    };

    onSaveSymptom(newLog);
    setIsSymptomModalOpen(false);
  };

  // Save Target Weight
  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveProfile && profile) {
      onSaveProfile({
        ...profile,
        targetWeightKg: targetWeightInput ? parseFloat(targetWeightInput) : undefined,
        heightCm: heightInput ? parseFloat(heightInput) : currentHeight,
      });
    }
    setIsTargetModalOpen(false);
  };

  // Connect by entering Google Account Email
  const handleConnectGoogleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setSyncFeedback({ type: 'error', message: 'Informe um endereço de e-mail do Google válido.' });
      return;
    }

    const newConfig = googleFitSync.linkAccountEmail(cleanEmail);
    setGoogleConfig(newConfig);

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await googleFitSync.syncData(symptoms, latestWeight, currentHeight);
      if (res.newLogs.length > 0) {
        res.newLogs.forEach(log => onSaveSymptom(log));
      }
      setSyncFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      setGoogleConfig(storage.getGoogleHealthConfig());
      setHasOAuthToken(res.hasOAuthToken);
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: 'Erro na sincronização: ' + err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync Now with connected Google Account / Health Connect
  // Sync Now with connected Google Account / Health Connect
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      console.log('[Health Connect] Iniciando fluxo de sincronização...');

      // 1. Chamar o método de solicitar permissões nativas (requestPermissions) ANTES de tentar executar o readRecords
      if (Capacitor.isNativePlatform()) {
        try {
          console.log('[Health Connect] Disparando requestPermissions nativo do Capacitor para exibir pop-up...');
          const permResult = await HealthConnect.requestPermissions({
            permissions: ['weight', 'bodyFat', 'height']
          });
          console.log('[Health Connect] Pop-up respondido pelo usuário:', permResult);
        } catch (permErr: any) {
          console.error('[Health Connect Error] Erro ao disparar pop-up de permissão nativa:', permErr);
        }
      }

      // 2. Definir janela de tempo de exatamente 60 dias atrás até agora em formato ISO 8601
      const startTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();

      let hcRecords: any[] = [];
      if (Capacitor.isNativePlatform()) {
        try {
          console.log('[Health Connect] Executando readRecords (janela de 60 dias ISO):', startTime, 'até', endTime);
          const result = await HealthConnect.readRecords({
            type: 'Weight',
            timeRangeFilter: {
              type: 'between',
              startTime,
              endTime,
            }
          });

          // Log visual de debug solicitado pelo usuário
          const count = result?.records?.length ?? 0;
          alert("Registros encontrados: " + JSON.stringify(count));
          console.log('[Health Connect] Resultado de readRecords:', result);

          hcRecords = result?.records || [];
        } catch (readErr: any) {
          console.error('[Health Connect Error] Erro ao executar readRecords:', readErr);
          alert("Erro no readRecords: " + (readErr?.message || JSON.stringify(readErr)));
        }
      }

      // 3. Executar a busca / leitura de dados (Health Connect + Google Fit)
      const res = await googleFitSync.syncData(symptoms, latestWeight, currentHeight, undefined, hcRecords);
      if (res.newLogs.length > 0) {
        res.newLogs.forEach(log => onSaveSymptom(log));
      }
      if (res.success || !isGoogleUser) {
        setSyncFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      }
      setGoogleConfig(storage.getGoogleHealthConfig());
      setHasOAuthToken(res.hasOAuthToken || isGoogleUser);
    } catch (err: any) {
      console.error('[Health Connect Error] Erro ao sincronizar Health Connect:', err);
      setSyncFeedback({ 
        type: 'error', 
        message: `Falha ao buscar no Health Connect: ${err?.message || 'Erro inesperado'}. Verifique as permissões de saúde nas configurações do Android.` 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect via Google OAuth Button
  const handleOAuthLogin = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await googleFitSync.connectOAuth();
      if (!res.success) {
        setSyncFeedback({ 
          type: 'error', 
          message: res.error || 'Popup de autenticação não disponível. Conecte seu email e utilize a importação direta abaixo.' 
        });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };


  // Import CSV from Fitbit / Takeout / Balança
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      try {
        const parsed = googleFitSync.parseFitbitCsv(content, currentHeight);
        if (parsed.length === 0) {
          setSyncFeedback({
            type: 'error',
            message: 'Nenhum registro de peso válido encontrado no arquivo CSV. Verifique se o arquivo possui colunas com datas e pesos.'
          });
          return;
        }
        parsed.forEach(log => onSaveSymptom(log));
        setSyncFeedback({
          type: 'success',
          message: `Sucesso! ${parsed.length} pesagens históricas importadas do arquivo CSV e sincronizadas!`
        });
      } catch (err: any) {
        setSyncFeedback({
          type: 'error',
          message: 'Erro ao processar arquivo CSV: ' + err.message
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Quick retroactive weigh-in entry
  const handleQuickAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(quickImportWeight);
    if (!w || isNaN(w)) return;

    const entry: HealthImportEntry = {
      date: quickImportDate,
      weightKg: w,
      bodyFatPercent: quickImportFat ? parseFloat(quickImportFat) : undefined,
      notes: 'Registro rápido (Fitbit/Health)'
    };

    const logs = googleFitSync.createLogsFromEntries([entry], symptoms, currentHeight);
    logs.forEach(log => onSaveSymptom(log));

    if (onSaveProfile && profile) {
      onSaveProfile({
        ...profile,
        weightKg: w,
        bodyFatPercent: entry.bodyFatPercent !== undefined ? entry.bodyFatPercent : profile.bodyFatPercent
      });
    }

    setQuickImportWeight('');
    setQuickImportFat('');
    setSyncFeedback({
      type: 'success',
      message: `Pesagem de ${w} kg em ${new Date(quickImportDate).toLocaleDateString('pt-BR')} adicionada com sucesso!`
    });
  };

  // Disconnect Google Account
  const handleDisconnect = () => {
    const newConfig = googleFitSync.disconnect();
    setGoogleConfig(newConfig);
    setHasOAuthToken(false);
    setSyncFeedback({ type: 'success', message: 'Conta Google desconectada com sucesso.' });
  };

  // Export JSON
  const handleExportJson = () => {
    const payload = {
      app: 'SteadySync Protocol Tracker',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        name: profile?.name,
        gender: profile?.gender,
        heightCm: currentHeight,
        targetWeightKg: profile?.targetWeightKg,
      },
      healthRecords: {
        weight: weightEntries.map(w => ({
          type: 'WeightRecord',
          timestamp: new Date(w.date).toISOString(),
          weightKg: w.weightKg,
          calculatedBmi: w.weightKg ? (w.weightKg / Math.pow(currentHeight / 100, 2)).toFixed(1) : null,
          bodyFatPercent: w.bodyFatPercent || null,
          waistCm: w.waistCm || null,
          hipCm: w.hipCm || null,
          notes: w.notes || null,
        })),
        bloodPressure: symptoms.filter(s => s.bloodPressureSystolic).map(s => ({
          type: 'BloodPressureRecord',
          timestamp: new Date(s.date).toISOString(),
          systolic: s.bloodPressureSystolic,
          diastolic: s.bloodPressureDiastolic,
          unit: 'mmHg',
        })),
        injections: injections.map(inj => ({
          type: 'MedicationEvent',
          compoundId: inj.compoundId,
          timestamp: inj.date,
          dose: inj.dose,
          route: inj.route,
          site: inj.site,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steadysync_google_health_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Data', 'Peso (kg)', 'Altura (cm)', 'IMC', 'Cintura (cm)', 'Quadril (cm)', 'Braço (cm)', 'Coxa (cm)', 'Gordura (%)', 'PA Sistólica', 'PA Diastólica', 'Notas'];
    const rows = symptoms.map(s => {
      const imc = s.weightKg ? (s.weightKg / Math.pow(currentHeight / 100, 2)).toFixed(1) : '';
      return [
        s.date,
        s.weightKg || '',
        currentHeight,
        imc,
        s.waistCm || '',
        s.hipCm || '',
        s.armCm || '',
        s.thighCm || '',
        s.bodyFatPercent || '',
        s.bloodPressureSystolic || '',
        s.bloodPressureDiastolic || '',
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steadysync_dados_saude_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRatingButtons = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    icon: React.ReactNode,
    invertColors = false
  ) => (
    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-bold text-white text-xs">{value}/5</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(rating => {
          const isSelected = value === rating;
          let btnColor = 'bg-slate-900 text-slate-400 border-slate-800';
          if (isSelected) {
            if (invertColors) {
              btnColor = rating >= 4 
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm' 
                : 'bg-amber-600 text-white border-amber-500 shadow-sm';
            } else {
              btnColor = rating >= 4 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                : 'bg-blue-600 text-white border-blue-500 shadow-sm';
            }
          }

          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${btnColor} cursor-pointer`}
            >
              {rating}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Sub-navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('weight')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'weight'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Peso & IMC</span>
          </button>

          <button
            onClick={() => setActiveTab('symptoms')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'symptoms'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Bem-Estar & Sintomas</span>
          </button>

          <button
            onClick={() => setActiveTab('health_sync')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'health_sync'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Google Health {googleConfig.connected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />}</span>
          </button>
        </div>

        {/* Quick Action Button */}
        {activeTab === 'weight' && (
          <button
            onClick={() => setIsWeightModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Peso & Medidas</span>
          </button>
        )}

        {activeTab === 'symptoms' && (
          <button
            onClick={() => setIsSymptomModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Check-in de Sintomas</span>
          </button>
        )}
      </div>

      {/* TAB 1: PESO, IMC & MEDIDAS */}
      {activeTab === 'weight' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Peso Atual */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-blue-400" />
                  Peso Atual
                </span>
                {weightEntries.length > 1 && (
                  <span className={`flex items-center gap-0.5 text-[11px] font-bold ${weightChange <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {weightChange <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    {Math.abs(weightChange).toFixed(1)} kg
                  </span>
                )}
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {latestWeight.toFixed(1)} <span className="text-sm font-semibold text-slate-400">kg</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {weightEntries[0] ? `Última pesagem: ${weightEntries[0].date}` : 'Definido no perfil'}
                </div>
              </div>
            </div>

            {/* 2. IMC & Faixa */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  IMC (Índice)
                </span>
                <span className="text-[10px] text-slate-400">Alt: {currentHeight} cm</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
                  <span>{currentIMC.value}</span>
                  <span className="text-xs font-semibold text-slate-400">kg/m²</span>
                </div>
                <div className="mt-1">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${currentIMC.badgeBg}`}>
                    {currentIMC.label}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Meta de Peso */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-400" />
                  Meta de Peso
                </span>
                <button
                  onClick={() => setIsTargetModalOpen(true)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                >
                  {profile?.targetWeightKg ? 'Alterar' : 'Definir'}
                </button>
              </div>
              <div className="mt-2">
                {profile?.targetWeightKg ? (
                  <>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {profile.targetWeightKg.toFixed(1)} <span className="text-sm font-semibold text-slate-400">kg</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {latestWeight > profile.targetWeightKg 
                        ? `Restam ${(latestWeight - profile.targetWeightKg).toFixed(1)} kg para o objetivo`
                        : '🎉 Meta alcançada com sucesso!'}
                    </div>
                  </>
                ) : (
                  <div className="py-1">
                    <button
                      onClick={() => setIsTargetModalOpen(true)}
                      className="text-xs text-slate-400 hover:text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors"
                    >
                      + Definir meta de peso
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Medidas Mais Recentes */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-amber-400" />
                  Medidas
                </span>
                {weightEntries[0]?.waistCm && (
                  <span className="text-[10px] text-slate-400">Cintura: {weightEntries[0].waistCm} cm</span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Gordura (BF):</span>
                  <span className="font-bold text-white">
                    {weightEntries[0]?.bodyFatPercent ? `${weightEntries[0].bodyFatPercent}%` : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Braço:</span>
                  <span className="font-bold text-white">
                    {weightEntries[0]?.armCm ? `${weightEntries[0].armCm} cm` : '--'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Weight Evolution List & Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Histórico de Pesagens & Medidas Corporais
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhamento da evolução com GLP-1, peptídeos e protocolos
                </p>
              </div>
              <button
                onClick={() => setIsWeightModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {weightEntries.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6">
                <Scale className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma pesagem registrada ainda</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Clique no botão acima para registrar seu peso inicial, altura e medidas corporais. O cálculo do IMC será feito automaticamente.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Data</th>
                      <th className="py-2.5 px-3 font-semibold">Peso (kg)</th>
                      <th className="py-2.5 px-3 font-semibold">IMC</th>
                      <th className="py-2.5 px-3 font-semibold">Classificação</th>
                      <th className="py-2.5 px-3 font-semibold">Medidas</th>
                      <th className="py-2.5 px-3 font-semibold">Origem / Observações</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {weightEntries.map(entry => {
                      const entryIMC = calculateIMC(entry.weightKg || 0, entry.heightCm || currentHeight);
                      const isGoogleSynced = entry.notes?.includes('Google Fit');

                      return (
                        <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 font-medium text-white whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{entry.date}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold text-white text-sm">
                            {entry.weightKg?.toFixed(1)} kg
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-200">
                            {entryIMC.value}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${entryIMC.badgeBg}`}>
                              {entryIMC.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {[
                              entry.waistCm ? `Cintura: ${entry.waistCm}cm` : null,
                              entry.bodyFatPercent ? `BF: ${entry.bodyFatPercent}%` : null,
                              entry.armCm ? `Braço: ${entry.armCm}cm` : null,
                            ].filter(Boolean).join(' • ') || '--'}
                          </td>
                          <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                            {isGoogleSynced ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                                <Smartphone className="w-3 h-3" />
                                Google Fit
                              </span>
                            ) : (
                              entry.notes || '--'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onDeleteSymptom(entry.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Excluir este registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SINTOMAS & BEM-ESTAR */}
      {activeTab === 'symptoms' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                Diário de Sintomas & Bem-Estar
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitore disposição, libido, retenção hídrica, humor e pressão arterial
              </p>
            </div>
            <button
              onClick={() => setIsSymptomModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Registro</span>
            </button>
          </div>

          {symptoms.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <Smile className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Nenhum sintoma registrado ainda</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Registre como você está se sentindo para correlacionar picos hormonais com sua disposição e sono.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {symptoms.map(log => (
                <div 
                  key={log.id} 
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">{log.date}</span>
                    </div>
                    <button
                      onClick={() => onDeleteSymptom(log.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80 flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" /> Energia
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5">{log.energy}/5</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80 flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400" /> Libido
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5">{log.libido}/5</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80 flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Moon className="w-3 h-3 text-indigo-400" /> Sono
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5">{log.sleep}/5</span>
                    </div>
                  </div>

                  {(log.bloodPressureSystolic || log.waterRetention > 2) && (
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/60">
                      {log.bloodPressureSystolic && (
                        <span className="text-slate-300 font-medium">
                          PA: {log.bloodPressureSystolic}/{log.bloodPressureDiastolic} mmHg
                        </span>
                      )}
                      {log.waterRetention > 2 && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Retenção {log.waterRetention}/5
                        </span>
                      )}
                    </div>
                  )}

                  {log.notes && (
                    <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                      "{log.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GOOGLE HEALTH & SYNC CENTER (DIRECT ACCOUNT INTEGRATION) */}
      {activeTab === 'health_sync' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Main Account Connection Hero Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg p-2.5 shrink-0">
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Google Fit & Health Connect</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      Sincronização Direta
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Conecte sua conta para importar automaticamente pesagens da sua balança inteligente e do app Google Fit
                  </p>
                </div>
              </div>

              {googleConfig.connected && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl border border-slate-800 transition-colors cursor-pointer"
                    title="Desconectar conta Google"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Status da Conexão & Formulários de Vinculação */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              {googleConfig.connected || isGoogleUser ? (
                /* ESTADO: CONECTADO */
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>Conta Vinculada:</span>
                          <span className="text-emerald-300 font-mono">{googleConfig.email || (isGoogleUser ? 'Google Conectado' : '')}</span>
                          {(hasOAuthToken || isGoogleUser) ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                              OAuth Cloud Ativo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
                              E-mail Vinculado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {googleConfig.lastSyncAt 
                            ? `Última sincronização: ${new Date(googleConfig.lastSyncAt).toLocaleString('pt-BR')}`
                            : 'Pronto para sincronizar'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-300 font-medium">Auto-sincronizar:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = googleFitSync.toggleAutoSync(!googleConfig.autoSync);
                            setGoogleConfig(updated);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            googleConfig.autoSync ? 'bg-emerald-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              googleConfig.autoSync ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-rose-500/40 hover:bg-rose-950/30 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Trocar Conta
                      </button>
                    </div>
                  </div>

                  {!hasOAuthToken && !isGoogleUser && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-white">Ativar Conexão Direta de Nuvem Google</span>
                        <p className="text-[11px] text-slate-400">Autorize o token OAuth com sua conta Google configurada no Supabase.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOAuthLogin}
                        disabled={isSyncing}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <span>Autorizar OAuth Google</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ESTADO: DESCONECTADO - FORMS PARA INFORMAR CONTA */
                <div className="space-y-4">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-cyan-400" />
                    <span>Conecte sua Conta para Sincronizar</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* OPÇÃO 1: INFORMAR POR E-MAIL */}
                    <form onSubmit={handleConnectGoogleEmail} className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Link2 className="w-4 h-4 text-cyan-400" />
                          Informar E-mail da Conta Google
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Digite o endereço de e-mail da sua conta Google ou do app Fitbit para vincular ao aplicativo.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="email"
                          required
                          placeholder="seu.email@gmail.com"
                          value={googleEmailInput}
                          onChange={e => setGoogleEmailInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isSyncing}
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Vincular Conta por E-mail</span>
                        </button>
                      </div>
                    </form>

                    {/* OPÇÃO 2: LOGIN DIRETO COM GOOGLE OAUTH */}
                    <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          Conectar com 1 Clique (Google OAuth)
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Acesse via autenticação oficial da Google habilitada no seu Supabase para sincronização em nuvem.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleOAuthLogin}
                        disabled={isSyncing}
                        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <span>Entrar com a Conta Google</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback de Sincronização */}
              {syncFeedback && !(isGoogleUser && syncFeedback.type === 'error' && syncFeedback.message.toLowerCase().includes('token oauth')) && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  syncFeedback.type === 'success' 
                    ? 'bg-emerald-900/40 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-900/40 border border-rose-500/40 text-rose-200'
                }`}>
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="leading-relaxed">{syncFeedback.message}</span>
                </div>
              )}
            </div>

            {/* SEÇÃO PRINCIPAL: IMPORTAÇÃO INTELIGENTE FITBIT & GOOGLE HEALTH */}
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Importação Direta do Fitbit & Google Health Connect</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CARD 1: SINCRONIZAÇÃO NATIVA HEALTH CONNECT */}
                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Google Health Connect
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        Nativo Android
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Lê diretamente o banco de dados de saúde do Android alimentado pelo seu app Fitbit e balanças digitais.
                    </p>
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1">
                      <div className="text-slate-300 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Pesagens e Composição Corporal</span>
                      </div>
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-teal-400" />
                        <span>Frequência Cardíaca e Hidratação</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Buscando Dados no Health...' : 'Buscar no Health Connect'}</span>
                  </button>
                </div>

                {/* CARD 2: IMPORTADOR DE ARQUIVO CSV DO FITBIT / TAKEOUT */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-blue-400" />
                        Arquivo CSV do Fitbit
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60">
                        Histórico
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Exporte o histórico de peso no app Fitbit ou Google Takeout e selecione o arquivo CSV para importar todas as medições de meses passados de uma vez.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                    <span>Carregar Arquivo CSV</span>
                  </button>
                </div>

                {/* CARD 3: ADICIONAR PESAGEM RETROATIVA RÁPIDA */}
                <form onSubmit={handleQuickAddWeight} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-cyan-400" />
                      Pesagem Retroativa Rápida
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Adicione qualquer pesagem anterior com facilidade:
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        required
                        value={quickImportDate}
                        onChange={e => setQuickImportDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <input
                        type="number"
                        step="0.1"
                        required
                        placeholder="Peso (kg)"
                        value={quickImportWeight}
                        onChange={e => setQuickImportWeight(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="% Gordura Opcional (ex: 24)"
                      value={quickImportFat}
                      onChange={e => setQuickImportFat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Salvar Pesagem</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Connected Balanças & Health Connect Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Como funciona com sua Balança Digital
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Balanças inteligentes das marcas <strong>Xiaomi Mi Body</strong>, <strong>Withings</strong>, <strong>Renpho</strong>, <strong>Garmin</strong> e <strong>Omron</strong> gravam suas pesagens automaticamente no <strong>Google Health Connect / Google Fit</strong> via Bluetooth.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ao conectar sua conta Google aqui no SteadySync, essas medições chegam automaticamente ao seu gráfico, correlacionando a evolução de peso com suas aplicações de peptídeos.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-400" />
                Exportações Médicas (Opcional)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Precisa levar seus dados para o seu médico, endocrinologista ou nutricionista? Baixe uma planilha completa ou arquivo de backup a qualquer momento.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Baixar Planilha (.CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Arquivo (.JSON)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR PESO & MEDIDAS */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Peso & Medidas</h3>
                  <p className="text-xs text-slate-400">Calcula IMC e atualiza sua evolução corporal</p>
                </div>
              </div>
              <button
                onClick={() => setIsWeightModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveWeight} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Peso Corporal (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    required
                    value={weightValue}
                    onChange={e => setWeightValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sua Altura (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="240"
                    required
                    value={heightInput}
                    onChange={e => setHeightInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Realtime IMC Preview Badge */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">IMC Calculado:</span>
                  <div className="text-lg font-black text-white flex items-baseline gap-2">
                    <span>{previewIMC.value}</span>
                    <span className="text-xs text-slate-400 font-semibold">kg/m²</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-lg ${previewIMC.badgeBg}`}>
                  {previewIMC.label}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Data da Medição</label>
                <input
                  type="date"
                  required
                  value={weightDate}
                  onChange={e => setWeightDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Medidas Corporais Opcionais */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-amber-400" />
                  Medidas Corporais (Opcionais)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-400">Cintura (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 82"
                      value={waistCm}
                      onChange={e => setWaistCm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">Quadril (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 100"
                      value={hipCm}
                      onChange={e => setHipCm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">Braço (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 39"
                      value={armCm}
                      onChange={e => setArmCm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">Coxa (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 58"
                      value={thighCm}
                      onChange={e => setThighCm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">% Gordura (BF)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 15.5"
                      value={bodyFat}
                      onChange={e => setBodyFat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notas / Contexto</label>
                <input
                  type="text"
                  placeholder="Ex: Pesagem matinal em jejum, dia após aplicação"
                  value={weightNotes}
                  onChange={e => setWeightNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsWeightModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Pesagem</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR SINTOMAS */}
      {isSymptomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Check-in de Bem-Estar</h3>
                  <p className="text-xs text-slate-400">Registre sua percepção corporal e sinais vitais</p>
                </div>
              </div>
              <button
                onClick={() => setIsSymptomModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSymptoms} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={sympDate}
                  onChange={e => setSympDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {renderRatingButtons('Energia & Disposição', energy, setEnergy, <Flame className="w-4 h-4 text-amber-400" />)}
              {renderRatingButtons('Libido', libido, setLibido, <Heart className="w-4 h-4 text-rose-400" />)}
              {renderRatingButtons('Humor & Foco', mood, setMood, <Smile className="w-4 h-4 text-blue-400" />)}
              {renderRatingButtons('Qualidade do Sono', sleep, setSleep, <Moon className="w-4 h-4 text-indigo-400" />)}
              {renderRatingButtons('Retenção Hídrica (Inchaço)', waterRetention, setWaterRetention, <Droplets className="w-4 h-4 text-cyan-400" />, true)}

              {/* Pressão Arterial */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Pressão Arterial (mmHg)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={systolic}
                    onChange={e => setSystolic(e.target.value)}
                    placeholder="Sistólica (ex: 120)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    value={diastolic}
                    onChange={e => setDiastolic(e.target.value)}
                    placeholder="Diastólica (ex: 80)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notas do Dia</label>
                <input
                  type="text"
                  value={sympNotes}
                  onChange={e => setSympNotes(e.target.value)}
                  placeholder="Ex: Treino rendeu muito bem, sem dores de cabeça"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSymptomModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Registro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DEFINIR META DE PESO */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Meta de Peso Corporal</h3>
                  <p className="text-xs text-slate-400">Defina seu objetivo para acompanhar o progresso</p>
                </div>
              </div>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Qual é a sua meta de peso? (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="Ex: 75.0"
                  value={targetWeightInput}
                  onChange={e => setTargetWeightInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sua Altura (cm)
                </label>
                <input
                  type="number"
                  required
                  value={heightInput}
                  onChange={e => setHeightInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
