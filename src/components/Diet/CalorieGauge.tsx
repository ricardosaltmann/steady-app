import React from 'react';
import { DailyDietData } from '../../types';
import { dietStorage } from '../../lib/diet/dietStorage';
import { Flag, Utensils, Flame } from 'lucide-react';

interface CalorieGaugeProps {
  dietData: DailyDietData;
}

export const CalorieGauge: React.FC<CalorieGaugeProps> = ({ dietData }) => {
  const totals = dietStorage.calculateDailyTotals(dietData);
  const { goals } = dietData;

  const isOver = totals.remainingCalories < 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, totals.progressPercent) / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Top Calorie Balance: Ring + Breakdown */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 p-2">
        {/* Left: Circular Calorie Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 130 130">
            {/* Background track */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Active progress ring */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              stroke={isOver ? '#f43f5e' : '#ccff00'}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center text (MyFitnessPal style) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                isOver ? 'text-rose-400' : 'text-white'
              }`}
            >
              {Math.abs(totals.remainingCalories)}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isOver ? 'Excesso' : 'Restantes'}
            </span>
          </div>
        </div>

        {/* Right: Formula Breakdown (Restantes = Meta - Alimento + Exercício) */}
        <div className="flex-1 w-full space-y-2.5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <Flag className="w-3.5 h-3.5 text-slate-400" />
              <span>Meta base</span>
            </div>
            <span className="font-mono text-xs font-bold text-white">
              {goals.calories} kcal
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <Utensils className="w-3.5 h-3.5 text-sky-400" />
              <span>Alimentos</span>
            </div>
            <span className="font-mono text-xs font-bold text-sky-400">
              {totals.foodCalories} kcal
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Exercício</span>
            </div>
            <span className="font-mono text-xs font-bold text-amber-400">
              {dietData.exerciseCaloriesBurned || 0} kcal
            </span>
          </div>
        </div>
      </div>

      {/* 3 Macro Progress Bars (Protein, Carbs, Fat) */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* PROTEIN */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Proteínas</span>
            <span className="font-mono font-black text-rose-400">
              {totals.totalProtein}g
            </span>
          </div>
          <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/[0.05]">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((totals.totalProtein / (goals.proteinGrams || 1)) * 100))}%`,
              }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono text-right">
            Meta: {goals.proteinGrams}g
          </div>
        </div>

        {/* CARBS */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Carboidratos</span>
            <span className="font-mono font-black text-sky-400">
              {totals.totalCarbs}g
            </span>
          </div>
          <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/[0.05]">
            <div
              className="bg-sky-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((totals.totalCarbs / (goals.carbsGrams || 1)) * 100))}%`,
              }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono text-right">
            Meta: {goals.carbsGrams}g
          </div>
        </div>

        {/* FAT */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Gorduras</span>
            <span className="font-mono font-black text-amber-400">
              {totals.totalFat}g
            </span>
          </div>
          <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/[0.05]">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((totals.totalFat / (goals.fatGrams || 1)) * 100))}%`,
              }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono text-right">
            Meta: {goals.fatGrams}g
          </div>
        </div>
      </div>
    </div>
  );
};
