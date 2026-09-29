import React, { useState, useRef } from 'react';
import { DailyDietData, FoodItem, MealType, MacroGoals } from '../../types';
import { COMMON_FOOD_LIBRARY, dietStorage } from '../../lib/diet/dietStorage';
import { myFitnessPalImporter } from '../../lib/diet/myFitnessPalImporter';
import {
  X,
  Plus,
  Trash2,
  Upload,
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  FileSpreadsheet,
  Coffee,
  Sun,
  Moon,
  Cookie,
  AlertCircle,
} from 'lucide-react';

interface DietModalProps {
  isOpen: boolean;
  onClose: () => void;
  dietData: DailyDietData;
  onAddFood: (mealType: MealType, food: Omit<FoodItem, 'id'>) => void;
  onRemoveFood: (mealType: MealType, foodId: string) => void;
  onUpdateGoals: (goals: MacroGoals) => void;
  onDietReload: () => void;
  initialTab?: 'diary' | 'import' | 'goals';
}

export const DietModal: React.FC<DietModalProps> = ({
  isOpen,
  onClose,
  dietData,
  onAddFood,
  onRemoveFood,
  onUpdateGoals,
  onDietReload,
  initialTab = 'diary',
}) => {
  const [activeTab, setActiveTab] = useState<'diary' | 'import' | 'goals'>(initialTab);
  const [selectedMealForAdd, setSelectedMealForAdd] = useState<MealType>('lunch');
  const [isAddingFood, setIsAddingFood] = useState(false);

  // New Food Form State
  const [foodName, setFoodName] = useState('');
  const [foodPortion, setFoodPortion] = useState('100g');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [foodFat, setFoodFat] = useState('');

  // Goals Form State
  const [goalCalories, setGoalCalories] = useState(String(dietData.goals.calories));
  const [goalProtein, setGoalProtein] = useState(String(dietData.goals.proteinGrams));
  const [goalCarbs, setGoalCarbs] = useState(String(dietData.goals.carbsGrams));
  const [goalFat, setGoalFat] = useState(String(dietData.goals.fatGrams));

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'loading' | null;
    message: string;
  }>({ type: null, message: '' });

  if (!isOpen) return null;

  const mealConfig: Record<MealType, { label: string; icon: any; color: string }> = {
    breakfast: { label: 'Café da Manhã', icon: Coffee, color: 'text-amber-400' },
    lunch: { label: 'Almoço', icon: Sun, color: 'text-yellow-400' },
    dinner: { label: 'Jantar', icon: Moon, color: 'text-indigo-400' },
    snack: { label: 'Lanches & Shakes', icon: Cookie, color: 'text-sky-400' },
  };

  const handleQuickAddCommon = (food: typeof COMMON_FOOD_LIBRARY[0]) => {
    onAddFood(selectedMealForAdd, {
      name: food.name,
      portion: food.portion,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setIsAddingFood(false);
  };

  const handleCustomFoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;

    onAddFood(selectedMealForAdd, {
      name: foodName.trim(),
      portion: foodPortion.trim() || undefined,
      calories: Math.round(parseFloat(foodCalories) || 0),
      protein: Math.round(parseFloat(foodProtein) || 0),
      carbs: Math.round(parseFloat(foodCarbs) || 0),
      fat: Math.round(parseFloat(foodFat) || 0),
    });

    setFoodName('');
    setFoodCalories('');
    setFoodProtein('');
    setFoodCarbs('');
    setFoodFat('');
    setIsAddingFood(false);
  };

  const handleSaveGoalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoals: MacroGoals = {
      calories: Math.round(parseFloat(goalCalories) || 2000),
      proteinGrams: Math.round(parseFloat(goalProtein) || 160),
      carbsGrams: Math.round(parseFloat(goalCarbs) || 200),
      fatGrams: Math.round(parseFloat(goalFat) || 60),
    };
    onUpdateGoals(newGoals);
    setActiveTab('diary');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: 'loading', message: 'Lendo arquivo do MyFitnessPal...' });

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const result = myFitnessPalImporter.importCsv(text);
        if (result.success) {
          setImportStatus({ type: 'success', message: result.message });
          onDietReload();
        } else {
          setImportStatus({ type: 'error', message: result.message });
        }
      } catch (err: any) {
        setImportStatus({
          type: 'error',
          message: 'Erro ao processar arquivo: ' + (err?.message || 'Arquivo corrompido'),
        });
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'Falha na leitura do arquivo local.' });
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#10121a] border border-white/[0.1] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-white">
                Diário Nutricional & Macros
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30">
                MyFitnessPal Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhamento de calorias, proteínas, carboidratos e gorduras
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 p-2 bg-black/40 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('diary')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'diary'
                ? 'bg-[#ccff00] text-black shadow-md shadow-[#ccff00]/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Diário de Refeições
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-[#ccff00] text-black shadow-md shadow-[#ccff00]/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar do MyFitnessPal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'goals'
                ? 'bg-[#ccff00] text-black shadow-md shadow-[#ccff00]/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Metas de Macros</span>
          </button>
        </div>

        {/* Body Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: MEAL DIARY */}
          {activeTab === 'diary' && (
            <div className="space-y-4">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(meal => {
                const conf = mealConfig[meal];
                const Icon = conf.icon;
                const items = dietData.meals[meal] || [];

                const mealCals = items.reduce((acc, i) => acc + (i.calories || 0), 0);
                const mealProt = items.reduce((acc, i) => acc + (i.protein || 0), 0);

                return (
                  <div
                    key={meal}
                    className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-white/[0.05] ${conf.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-white block">
                            {conf.label}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {mealCals} kcal • {mealProt}g proteína
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMealForAdd(meal);
                          setIsAddingFood(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[#ccff00] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    {/* Items List */}
                    {items.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-black/50 border border-white/[0.04] flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-white block">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.portion ? `${item.portion} • ` : ''}
                                <span className="text-rose-400 font-semibold">{item.protein}g P</span> •{' '}
                                <span className="text-sky-400 font-semibold">{item.carbs}g C</span> •{' '}
                                <span className="text-amber-400 font-semibold">{item.fat}g G</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-white">
                                {item.calories} kcal
                              </span>
                              <button
                                type="button"
                                onClick={() => onRemoveFood(meal, item.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Remover alimento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic py-1">
                        Nenhum alimento registrado nesta refeição hoje.
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Food Drawer / Panel */}
              {isAddingFood && (
                <div className="p-4 rounded-2xl bg-black/70 border border-[#ccff00]/40 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#ccff00]">
                      Adicionar em {mealConfig[selectedMealForAdd].label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingFood(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Fechar
                    </button>
                  </div>

                  {/* Quick Food Picker */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Alimentos Rápidos (1 Toque)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_FOOD_LIBRARY.map((food, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickAddCommon(food)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-[#ccff00]/20 hover:border-[#ccff00]/40 border border-white/[0.08] text-[11px] text-slate-300 hover:text-[#ccff00] font-medium transition-all cursor-pointer"
                        >
                          {food.name} ({food.portion})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Food Form */}
                  <form onSubmit={handleCustomFoodSubmit} className="space-y-3 pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Ou Cadastre Alimento Customizado
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">Nome</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Arroz Integral"
                          value={foodName}
                          onChange={e => setFoodName(e.target.value)}
                          className="w-full mt-0.5 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-[#ccff00] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">Porção</label>
                        <input
                          type="text"
                          placeholder="Ex: 100g, 1 fatia"
                          value={foodPortion}
                          onChange={e => setFoodPortion(e.target.value)}
                          className="w-full mt-0.5 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-[#ccff00] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">Calorias</label>
                        <input
                          type="number"
                          required
                          placeholder="kcal"
                          value={foodCalories}
                          onChange={e => setFoodCalories(e.target.value)}
                          className="w-full mt-0.5 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-[#ccff00] outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-rose-400">Proteína (g)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="g"
                          value={foodProtein}
                          onChange={e => setFoodProtein(e.target.value)}
                          className="w-full mt-0.5 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-rose-400 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-sky-400">Carbos (g)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="g"
                          value={foodCarbs}
                          onChange={e => setFoodCarbs(e.target.value)}
                          className="w-full mt-0.5 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-sky-400 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-amber-400">Gordura (g)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="g"
                          value={foodFat}
                          onChange={e => setFoodFat(e.target.value)}
                          className="w-full mt-0.5 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-amber-400 outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingFood(false)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.06] text-xs text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black text-xs font-black transition-all cursor-pointer shadow-md"
                      >
                        Salvar Alimento
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MYFITNESSPAL IMPORT & MIGRATION */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#ccff00]/10 border border-[#ccff00]/30 space-y-2">
                <div className="flex items-center gap-2 text-[#ccff00]">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Migração Sem Perda de Histórico
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Você não precisa recadastrar suas refeições! O SteadySync aceita qualquer arquivo CSV exportado do <strong>MyFitnessPal</strong> ou lê automaticamente suas calorias e proteínas do <strong>Google Health Connect</strong>.
                </p>
              </div>

              {/* CSV Upload Card */}
              <div className="p-6 rounded-2xl bg-black/40 border border-dashed border-white/[0.15] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Importar Arquivo CSV do MyFitnessPal</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    No MyFitnessPal (Web ou App), vá em <strong>Relatórios &gt; Exportar Dados</strong>. Selecione o arquivo CSV gerado abaixo.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black font-black text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Arquivo CSV do MyFitnessPal</span>
                </button>

                {importStatus.type && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 text-left mt-3 ${
                      importStatus.type === 'success'
                        ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                        : importStatus.type === 'error'
                        ? 'bg-rose-950/60 border border-rose-800/60 text-rose-300'
                        : 'bg-sky-950/60 border border-sky-800/60 text-sky-300'
                    }`}
                  >
                    {importStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{importStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Step by step instructions */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2 text-xs text-slate-400">
                <span className="font-bold text-white uppercase tracking-wider text-[10px] block">
                  Como funciona a sincronização contínua:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>O MyFitnessPal grava automaticamente suas refeições no <strong>Health Connect</strong> do Android.</li>
                  <li>O SteadySync lê diretamente esses registros de nutrição quando você clica em Sincronizar Saúde.</li>
                  <li>Seus treinos feitos no SteadySync também abatem o cálculo calórico do dia (`Restantes = Meta - Alimentos + Exercício`).</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: MACRO GOALS */}
          {activeTab === 'goals' && (
            <form onSubmit={handleSaveGoalsSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-white block">
                    Metas Diárias de Macronutrientes
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure sua meta calórica e distribuição de macros para cutting, bulking ou manutenção
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">
                      Meta de Calorias Base (kcal / dia)
                    </label>
                    <input
                      type="number"
                      required
                      value={goalCalories}
                      onChange={e => setGoalCalories(e.target.value)}
                      className="w-full mt-1 p-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-sm font-mono font-bold text-white focus:border-[#ccff00] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-rose-400">
                        Proteínas (g)
                      </label>
                      <input
                        type="number"
                        required
                        value={goalProtein}
                        onChange={e => setGoalProtein(e.target.value)}
                        className="w-full mt-1 p-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono font-bold text-white focus:border-rose-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-sky-400">
                        Carboidratos (g)
                      </label>
                      <input
                        type="number"
                        required
                        value={goalCarbs}
                        onChange={e => setGoalCarbs(e.target.value)}
                        className="w-full mt-1 p-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono font-bold text-white focus:border-sky-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-amber-400">
                        Gorduras (g)
                      </label>
                      <input
                        type="number"
                        required
                        value={goalFat}
                        onChange={e => setGoalFat(e.target.value)}
                        className="w-full mt-1 p-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono font-bold text-white focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black font-black text-xs transition-all cursor-pointer shadow-md"
                >
                  Salvar Metas
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Fórmula MyFitnessPal: Restantes = Meta Base ({dietData.goals.calories}) - Alimentos + Exercício
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
