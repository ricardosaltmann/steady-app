import React, { useState } from 'react';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { Routine } from '../../types';
import {
  Calendar,
  Play,
  Dumbbell,
  BarChart3,
  Layers,
} from 'lucide-react';
import { UnifiedAnatomyMap } from '../Anatomy/UnifiedAnatomyMap';
import { GymStatsView } from './GymStatsView';

interface RoutineManagerProps {
  onStartRoutine: (routine: Routine) => void;
}

export const RoutineManager: React.FC<RoutineManagerProps> = ({ onStartRoutine }) => {
  const { routines, history } = useWorkoutStore();
  const [activeGymTab, setActiveGymTab] = useState<'routines' | 'stats'>('routines');

  // Group past workouts by routine to show stats
  const totalCompletedWorkouts = history.length;
  const totalVolumeAllTime = history.reduce((acc, w) => acc + (w.totalVolumeKg || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Segmented Tab Controller (openGym style) */}
      <div className="flex items-center gap-1.5 p-1 bg-[#10121a]/90 border border-white/[0.08] rounded-2xl w-full sm:w-fit shadow-lg backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setActiveGymTab('routines')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeGymTab === 'routines'
              ? 'bg-[#ccff00] text-black shadow-md shadow-[#ccff00]/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>Rotinas & Treinos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGymTab('stats')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeGymTab === 'stats'
              ? 'bg-[#ccff00] text-black shadow-md shadow-[#ccff00]/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Estatísticas & Músculos (openGym)</span>
        </button>
      </div>

      {/* VIEW 1: OPEN-GYM STATS (HEATMAP & MUSCLE BALANCE) */}
      {activeGymTab === 'stats' && (
        <GymStatsView history={history} />
      )}

      {/* VIEW 2: ROUTINES MANAGER */}
      {activeGymTab === 'routines' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-white">Rotinas de Treino & Hipertrofia</h2>
              </div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Periodização científica com progressão linear e controle de RIR sincronizado à farmacocinética.
              </p>
            </div>

            {/* Global Workout Stats */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="bg-black/40 border border-white/[0.06] rounded-2xl px-4 py-2 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sessões</span>
                <span className="text-base font-black text-white">{totalCompletedWorkouts}</span>
              </div>
              <div className="bg-black/40 border border-white/[0.06] rounded-2xl px-4 py-2 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Volume Total</span>
                <span className="text-base font-black text-[#ccff00] font-mono">
                  {(totalVolumeAllTime / 1000).toFixed(1)}t
                </span>
              </div>
            </div>
          </div>

      {/* Routines List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 px-1">
          <Calendar className="w-4 h-4 text-cyan-400" />
          Rotinas Programadas ({routines.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routines.map(routine => (
            <div
              key={routine.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{routine.emoji || '⚡'}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {routine.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-tight line-clamp-1">
                        {routine.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Exercises summary badges */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {routine.exercises.length} Exercícios:
                  </span>
                  <div className="space-y-1">
                    {routine.exercises.slice(0, 3).map((ex, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-300 flex items-center justify-between bg-slate-950/60 rounded-xl px-2.5 py-1 border border-slate-800/60"
                      >
                        <span className="truncate pr-2">{ex.exerciseName}</span>
                        <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                          {ex.defaultSets}x{ex.targetRepRange?.[0] || 10}
                        </span>
                      </div>
                    ))}
                    {routine.exercises.length > 3 && (
                      <div className="text-[10px] text-slate-400 text-center pt-0.5">
                        +{routine.exercises.length - 3} outros exercícios
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Start Workout Button */}
              <button
                type="button"
                onClick={() => onStartRoutine(routine)}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#ccff00] hover:bg-[#bfe600] text-black font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#ccff00]/20 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Treino</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Muscle Fatigue & Readiness Heatmap */}
      <UnifiedAnatomyMap
        mode="fatigue"
        workoutSessions={history}
        className="mt-6"
      />
        </div>
      )}
    </div>
  );
};
