export type CompoundCategory = 
  | 'steroid'     // Esteroides Anabolizantes & Androgênicos (TRT, Masteron, Deca, Primo, Trembo, etc.)
  | 'peptide'     // Peptídeos & Agonistas GLP-1 (Tirzepatida, Semaglutida, BPC-157, CJC, TB-500, etc.)
  | 'estrogen'    // Hormônios Femininos / HRT (Estradiol, Progesterona)
  | 'fertility'   // Fertilidade, TPC & Protetores (hCG, Anastrozol, Cabergolina, Clomid, etc.)
  | 'other';

export type InjectionSite = 
  | 'deltoid_left' 
  | 'deltoid_right' 
  | 'ventroglute_left' 
  | 'ventroglute_right' 
  | 'glute_left' 
  | 'glute_right' 
  | 'quad_left' 
  | 'quad_right' 
  | 'abdomen_subq_left' 
  | 'abdomen_subq_right' 
  | 'love_handles_left' 
  | 'love_handles_right'
  | 'custom';

export interface Compound {
  id: string;
  name: string;
  category: CompoundCategory;
  subcategory?: string;     // e.g. 'Testosterona', '19-Nor', 'DHT', 'GLP-1 / GIP', 'Secretagogo GH', 'Regenerativo'
  halfLifeDays: number;     // Meia-vida em dias
  peakHours: number;        // Horas até o pico de concentração (Tmax)
  defaultConcentrationMgMl?: number; // Concentração típica (mg/mL ou mcg/mL)
  color: string;            // Cor de identificação
  unit: 'mg' | 'mcg' | 'IU';
  bioavailability?: number; // 0.0 - 1.0 (padrão 1.0)
  description?: string;
  standardReferenceRange?: {
    min: number;
    max: number;
    unit: string;
  };
  enabled?: boolean;        // Se está ativo para exibição nas listas e seletores diários (estilo Shotsy)
}

export interface Injection {
  id: string;
  compoundId: string;
  date: string;            // ISO timestamp (YYYY-MM-DDTHH:mm)
  dose: number;            // Dose na unidade do composto
  volumeMl?: number;       // Volume em mL calculado ou inserido
  site: InjectionSite;
  route: 'IM' | 'SubQ' | 'Oral' | 'Transdermal';
  notes?: string;
  needleInfo?: string;     // e.g. 30G 1/2", 27G 1/2", 25G 1"
  protocolId?: string;     // Protocolo vinculado
}

export type ProtocolFrequency = 
  | 'daily' 
  | 'eod'              // Every other day (DSDN / A cada 2 dias)
  | 'every_3_5_days'   // Twice a week (Seg/Qui ou Ter/Sex)
  | 'every_x_days'     // Intervalo personalizado em dias
  | 'weekly' 
  | 'biweekly'         // A cada 2 semanas (Quinzenal)
  | 'monthly';

export interface Protocol {
  id: string;
  name: string;
  compoundId: string;
  dose: number;
  route: 'IM' | 'SubQ' | 'Oral';
  frequency: ProtocolFrequency;
  intervalDays?: number;
  preferredDaysOfWeek?: number[];
  startDate: string;
  active: boolean;
  notes?: string;
}

export interface LabMarker {
  id: string;
  name: string;
  code: string;
  category: 'hormones' | 'hematology' | 'metabolic' | 'lipids' | 'liver_kidney';
  unit: string;
  maleRef?: { min: number; max: number };
  femaleRef?: { min: number; max: number };
}

export interface LabResult {
  id: string;
  date: string;          // YYYY-MM-DD
  markers: {
    markerCode: string;
    value: number;
    unit: string;
    customNotes?: string;
  }[];
  labName?: string;
  notes?: string;
}

export interface SymptomLog {
  id: string;
  date: string;          // YYYY-MM-DD
  energy: number;        // 1 - 5
  libido: number;        // 1 - 5
  mood: number;          // 1 - 5
  sleep: number;         // 1 - 5
  acne: number;          // 1 - 5
  waterRetention: number;// 1 - 5
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  weightKg?: number;
  notes?: string;
}

export interface UserProfile {
  name: string;
  gender: 'male' | 'female' | 'other';
  birthDate?: string;
  weightKg?: number;
  goal?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  createdAt: string;
  therapeuticGoal: 'male_trt' | 'female_hrt' | 'peptides' | 'peptides_glp1' | 'bodybuilding' | 'fertility' | 'other';
  isAdmin?: boolean;
  lastSignInAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalInjections: number;
  totalProtocols: number;
  totalLabs: number;
  topCompounds: { compoundId: string; count: number; name: string }[];
}

