import React, { useEffect } from 'react';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { Timer, X, Plus, Minus } from 'lucide-react';

export const RestTimerFloating: React.FC = () => {
  const { restTimer, tickRestTimer, stopRestTimer, adjustRestTimer } = useWorkoutStore();

  useEffect(() => {
    if (!restTimer.active) return;
    const interval = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer.active, tickRestTimer]);

  if (!restTimer.active || restTimer.remainingSeconds <= 0) return null;

  const mins = Math.floor(restTimer.remainingSeconds / 60);
  const secs = restTimer.remainingSeconds % 60;
  const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  const pct = restTimer.initialSeconds > 0
    ? Math.max(0, Math.min(100, (restTimer.remainingSeconds / restTimer.initialSeconds) * 100))
    : 0;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-bounce-short">
      <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 shadow-2xl shadow-cyan-950/80 rounded-full px-4 py-2.5 flex items-center gap-3.5 text-white ring-1 ring-cyan-400/30">
        {/* Pulsing Timer Icon */}
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/60 flex items-center justify-center">
            <Timer className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          {/* Circular progress highlight indicator */}
          <div
            className="absolute inset-0 rounded-full border-2 border-cyan-400 pointer-events-none transition-all duration-1000"
            style={{ opacity: pct / 100 }}
          />
        </div>

        {/* Text countdown */}
        <div className="flex flex-col">
          <span className="text-[10px] text-cyan-300 font-semibold uppercase tracking-wider leading-none">
            Descanso {restTimer.exerciseName ? `• ${restTimer.exerciseName}` : ''}
          </span>
          <span className="text-lg font-black tracking-tight text-white font-mono leading-tight">
            {timeFormatted}
          </span>
        </div>

        {/* Quick Adjustment Controls */}
        <div className="flex items-center gap-1 bg-slate-950/80 rounded-full p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => adjustRestTimer(-15)}
            className="px-2 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-all flex items-center gap-0.5"
            title="Reduzir 15 segundos"
          >
            <Minus className="w-2.5 h-2.5" /> 15s
          </button>
          <button
            type="button"
            onClick={() => adjustRestTimer(30)}
            className="px-2 py-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/60 rounded-full transition-all flex items-center gap-0.5"
            title="Acrescentar 30 segundos"
          >
            <Plus className="w-2.5 h-2.5" /> 30s
          </button>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={stopRestTimer}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Encerrar descanso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
