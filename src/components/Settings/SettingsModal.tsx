import React, { useState, useRef } from 'react';
import { UserProfile, Compound, CompoundCategory } from '../../types';
import { storage } from '../../lib/storage';
import { CompoundManager } from './CompoundManager';
import { Settings, Download, Upload, RotateCcw, Plus, ShieldCheck, User, Sliders, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  compounds: Compound[];
  onSaveProfile: (profile: UserProfile) => void;
  onAddCustomCompound: (compound: Compound) => void;
  onToggleCompound: (id: string, enabled: boolean) => void;
  onToggleAllInCategory: (category: CompoundCategory | 'all', enable: boolean) => void;
  onReloadAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  compounds,
  onSaveProfile,
  onAddCustomCompound,
  onToggleCompound,
  onToggleAllInCategory,
  onReloadAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'compounds' | 'profile' | 'backup'>('compounds');

  // Profile form state
  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile.gender);
  const [goal, setGoal] = useState(profile.goal || '');

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
    onSaveProfile({
      ...profile,
      name,
      gender,
      goal,
    });
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
          <form onSubmit={handleSaveProfile} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <User className="w-4 h-4 text-blue-400" />
              Dados do Paciente / Usuário
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Nome ou Apelido</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Foco Terapêutico</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="male">TRT Masculina & Performance</option>
                  <option value="female">HRT Feminina</option>
                  <option value="other">Protocolo Misto / Peptídeos</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Objetivo / Observações Clínicas</label>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="ex: Otimização hormonal, controle glicêmico e recuperação articular"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
              >
                Salvar Informações
              </button>
            </div>
          </form>
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
          </div>
        )}
      </div>
    </div>
  );
};
