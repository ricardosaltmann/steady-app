import React from 'react';
import { DailyDietData } from '../../types';
import { CalorieGauge } from './CalorieGauge';
import { Apple, Plus, Upload, ChevronRight } from 'lucide-react';

interface DietCardProps {
  dietData: DailyDietData;
  onOpenDietModal: () => void;
  onOpenImportModal: () => void;
}

export const DietCard: React.FC<DietCardProps> = ({
  dietData,
  onOpenDietModal,
  onOpenImportModal,
}) => {
  const totalMealsCount =
    (dietData.meals.breakfast?.length || 0) +
    (dietData.meals.lunch?.length || 0) +
    (dietData.meals.dinner?.length || 0) +
    (dietData.meals.snack?.length || 0);

  return (
    <div className="bg-[#10121a]/90 border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 shadow-xl space-y-4 backdrop-blur-xl transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <Apple className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nutrição & Dieta
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                {totalMealsCount} {totalMealsCount === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <h3 className="text-sm font-black text-white">Balanço Calórico & Macros</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDietModal}
          className="text-xs text-[#ccff00] hover:text-[#bfe600] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
        >
          <span>Ver Diário</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Calorie Gauge with MFP Formula */}
      <CalorieGauge dietData={dietData} />

      {/* Bottom Actions */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={onOpenImportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
          title="Importar histórico do MyFitnessPal via arquivo CSV"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span>Importar do MyFitnessPal</span>
        </button>

        <button
          type="button"
          onClick={onOpenDietModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black font-black transition-all cursor-pointer shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Registrar Alimento</span>
        </button>
      </div>
    </div>
  );
};
