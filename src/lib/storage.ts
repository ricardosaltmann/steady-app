import { Compound, CompoundCategory, Injection, Protocol, LabResult, SymptomLog, UserProfile, UserAccount, GoogleHealthSyncConfig } from '../types';
import { DEFAULT_COMPOUNDS } from './defaultCompounds';
import { auth } from './auth';

// Helper to scope storage keys per authenticated user
export const getScopedKey = (base: string, userId?: string): string => {
  const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
  return `steady_${uid}_${base}`;
};

// Generates realistic sample data for demo user onboarding
export function getInitialDemoData() {
  const now = new Date();
  
  const daysAgo = (days: number, hours: number = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hours, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const sampleInjections: Injection[] = [
    {
      id: 'inj_1',
      compoundId: 'test_cypionate',
      date: daysAgo(17, 8),
      dose: 50,
      volumeMl: 0.25,
      site: 'deltoid_left',
      route: 'IM',
      notes: 'Aplicação suave, sem dor.',
      needleInfo: '30G 1/2"',
      protocolId: 'proto_trt',
    },
    {
      id: 'inj_2',
      compoundId: 'test_cypionate',
      date: daysAgo(14, 8),
      dose: 50,
      volumeMl: 0.25,
      site: 'deltoid_right',
      route: 'IM',
      notes: 'Ombro direito.',
      needleInfo: '30G 1/2"',
      protocolId: 'proto_trt',
    },
    {
      id: 'inj_3',
      compoundId: 'test_cypionate',
      date: daysAgo(10, 8),
      dose: 50,
      volumeMl: 0.25,
      site: 'ventroglute_left',
      route: 'IM',
      notes: 'Ventroglúteo esquerdo, rotação.',
      needleInfo: '27G 1/2"',
      protocolId: 'proto_trt',
    },
    {
      id: 'inj_4',
      compoundId: 'test_cypionate',
      date: daysAgo(7, 8),
      dose: 50,
      volumeMl: 0.25,
      site: 'ventroglute_right',
      route: 'IM',
      notes: 'Aplicação rápida.',
      needleInfo: '27G 1/2"',
      protocolId: 'proto_trt',
    },
    {
      id: 'inj_5',
      compoundId: 'test_cypionate',
      date: daysAgo(3, 8),
      dose: 50,
      volumeMl: 0.25,
      site: 'deltoid_left',
      route: 'IM',
      notes: 'Dose matinal de quinta-feira.',
      needleInfo: '30G 1/2"',
      protocolId: 'proto_trt',
    },

    // Tirzepatida
    {
      id: 'inj_glp1_1',
      compoundId: 'tirzepatide',
      date: daysAgo(14, 20),
      dose: 2.5,
      volumeMl: 0.325,
      site: 'abdomen_subq_right',
      route: 'SubQ',
      notes: 'Semana 1 de adaptação.',
      needleInfo: '31G 5/16"',
      protocolId: 'proto_tirz',
    },
    {
      id: 'inj_glp1_2',
      compoundId: 'tirzepatide',
      date: daysAgo(7, 20),
      dose: 2.5,
      volumeMl: 0.325,
      site: 'abdomen_subq_left',
      route: 'SubQ',
      notes: 'Semana 2, controle de apetite excelente.',
      needleInfo: '31G 5/16"',
      protocolId: 'proto_tirz',
    },

    // BPC-157
    {
      id: 'inj_bpc_1',
      compoundId: 'bpc_157',
      date: daysAgo(1, 8),
      dose: 250,
      volumeMl: 0.1,
      site: 'abdomen_subq_left',
      route: 'SubQ',
      notes: 'Recuperação tendão ombro.',
      needleInfo: '31G 5/16"',
    },
  ];

  const sampleProtocols: Protocol[] = [
    {
      id: 'proto_trt',
      name: 'TRT Padrão Ouro (Seg / Qui)',
      compoundId: 'test_cypionate',
      dose: 50,
      route: 'IM',
      frequency: 'every_3_5_days',
      preferredDaysOfWeek: [1, 4],
      startDate: daysAgo(30).slice(0, 10),
      active: true,
      notes: '100mg semanais fracionados em 2x de 50mg.',
    },
    {
      id: 'proto_tirz',
      name: 'Protocolo Metabólico Semanal',
      compoundId: 'tirzepatide',
      dose: 2.5,
      route: 'SubQ',
      frequency: 'weekly',
      startDate: daysAgo(21).slice(0, 10),
      active: true,
      vialMg: 20,
      waterMl: 2.6,
      concentrationMgMl: 7.69,
      syringeUnits: 32.5,
      notes: 'Aplicação semanal de 2.5mg (32.5 UI na seringa U-100). Frasco 20mg / 2.6mL.',
    },
  ];

  const sampleLabs: LabResult[] = [
    {
      id: 'lab_1',
      date: daysAgo(3).slice(0, 10),
      labName: 'Laboratório Fleury / Dasa',
      notes: 'Coleta em jejum no vale da aplicação.',
      markers: [
        { markerCode: 'total_t', value: 785, unit: 'ng/dL' },
        { markerCode: 'free_t', value: 22.4, unit: 'ng/dL' },
        { markerCode: 'e2', value: 31.8, unit: 'pg/mL' },
        { markerCode: 'shbg', value: 28, unit: 'nmol/L' },
        { markerCode: 'hematocrit', value: 46.2, unit: '%' },
        { markerCode: 'glucose', value: 84, unit: 'mg/dL' },
      ],
    },
  ];

  const sampleSymptoms: SymptomLog[] = [
    {
      id: 'symp_1',
      date: daysAgo(2).slice(0, 10),
      energy: 5,
      libido: 5,
      mood: 4,
      sleep: 4,
      acne: 1,
      waterRetention: 1,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 78,
      weightKg: 82.4,
      notes: 'Disposição excelente durante o treino.',
    },
    {
      id: 'symp_2',
      date: daysAgo(1).slice(0, 10),
      energy: 4,
      libido: 4,
      mood: 5,
      sleep: 5,
      acne: 1,
      waterRetention: 1,
      bloodPressureSystolic: 118,
      bloodPressureDiastolic: 76,
      weightKg: 82.1,
      notes: 'Sono profundo e recuperação muscular rápida.',
    },
  ];

  const sampleProfile: UserProfile = {
    name: 'Atleta / Paciente SteadySync',
    gender: 'male',
    birthDate: '1990-05-15',
    weightKg: 82.0,
    goal: 'Otimização hormonal, saúde e longevidade',
  };

  return {
    compounds: DEFAULT_COMPOUNDS,
    injections: sampleInjections,
    protocols: sampleProtocols,
    labs: sampleLabs,
    symptoms: sampleSymptoms,
    profile: sampleProfile,
  };
}

// Multi-user scoped storage helpers
export const storage = {
  getCompounds: (userId?: string): Compound[] => {
    const key = getScopedKey('compounds', userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(DEFAULT_COMPOUNDS));
      return DEFAULT_COMPOUNDS;
    }
    try {
      const stored = JSON.parse(raw) as Compound[];
      const storedIds = new Set(stored.map(c => c.id));
      const missingDefaults = DEFAULT_COMPOUNDS.filter(d => !storedIds.has(d.id));
      
      // Keep default parameters synced (e.g. tirzepatide / retatrutide 20mg / 2.6mL)
      const synced = stored.map(c => {
        const def = DEFAULT_COMPOUNDS.find(d => d.id === c.id);
        if (def && (c.id === 'tirzepatide' || c.id === 'retatrutide' || c.id === 'semaglutide')) {
          return {
            ...c,
            name: def.name,
            defaultConcentrationMgMl: def.defaultConcentrationMgMl,
            vialMg: def.vialMg,
            waterMl: def.waterMl,
            description: def.description,
          };
        }
        return c;
      });

      if (missingDefaults.length > 0) {
        const merged = [...synced, ...missingDefaults];
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
      localStorage.setItem(key, JSON.stringify(synced));
      return synced;
    } catch {
      return DEFAULT_COMPOUNDS;
    }
  },

  saveCompounds: (compounds: Compound[], userId?: string) => {
    const key = getScopedKey('compounds', userId);
    localStorage.setItem(key, JSON.stringify(compounds));
  },

  toggleCompoundEnabled: (id: string, enabled: boolean, userId?: string) => {
    const list = storage.getCompounds(userId);
    const updated = list.map(c => c.id === id ? { ...c, enabled } : c);
    storage.saveCompounds(updated, userId);
    return updated;
  },

  toggleAllCompoundsInCategory: (category: string, enabled: boolean, userId?: string) => {
    const list = storage.getCompounds(userId);
    const updated = list.map(c => {
      if (category === 'all' || c.category === category) {
        return { ...c, enabled };
      }
      return c;
    });
    storage.saveCompounds(updated, userId);
    return updated;
  },

  initializeUserPreferences: (
    userId: string,
    selectedCategories: CompoundCategory[],
    gender?: 'male' | 'female' | 'other',
    phone?: string,
    age?: number,
    name?: string,
    therapeuticGoal?: UserAccount['therapeuticGoal']
  ): Compound[] => {
    const cats = selectedCategories && selectedCategories.length > 0
      ? selectedCategories
      : (['peptide', 'steroid'] as CompoundCategory[]);

    // Only selected categories have enabled = true. The rest are false.
    const configuredCompounds = DEFAULT_COMPOUNDS.map(c => ({
      ...c,
      enabled: cats.includes(c.category),
    }));

    storage.saveCompounds(configuredCompounds, userId);

    // Set first enabled compound as active
    const firstActive = configuredCompounds.find(c => c.enabled !== false);
    if (firstActive) {
      storage.setActiveCompoundId(firstActive.id, userId);
    }

    // Save initial user profile
    const initialProfile: UserProfile = {
      name: name || 'Novo Usuário',
      gender: gender || (therapeuticGoal === 'female_hrt' ? 'female' : 'male'),
      phone: phone || undefined,
      age: age ? Number(age) : undefined,
      selectedCategories: cats,
      goal: therapeuticGoal === 'peptides_glp1' || therapeuticGoal === 'peptides'
        ? 'Acompanhamento de Peptídeos e Emagrecimento'
        : therapeuticGoal === 'female_hrt'
        ? 'Reposição Hormonal Feminina'
        : 'Otimização hormonal e farmacocinética',
    };
    storage.saveProfile(initialProfile, userId);

    return configuredCompounds;
  },

  getInjections: (userId?: string): Injection[] => {
    const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
    const key = getScopedKey('injections', uid);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (uid === 'user_demo') {
        const initial = getInitialDemoData().injections;
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveInjections: (injections: Injection[], userId?: string) => {
    const key = getScopedKey('injections', userId);
    localStorage.setItem(key, JSON.stringify(injections));
  },

  addInjection: (injection: Injection, userId?: string) => {
    const list = storage.getInjections(userId);
    list.unshift(injection);
    storage.saveInjections(list, userId);
    return list;
  },

  deleteInjection: (id: string, userId?: string) => {
    const list = storage.getInjections(userId).filter(i => i.id !== id);
    storage.saveInjections(list, userId);
    return list;
  },

  getProtocols: (userId?: string): Protocol[] => {
    const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
    const key = getScopedKey('protocols', uid);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (uid === 'user_demo') {
        const initial = getInitialDemoData().protocols;
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveProtocols: (protocols: Protocol[], userId?: string) => {
    const key = getScopedKey('protocols', userId);
    localStorage.setItem(key, JSON.stringify(protocols));
  },

  getLabs: (userId?: string): LabResult[] => {
    const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
    const key = getScopedKey('labs', uid);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (uid === 'user_demo') {
        const initial = getInitialDemoData().labs;
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveLabs: (labs: LabResult[], userId?: string) => {
    const key = getScopedKey('labs', userId);
    localStorage.setItem(key, JSON.stringify(labs));
  },

  getSymptoms: (userId?: string): SymptomLog[] => {
    const uid = userId || auth.getCurrentUser()?.id || 'user_demo';
    const key = getScopedKey('symptoms', uid);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (uid === 'user_demo') {
        const initial = getInitialDemoData().symptoms;
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveSymptoms: (symptoms: SymptomLog[], userId?: string) => {
    const key = getScopedKey('symptoms', userId);
    localStorage.setItem(key, JSON.stringify(symptoms));
  },

  getProfile: (userId?: string): UserProfile => {
    const user = auth.getCurrentUser();
    const uid = userId || user?.id || 'user_demo';
    const key = getScopedKey('profile', uid);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (uid === 'user_demo') {
        const initial = getInitialDemoData().profile;
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      const initial: UserProfile = {
        name: user?.name || 'Novo Usuário',
        gender: user?.gender || (user?.therapeuticGoal === 'female_hrt' ? 'female' : 'male'),
        phone: user?.phone,
        age: user?.age,
        selectedCategories: user?.selectedCategories,
        goal: 'Acompanhamento farmacocinético de saúde',
      };
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return getInitialDemoData().profile;
    }
  },

  saveProfile: (profile: UserProfile, userId?: string) => {
    const key = getScopedKey('profile', userId);
    localStorage.setItem(key, JSON.stringify(profile));
  },

  getActiveCompoundId: (userId?: string): string => {
    const key = getScopedKey('active_compound_id', userId);
    return localStorage.getItem(key) || 'test_cypionate';
  },

  setActiveCompoundId: (id: string, userId?: string) => {
    const key = getScopedKey('active_compound_id', userId);
    localStorage.setItem(key, id);
  },

  exportBackup: (userId?: string) => {
    const user = auth.getCurrentUser();
    const payload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
      },
      compounds: storage.getCompounds(userId),
      injections: storage.getInjections(userId),
      protocols: storage.getProtocols(userId),
      labs: storage.getLabs(userId),
      symptoms: storage.getSymptoms(userId),
      profile: storage.getProfile(userId),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steadysync_backup_${(user?.name || 'user').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importBackup: (jsonString: string, userId?: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.compounds) storage.saveCompounds(data.compounds, userId);
      if (data.injections) storage.saveInjections(data.injections, userId);
      if (data.protocols) storage.saveProtocols(data.protocols, userId);
      if (data.labs) storage.saveLabs(data.labs, userId);
      if (data.symptoms) storage.saveSymptoms(data.symptoms, userId);
      if (data.profile) storage.saveProfile(data.profile, userId);
      return true;
    } catch (e) {
      console.error('Falha ao importar backup:', e);
      return false;
    }
  },

  resetToDefaultDemo: (userId?: string) => {
    const demo = getInitialDemoData();
    storage.saveCompounds(demo.compounds, userId);
    storage.saveInjections(demo.injections, userId);
    storage.saveProtocols(demo.protocols, userId);
    storage.saveLabs(demo.labs, userId);
    storage.saveSymptoms(demo.symptoms, userId);
    storage.saveProfile(demo.profile, userId);
    storage.setActiveCompoundId('test_cypionate', userId);
  },

  getGoogleHealthConfig: (userId?: string): GoogleHealthSyncConfig => {
    const key = getScopedKey('google_health_config', userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      const user = auth.getCurrentUser();
      const initial: GoogleHealthSyncConfig = {
        connected: false,
        email: user?.email || '',
        provider: 'google_fit',
        autoSync: true,
      };
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { connected: false, email: '', provider: 'google_fit', autoSync: true };
    }
  },

  saveGoogleHealthConfig: (config: GoogleHealthSyncConfig, userId?: string) => {
    const key = getScopedKey('google_health_config', userId);
    localStorage.setItem(key, JSON.stringify(config));
  },
};
