import React from 'react';
import { DailySupplementData, SupplementItem } from '../../types';
import { Zap, Pill, Flame, CheckCircle2, Plus, Sparkles, SlidersHorizontal } from 'lucide-react';

interface SupplementCardProps {
  supplementData: DailySupplementData;
  onToggleItem: (itemId: string) => void;
  onAddDose: (itemId: string, amount: number) => void;
  onOpenModal: () => void;
}

export const SupplementCard: React.FC<SupplementCardProps> = ({
  supplementData,
  onToggleItem,
  onAddDose,
  onOpenModal,
}) => {
  const creatine = supplementData.items.find(i => i.category === 'creatine');
  const whey = supplementData.items.find(i => i.category === 'whey');
  const vitamins = supplementData.items.filter(i => i.category === 'vitamin' || i.category === 'other');

  const totalItems = supplementData.items.length;
  const completedCount = supplementData.items.filter(i => i.completed).length;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden backdrop-blur-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/25">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nutrição & Suplementos
              </span>
              {supplementData.streakDays > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Flame className="w-3 h-3 fill-amber-400" />
                  {supplementData.streakDays}d streak
                </span>
              )}
            </div>
            <h3 className="text-sm font-black text-white">Stack Diário de Performance</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
          title="Configurar metas de suplementação"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ajustar</span>
        </button>
      </div>

      {/* Grid of 2 Core Supplements: Creatine & Whey */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. CREATINA */}
        {creatine && (
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              creatine.completed
                ? 'bg-[#ccff00]/[0.06] border-[#ccff00]/40'
                : 'bg-black/40 border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-amber-500/15 text-amber-400">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" />
                </div>
                <div>
                  <span className="text-xs font-black text-white block">Creatina</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Meta: {creatine.targetDose}g / dia
                  </span>
                </div>
              </div>

              {creatine.completed ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#ccff00]/20 text-[#ccff00] border border-[#ccff00]/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Tomado
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-500">Pendente</span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleItem(creatine.id)}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  creatine.completed
                    ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300'
                    : 'bg-[#ccff00] hover:bg-[#bfe600] text-black shadow-md shadow-[#ccff00]/20'
                }`}
              >
                {creatine.completed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{creatine.takenDose || 5}g Ingerido</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tomar 5g</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 2. WHEY PROTEIN */}
        {whey && (
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              whey.completed
                ? 'bg-sky-500/[0.06] border-sky-500/40'
                : 'bg-black/40 border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-sky-500/15 text-sky-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-black text-white block">Whey Protein</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {whey.takenDose || 0}g / {whey.targetDose}g proteína
                  </span>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-sky-400">
                {Math.min(100, Math.round(((whey.takenDose || 0) / (whey.targetDose || 30)) * 100))}%
              </span>
            </div>

            {/* Protein bar */}
            <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden my-2 border border-white/[0.06]">
              <div
                className="bg-sky-400 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round(((whey.takenDose || 0) / (whey.targetDose || 30)) * 100))}%`,
                }}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAddDose(whey.id, 30)}
                className="flex-1 py-1 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-[11px] font-bold border border-white/[0.06] transition-all cursor-pointer active:scale-95"
              >
                + 1 Scoop (30g)
              </button>
              <button
                type="button"
                onClick={() => onAddDose(whey.id, 60)}
                className="flex-1 py-1 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-[11px] font-bold border border-white/[0.06] transition-all cursor-pointer active:scale-95"
              >
                + 2 Scoops (60g)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. VITAMINAS & MICRONUTRIENTES CHECKLIST */}
      {vitamins.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Vitaminas & Micronutrientes
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {vitamins.filter(v => v.completed).length}/{vitamins.length} tomadas
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {vitamins.map(vit => (
              <button
                key={vit.id}
                type="button"
                onClick={() => onToggleItem(vit.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                  vit.completed
                    ? 'bg-[#ccff00]/10 border-[#ccff00]/40 text-[#ccff00]'
                    : 'bg-black/40 border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition-all ${
                    vit.completed
                      ? 'bg-[#ccff00] border-[#ccff00] text-black'
                      : 'border-white/30 bg-transparent'
                  }`}
                >
                  {vit.completed && <CheckCircle2 className="w-3 h-3 fill-current" />}
                </div>
                <span>{vit.name}</span>
                <span className="text-[10px] opacity-70 font-mono">
                  {vit.targetDose} {vit.unit}
                </span>
                {vit.timeTaken && (
                  <span className="text-[9px] font-mono text-slate-500 ml-1">
                    {vit.timeTaken}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
