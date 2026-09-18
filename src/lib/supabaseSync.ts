import { supabase, isSupabaseConfigured } from './supabase';
import { Injection, Protocol, LabResult, SymptomLog, Compound, UserAccount, AdminStats, UserProfile, DailyWaterData, WaterLogEntry } from '../types';

export const supabaseSync = {
  // --- INJECTIONS ---
  getInjections: async (userId: string): Promise<Injection[] | null> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return null;

    try {
      const { data, error } = await supabase
        .from('injections')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar injeções do Supabase:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        compoundId: row.compound_id,
        date: row.date,
        dose: Number(row.dose),
        volumeMl: row.volume_ml ? Number(row.volume_ml) : undefined,
        site: row.site,
        route: row.route,
        notes: row.notes,
        needleInfo: row.needle_info,
        protocolId: row.protocol_id,
      }));
    } catch (e) {
      console.warn('Falha na requisição Supabase:', e);
      return null;
    }
  },

  saveInjection: async (injection: Injection, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase.from('injections').upsert({
        id: injection.id,
        user_id: userId,
        compound_id: injection.compoundId,
        date: injection.date,
        dose: injection.dose,
        volume_ml: injection.volumeMl || null,
        site: injection.site || null,
        route: injection.route || null,
        notes: injection.notes || null,
        needle_info: injection.needleInfo || null,
        protocol_id: injection.protocolId || null,
      });

      return !error;
    } catch {
      return false;
    }
  },

  deleteInjection: async (id: string, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase
        .from('injections')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  // --- PROTOCOLS ---
  getProtocols: async (userId: string): Promise<Protocol[] | null> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return null;

    try {
      const { data, error } = await supabase
        .from('protocols')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return null;

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        compoundId: row.compound_id,
        dose: Number(row.dose),
        route: row.route || 'IM',
        frequency: row.frequency || 'weekly',
        intervalDays: row.interval_days ? Number(row.interval_days) : undefined,
        preferredDaysOfWeek: row.days_of_week || undefined,
        startDate: row.start_date || new Date().toISOString().slice(0, 10),
        active: Boolean(row.active),
        notes: row.notes,
      }));
    } catch {
      return null;
    }
  },

  saveProtocol: async (protocol: Protocol, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase.from('protocols').upsert({
        id: protocol.id,
        user_id: userId,
        name: protocol.name,
        compound_id: protocol.compoundId,
        dose: protocol.dose,
        route: protocol.route,
        frequency: protocol.frequency,
        interval_days: protocol.intervalDays || null,
        days_of_week: protocol.preferredDaysOfWeek || null,
        start_date: protocol.startDate,
        active: protocol.active,
        notes: protocol.notes || null,
      });

      return !error;
    } catch {
      return false;
    }
  },

  deleteProtocol: async (id: string, userId?: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured() || (userId && userId.startsWith('user_demo'))) {
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('protocols')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Supabase] Erro ao excluir protocolo do banco:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('[Supabase] Exceção ao excluir protocolo do banco:', err);
      return { success: false, error: err?.message || 'Falha de comunicação com o Supabase' };
    }
  },

  // --- LABS ---
  getLabs: async (userId: string): Promise<LabResult[] | null> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return null;

    try {
      const { data, error } = await supabase
        .from('labs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) return null;

      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        labName: row.lab_name,
        notes: row.notes,
        markers: row.markers || [],
      }));
    } catch {
      return null;
    }
  },

  saveLab: async (lab: LabResult, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase.from('labs').upsert({
        id: lab.id,
        user_id: userId,
        date: lab.date,
        lab_name: lab.labName || null,
        notes: lab.notes || null,
        markers: lab.markers || [],
      });

      return !error;
    } catch {
      return false;
    }
  },

  deleteLab: async (id: string, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase
        .from('labs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  // --- SYMPTOMS ---
  getSymptoms: async (userId: string): Promise<SymptomLog[] | null> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return null;

    try {
      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) return null;

      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        energy: row.energy,
        libido: row.libido,
        mood: row.mood,
        sleep: row.sleep,
        acne: row.acne,
        waterRetention: row.water_retention,
        bloodPressureSystolic: row.blood_pressure_systolic ? Number(row.blood_pressure_systolic) : undefined,
        bloodPressureDiastolic: row.blood_pressure_diastolic ? Number(row.blood_pressure_diastolic) : undefined,
        weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
        heightCm: row.height_cm ? Number(row.height_cm) : undefined,
        bodyFatPercent: row.body_fat_percent ? Number(row.body_fat_percent) : undefined,
        waterMl: row.water_ml ? Number(row.water_ml) : undefined,
        waistCm: row.waist_cm ? Number(row.waist_cm) : undefined,
        hipCm: row.hip_cm ? Number(row.hip_cm) : undefined,
        armCm: row.arm_cm ? Number(row.arm_cm) : undefined,
        thighCm: row.thigh_cm ? Number(row.thigh_cm) : undefined,
        chestCm: row.chest_cm ? Number(row.chest_cm) : undefined,
        notes: row.notes,
      }));
    } catch {
      return null;
    }
  },

  saveSymptom: async (symptom: SymptomLog, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase.from('symptoms').upsert({
        id: symptom.id,
        user_id: userId,
        date: symptom.date,
        energy: symptom.energy,
        libido: symptom.libido,
        mood: symptom.mood,
        sleep: symptom.sleep,
        acne: symptom.acne,
        water_retention: symptom.waterRetention,
        blood_pressure_systolic: symptom.bloodPressureSystolic || null,
        blood_pressure_diastolic: symptom.bloodPressureDiastolic || null,
        weight_kg: symptom.weightKg || null,
        height_cm: symptom.heightCm || null,
        body_fat_percent: symptom.bodyFatPercent || null,
        water_ml: symptom.waterMl || null,
        waist_cm: symptom.waistCm || null,
        hip_cm: symptom.hipCm || null,
        arm_cm: symptom.armCm || null,
        thigh_cm: symptom.thighCm || null,
        chest_cm: symptom.chestCm || null,
        notes: symptom.notes || null,
      });

      return !error;
    } catch {
      return false;
    }
  },

  deleteSymptom: async (id: string, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase
        .from('symptoms')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  // --- PROFILES ---
  getProfile: async (userId: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        name: data.name || '',
        gender: data.gender || 'male',
        birthDate: data.birth_date || undefined,
        age: data.age ? Number(data.age) : undefined,
        phone: data.phone || undefined,
        heightCm: data.height_cm ? Number(data.height_cm) : undefined,
        weightKg: data.weight_kg ? Number(data.weight_kg) : undefined,
        targetWeightKg: data.target_weight_kg ? Number(data.target_weight_kg) : undefined,
        bodyFatPercent: data.body_fat_percent ? Number(data.body_fat_percent) : undefined,
        goal: data.goal || undefined,
        activityLevel: data.activity_level || 'moderate',
        marketingConsent: data.marketing_consent ?? true,
        selectedCategories: data.selected_categories || undefined,
        notes: data.notes || undefined,
      };
    } catch {
      return null;
    }
  },

  saveProfile: async (profile: UserProfile, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        name: profile.name || null,
        phone: profile.phone || null,
        age: profile.age ? Number(profile.age) : null,
        gender: profile.gender || 'male',
        birth_date: profile.birthDate || null,
        height_cm: profile.heightCm ? Number(profile.heightCm) : null,
        weight_kg: profile.weightKg ? Number(profile.weightKg) : null,
        target_weight_kg: profile.targetWeightKg ? Number(profile.targetWeightKg) : null,
        body_fat_percent: profile.bodyFatPercent ? Number(profile.bodyFatPercent) : null,
        goal: profile.goal || null,
        activity_level: profile.activityLevel || 'moderate',
        marketing_consent: profile.marketingConsent ?? true,
        selected_categories: profile.selectedCategories || ['peptide', 'steroid'],
        notes: profile.notes || null,
        updated_at: new Date().toISOString(),
      });

      return !error;
    } catch {
      return false;
    }
  },

  // --- WATER TRACKING ---
  getWaterData: async (dateStr: string, userId: string): Promise<DailyWaterData | null> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return null;

    try {
      const { data, error } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .order('time', { ascending: false });

      if (error || !data) return null;

      const entries: WaterLogEntry[] = data.map((row: any) => ({
        id: row.id,
        time: row.time,
        amountMl: Number(row.amount_ml),
      }));

      const totalMl = entries.reduce((acc, curr) => acc + curr.amountMl, 0);
      const targetMl = data[0]?.target_ml ? Number(data[0].target_ml) : 2500;

      return {
        date: dateStr,
        targetMl,
        totalMl,
        entries,
      };
    } catch {
      return null;
    }
  },

  saveWaterEntry: async (entry: WaterLogEntry, dateStr: string, targetMl: number, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase.from('water_logs').upsert({
        id: entry.id,
        user_id: userId,
        date: dateStr,
        time: entry.time,
        amount_ml: entry.amountMl,
        target_ml: targetMl,
        created_at: new Date().toISOString(),
      });

      return !error;
    } catch {
      return false;
    }
  },

  deleteWaterEntry: async (id: string, userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || userId.startsWith('user_demo')) return false;

    try {
      const { error } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  // --- ADMIN METHODS ---
  checkIsAdmin: async (userId?: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || !userId || userId.startsWith('user_demo')) {
      return false;
    }

    try {
      // 1. Tenta RPC is_admin (segura via SECURITY DEFINER no PostgreSQL)
      const { data: rpcAdmin, error: rpcError } = await supabase.rpc('is_admin');
      if (!rpcError && typeof rpcAdmin === 'boolean') {
        return rpcAdmin;
      }

      // 2. Fallback autoritativo consultando profiles.is_admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      return Boolean(profile?.is_admin);
    } catch {
      return false;
    }
  },

  getAdminUsers: async (): Promise<UserAccount[]> => {
    if (!isSupabaseConfigured()) {
      // Fallback to local accounts
      const raw = localStorage.getItem('steady_users_v1');
      if (!raw) return [];
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((p: any) => ({
        id: p.id,
        name: p.name || 'Sem nome',
        email: p.email || '',
        createdAt: p.created_at,
        therapeuticGoal: p.therapeutic_goal || 'male_trt',
        isAdmin: Boolean(p.is_admin),
      }));
    } catch {
      return [];
    }
  },

  getAdminStats: async (): Promise<AdminStats> => {
    if (!isSupabaseConfigured()) {
      return {
        totalUsers: 2,
        totalInjections: 14,
        totalProtocols: 3,
        totalLabs: 2,
        topCompounds: [
          { compoundId: 'test_cypionate', name: 'Testosterona Cipionato', count: 8 },
          { compoundId: 'bpc_157', name: 'BPC-157', count: 4 },
          { compoundId: 'tirzepatide', name: 'Tirzepatida (GLP-1/GIP)', count: 2 },
        ],
      };
    }

    try {
      const [usersCount, injectionsCount, protocolsCount, labsCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('injections').select('*', { count: 'exact', head: true }),
        supabase.from('protocols').select('*', { count: 'exact', head: true }),
        supabase.from('labs').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalUsers: usersCount.count || 0,
        totalInjections: injectionsCount.count || 0,
        totalProtocols: protocolsCount.count || 0,
        totalLabs: labsCount.count || 0,
        topCompounds: [
          { compoundId: 'test_cypionate', name: 'Testosterona Cipionato', count: injectionsCount.count || 0 },
        ],
      };
    } catch {
      return {
        totalUsers: 1,
        totalInjections: 0,
        totalProtocols: 0,
        totalLabs: 0,
        topCompounds: [],
      };
    }
  },
};
