import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserAccount, Compound, CompoundCategory, PrivacySettings } from '../../types';
import { storage } from '../../lib/storage';
import { CompoundManager } from './CompoundManager';
import { Settings, Download, Upload, RotateCcw, Plus, ShieldCheck, User, Sliders, X, Globe, Lock, LogOut, CheckCircle2, Mail, Phone, Calendar } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  currentUser?: UserAccount | null;
  compounds: Compound[];
  onSaveProfile: (profile: UserProfile, updatedAccount?: Partial<UserAccount>) => void;
  onAddCustomCompound: (compound: Compound) => void;
  onToggleCompound: (id: string, enabled: boolean) => void;
  onToggleAllInCategory: (category: CompoundCategory | 'all', enable: boolean) => void;
  onReloadAllData: () => void;
  onLogout?: () => void;
  initialTab?: 'compounds' | 'profile' | 'backup';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  currentUser,
  compounds,
  onSaveProfile,
  onAddCustomCompound,
  onToggleCompound,
  onToggleAllInCategory,
  onReloadAllData,
  onLogout,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'compounds' | 'profile' | 'backup'>(initialTab || 'compounds');
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(() => storage.getPrivacySettings());

  // Profile form state
  const [name, setName] = useState(profile?.name || currentUser?.name || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile?.gender || (currentUser?.gender as any) || 'male');
  const [goal, setGoal] = useState(profile?.goal || '');
  const [phone, setPhone] = useState(currentUser?.phone || profile?.phone || '');
  const [age, setAge] = useState(currentUser?.age ? String(currentUser.age) : profile?.age ? String(profile.age) : '');
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : currentUser?.heightCm ? String(currentUser.heightCm) : '');
  const [weightKg, setWeightKg] = useState(profile?.weightKg ? String(profile.weightKg) : currentUser?.weightKg ? String(currentUser.weightKg) : '');
  const [targetWeightKg, setTargetWeightKg] = useState(profile?.targetWeightKg ? String(profile.targetWeightKg) : currentUser?.targetWeightKg ? String(currentUser.targetWeightKg) : '');
  const [bodyFat, setBodyFat] = useState(profile?.bodyFatPercent ? String(profile.bodyFatPercent) : currentUser?.bodyFatPercent ? String(currentUser.bodyFatPercent) : '');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'moderate' | 'active' | 'athlete'>(profile?.activityLevel || currentUser?.activityLevel || 'moderate');
  const [marketingConsent, setMarketingConsent] = useState(profile?.marketingConsent ?? currentUser?.marketingConsent ?? true);

  // Synchronize state when modal opens or profile/currentUser updates
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      setName(profile?.name || currentUser?.name || '');
      setGender(profile?.gender || (currentUser?.gender as any) || 'male');
      setGoal(profile?.goal || '');
      setPhone(currentUser?.phone || profile?.phone || '');
      setAge(currentUser?.age ? String(currentUser.age) : profile?.age ? String(profile.age) : '');
      setHeightCm(profile?.heightCm ? String(profile.heightCm) : currentUser?.heightCm ? String(currentUser.heightCm) : '');
      setWeightKg(profile?.weightKg ? String(profile.weightKg) : currentUser?.weightKg ? String(currentUser.weightKg) : '');
      setTargetWeightKg(profile?.targetWeightKg ? String(profile.targetWeightKg) : currentUser?.targetWeightKg ? String(currentUser.targetWeightKg) : '');
      setBodyFat(profile?.bodyFatPercent ? String(profile.bodyFatPercent) : currentUser?.bodyFatPercent ? String(currentUser.bodyFatPercent) : '');
      setActivityLevel(profile?.activityLevel || currentUser?.activityLevel || 'moderate');
      setMarketingConsent(profile?.marketingConsent ?? currentUser?.marketingConsent ?? true);
    }
  }, [isOpen, profile, currentUser, initialTab]);

  // Add custom compound state
  const [showAddCompound, setShowAddCompound] = useState(false);
  const [compName, setCompName] = useState('');
  const [compCategory, setCompCategory] = useState<CompoundCategory>('steroid');
  const [subcategory, setSubcategory] = useState('');
  const [halfLife, setHalfLife] = useState('7');
  const [peakHours, setPeakHours] = useState('24');
  const [concentration, setConcentration] = useState('200');
  const [color, setColor] = useState('#3b82f6');
  const [unit, setUnit] = useState<'mg' | 'mcg' | 'IU'>('mg');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: UserProfile = {
      ...profile,
      name: name.trim(),
      gender,
      goal: goal.trim(),
      phone: phone.trim() || undefined,
      age: age ? parseInt(age) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : undefined,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : undefined,
      activityLevel,
      marketingConsent,
    };
    const updatedAccount: Partial<UserAccount> = {
      name: name.trim(),
      gender,
      phone: phone.trim() || undefined,
      age: age ? parseInt(age) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : undefined,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : undefined,
      goal: goal.trim() || undefined,
      activityLevel,
      marketingConsent,
    };
    onSaveProfile(updatedProfile, updatedAccount);
    alert('Perfil atualizado com sucesso!');
  };

  const handleCreateCompound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;

    const newComp: Compound = {
      id: 'custom_' + Date.now(),
      name: compName.trim(),
      category: compCategory,
      subcategory: subcategory.trim() || undefined,
      halfLifeDays: parseFloat(halfLife) || 5,
      peakHours: parseFloat(peakHours) || 24,
      defaultConcentrationMgMl: parseFloat(concentration) || 100,
      color,
      unit,
      bioavailability: 1.0,
      enabled: true, // Novo customizado já nasce ativo
    };

    onAddCustomCompound(newComp);
    setShowAddCompound(false);
    setCompName('');
    setSubcategory('');
    alert(`Composto "${newComp.name}" cadastrado e ativado com sucesso!`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const success = storage.importBackup(content);
        if (success) {
          alert('Backup importado com sucesso!');
          onReloadAllData();
          onClose();
        } else {
          alert('Erro ao processar o arquivo de backup.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações do SteadySync</h3>
              <p className="text-xs text-slate-400">Gerencie seus compostos visíveis, dados e perfil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => { setActiveTab('compounds'); setShowAddCompound(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'compounds'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Farmácia & Compostos</span>
          </button>

          <button
            onClick={() => { setActiveTab('profile'); setShowAddCompound(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Perfil</span>
          </button>

          <button
            onClick={() => { setActiveTab('backup'); setShowAddCompound(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'backup'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Backup & Privacidade</span>
          </button>
        </div>

        {/* Tab 1: Compound Manager */}
        {activeTab === 'compounds' && !showAddCompound && (
          <CompoundManager
            compounds={compounds}
            onToggleCompound={onToggleCompound}
            onToggleAllInCategory={onToggleAllInCategory}
            onOpenAddCustom={() => setShowAddCompound(true)}
          />
        )}

        {/* Create Custom Compound Subview */}
        {showAddCompound && (
          <form onSubmit={handleCreateCompound} className="space-y-3.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-400" />
                Cadastrar Novo Composto Customizado
              </span>
              <button
                type="button"
                onClick={() => setShowAddCompound(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Voltar à Lista
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Nome do Composto / Medicação</label>
                <input
                  type="text"
                  placeholder="ex: Primobolan Acetato"
                  value={compName}
                  onChange={e => setCompName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Categoria Principal</label>
                <select
                  value={compCategory}
                  onChange={e => setCompCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="steroid">💉 Esteroide Anabolizante & TRT</option>
                  <option value="peptide">🧬 Peptídeo & Agonista GLP-1</option>
                  <option value="fertility">🛡️ Fertilidade, TPC & Protetor</option>
                  <option value="estrogen">🌸 Hormônio Feminino / HRT</option>
                  <option value="other">Outro Composto</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Subcategoria / Família (Opcional)</label>
                <input
                  type="text"
                  placeholder="ex: Derivado DHT, GLP-1, Secretagogo"
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Unidade de Medida</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="mg">mg (miligramas)</option>
                  <option value="mcg">mcg (microgramas)</option>
                  <option value="IU">IU / UI (Unidades Internacionais)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Meia-Vida (Dias)</label>
                <input
                  type="number"
                  step="0.1"
                  value={halfLife}
                  onChange={e => setHalfLife(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Pico Sérico (Horas)</label>
                <input
                  type="number"
                  value={peakHours}
                  onChange={e => setPeakHours(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">Concentração Frasco</label>
                <input
                  type="number"
                  step="any"
                  value={concentration}
                  onChange={e => setConcentration(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCompound(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Salvar & Ativar Composto
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* User Account Card */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/20">
                  {(name || currentUser?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {name || currentUser?.name || 'Usuário'}
                    </span>
                    {currentUser?.isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-cyan-400" />
                    {currentUser?.email || 'Sessão local ativa'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Conectado</span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <User className="w-4 h-4 text-blue-400" />
                Dados do Paciente / Usuário
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Nome ou Apelido</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">E-mail da Conta</label>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                    placeholder="email@exemplo.com"
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(11) 99999-8888"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Idade</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="ex: 32"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Foco Terapêutico</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="male">TRT Masculina & Performance</option>
                    <option value="female">HRT Feminina / Menopausa</option>
                    <option value="other">Protocolo Misto / Peptídeos</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Objetivo / Observações Clínicas</label>
                <textarea
                  rows={2}
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="ex: Otimização hormonal, controle glicêmico, manutenção da composição corporal e longevidade"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium resize-none"
                />
              </div>

              {/* Biometria & Metas de Saúde */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                  Biometria & Metas de Saúde
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Altura (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={heightCm}
                      onChange={e => setHeightCm(e.target.value)}
                      placeholder="ex: 178"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Peso Atual (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      placeholder="ex: 82.5"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Meta Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={targetWeightKg}
                      onChange={e => setTargetWeightKg(e.target.value)}
                      placeholder="ex: 80.0"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">% Gordura (BF)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={bodyFat}
                      onChange={e => setBodyFat(e.target.value)}
                      placeholder="ex: 14.5"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Nível de Atividade & Rotina */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Nível de Atividade Física</label>
                  <select
                    value={activityLevel}
                    onChange={e => setActivityLevel(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="sedentary">Sedentário (pouco ou nenhum exercício)</option>
                    <option value="moderate">Moderado (treina 3-4x por semana)</option>
                    <option value="active">Ativo (treina 5-6x por semana)</option>
                    <option value="athlete">Atleta / Treinos Intensos Diários</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Comunicações & Mailing</label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 cursor-pointer hover:bg-slate-800/50">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={e => setMarketingConsent(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500"
                    />
                    <span className="text-[11px]">Receber relatórios e novidades por e-mail</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Salvar Informações
                </button>
              </div>
            </form>

            {/* Session / Logout Section */}
            {onLogout && (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Sessão da Conta</span>
                  <span className="text-[11px] text-slate-400">Deseja desconectar sua conta deste dispositivo?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja realmente sair da sua conta?')) {
                      onLogout();
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Backup & Privacy */}
        {activeTab === 'backup' && (
          <div className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Armazenamento Local & Privacidade Absoluta
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              O <strong>SteadySync</strong> armazena seus dados exclusivamente no banco de dados local do seu navegador (LocalStorage/IndexedDB). Suas informações médicas e dosagens nunca são enviadas para servidores externos.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={() => storage.exportBackup()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
              >
                <Download className="w-4 h-4 text-blue-400" />
                Exportar Backup Completo (JSON)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
              >
                <Upload className="w-4 h-4 text-purple-400" />
                Importar Arquivo de Backup
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />

              <button
                onClick={() => {
                  if (confirm('Deseja recarregar os dados de demonstração iniciais? Isso substituirá os dados atuais.')) {
                    storage.resetToDefaultDemo();
                    onReloadAllData();
                    alert('Dados iniciais restaurados com sucesso!');
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Restaurar Dados Demo
              </button>
            </div>

            {/* Isolated Opt-In Card: Community Protocol Research Data */}
            <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl space-y-3 mt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">
                      Pesquisa Comunitária & Estatísticas Anônimas (Opt-in)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Permite compartilhar anonimamente dados estruturais de protocolos (compostos, dosagens e frequências) para cálculo de médias comunitárias e aprimoramento dos modelos farmacocinéticos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...privacySettings,
                      shareAnonymizedProtocolData: !privacySettings.shareAnonymizedProtocolData,
                    };
                    setPrivacySettings(updated);
                    storage.savePrivacySettings(updated);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    privacySettings.shareAnonymizedProtocolData ? 'bg-cyan-600' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      privacySettings.shareAnonymizedProtocolData ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Isolamento Total de Privacidade:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  <li>Totalmente independente da sincronização de saúde e Google Fit.</li>
                  <li>Nenhum dado pessoal, e-mail, biometria ou exame é coletado.</li>
                  <li>Você pode revogar ou ativar essa permissão a qualquer momento.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
