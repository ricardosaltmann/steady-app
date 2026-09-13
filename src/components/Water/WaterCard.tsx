import React from 'react';
import { DailyWaterData } from '../../types';
import { Droplets, Plus, ChevronRight } from 'lucide-react';

interface WaterCardProps {
  waterData: DailyWaterData;
  onQuickAdd: (amountMl: number) => void;
  onOpenModal: () => void;
}

export const WaterCard: React.FC<WaterCardProps> = ({
  waterData,
  onQuickAdd,
  onOpenModal,
}) => {
  const percent = Math.min(100, Math.round((waterData.totalMl / (waterData.targetMl || 2500)) * 100));
  const remainingMl = Math.max(0, (waterData.targetMl || 2500) - waterData.totalMl);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Droplets className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Hidratação de Hoje
              </span>
              <span className="text-[11px] text-slate-400">
                Suporte metabólico e renal
              </span>
            </div>
          </div>
          <button
            onClick={onOpenModal}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
          >
            Histórico & Lembretes <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Display */}
        <div className="mt-3.5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">
              {waterData.totalMl}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              / {waterData.targetMl || 2500} ml
            </span>
          </div>
          <span className="text-sm font-bold text-cyan-400">
            {percent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950/80 rounded-full h-2.5 mt-2 border border-slate-800 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-400 mt-2">
          {remainingMl > 0 ? `Faltam ${remainingMl} ml para sua meta` : '✨ Meta de hidratação alcançada!'}
        </p>
      </div>

      {/* Quick Add Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => onQuickAdd(250)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/60 text-cyan-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+250 ml</span>
        </button>
        <button
          type="button"
          onClick={() => onQuickAdd(500)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/60 text-cyan-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+500 ml</span>
        </button>
      </div>
    </div>
  );
};
