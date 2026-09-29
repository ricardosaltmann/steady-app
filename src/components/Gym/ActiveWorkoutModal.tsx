import React, { useState, useEffect } from 'react';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import {
  Timer,
  Check,
  Plus,
  Trash2,
  Minimize2,
  CheckCircle2,
  X,
  Dumbbell,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ActiveWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActiveWorkoutModal: React.FC<ActiveWorkoutModalProps> = ({ isOpen, onClose }) => {
  const {
    activeSession,
    completeWorkout,
    cancelWorkout,
    addExerciseToSession,
    removeExerciseFromSession,
    addSetToExercise,
    updateSet,
    toggleSetCompleted,
    removeSet,
  } = useWorkoutStore();

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Ticking workout session timer
  useEffect(() => {
    if (!activeSession) return;
    const startMs = new Date(activeSession.startTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  if (!isOpen || !activeSession) return null;

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  // Current session metrics
  let totalVolumeKg = 0;
  let totalSetsCompleted = 0;
  activeSession.exercises.forEach(ex => {
    ex.sets.forEach(s => {
      if (s.completed) {
        totalSetsCompleted++;
        totalVolumeKg += (s.weightKg || 0) * (s.reps || 0);
      }
    });
  });

  const handleFinish = () => {
    const res = completeWorkout();
    if (res) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      onClose();
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Tem certeza de que deseja descartar esta sessão de treino?')) {
      cancelWorkout();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Floating Dashboard Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/40">
              <Dumbbell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                {activeSession.name}
              </h2>
              <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono font-bold text-cyan-400">
                  <Timer className="w-3.5 h-3.5" /> {timeFormatted}
                </span>
                <span>•</span>
                <span>{totalSetsCompleted} séries feitas</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{totalVolumeKg} kg volume</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Minimizar treino (continua rodando)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-950/60 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir</span>
            </button>
          </div>
        </div>

        {/* Exercises & Sets Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-6">
          {activeSession.exercises.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-slate-400 text-sm">Nenhum exercício adicionado a este treino.</p>
              <button
                type="button"
                onClick={() => setIsLibraryOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                + Adicionar Exercício da Biblioteca
              </button>
            </div>
          ) : (
            activeSession.exercises.map((exercise, eIdx) => (
              <div
                key={exercise.exerciseId + eIdx}
                className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 space-y-3"
              >
                {/* Exercise Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-black text-white">
                      {exercise.exerciseName}
                    </span>
                    {exercise.progression && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold uppercase">
                        {exercise.progression.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => removeExerciseFromSession(eIdx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                      title="Remover exercício"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800/80 pb-1">
                        <th className="py-1 px-1.5 w-12 text-center">Série</th>
                        <th className="py-1 px-1.5 w-24">Carga (kg)</th>
                        <th className="py-1 px-1.5 w-20">Reps</th>
                        <th className="py-1 px-1.5 w-16 text-center">RPE</th>
                        <th className="py-1 px-1.5 w-14 text-center">Feito</th>
                        <th className="py-1 px-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {exercise.sets.map((set, sIdx) => {
                        const isDone = set.completed;
                        return (
                          <tr
                            key={set.id}
                            className={`transition-colors ${
                              isDone ? 'bg-emerald-950/20' : 'hover:bg-slate-900/60'
                            }`}
                          >
                            {/* Set Number */}
                            <td className="py-2 px-1.5 text-center font-bold text-slate-400">
                              {set.setNumber}
                            </td>

                            {/* Weight (kg) */}
                            <td className="py-2 px-1.5">
                              <input
                                type="number"
                                step="0.5"
                                value={set.weightKg ?? ''}
                                onChange={e =>
                                  updateSet(eIdx, sIdx, {
                                    weightKg: parseFloat(e.target.value) || 0,
                                  })
                                }
                                disabled={isDone}
                                className={`w-full max-w-[80px] bg-slate-900 border rounded-lg px-2 py-1.5 font-bold text-sm text-center focus:outline-none ${
                                  isDone
                                    ? 'border-emerald-800/60 text-emerald-300'
                                    : 'border-slate-700 text-white focus:border-cyan-500'
                                }`}
                              />
                            </td>

                            {/* Reps */}
                            <td className="py-2 px-1.5">
                              <input
                                type="number"
                                step="1"
                                value={set.reps ?? ''}
                                onChange={e =>
                                  updateSet(eIdx, sIdx, {
                                    reps: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                disabled={isDone}
                                className={`w-full max-w-[70px] bg-slate-900 border rounded-lg px-2 py-1.5 font-bold text-sm text-center focus:outline-none ${
                                  isDone
                                    ? 'border-emerald-800/60 text-emerald-300'
                                    : 'border-slate-700 text-white focus:border-cyan-500'
                                }`}
                              />
                            </td>

                            {/* RPE */}
                            <td className="py-2 px-1.5 text-center">
                              <select
                                value={set.rpe ?? 8}
                                onChange={e =>
                                  updateSet(eIdx, sIdx, {
                                    rpe: parseFloat(e.target.value),
                                  })
                                }
                                disabled={isDone}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-slate-300 focus:outline-none"
                              >
                                <option value="10">10 (Falha)</option>
                                <option value="9">9 (1 RIR)</option>
                                <option value="8">8 (2 RIR)</option>
                                <option value="7">7 (3 RIR)</option>
                                <option value="6">6 (Leve)</option>
                              </select>
                            </td>

                            {/* Checkmark Complete Button */}
                            <td className="py-2 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => toggleSetCompleted(eIdx, sIdx)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all mx-auto ${
                                  isDone
                                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>
                            </td>

                            {/* Remove Set */}
                            <td className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeSet(eIdx, sIdx)}
                                className="text-slate-600 hover:text-rose-400 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Set Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => addSetToExercise(eIdx)}
                    className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Série
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add Exercise and Discard Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="flex-1 py-3 px-4 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Exercício</span>
            </button>

            <button
              type="button"
              onClick={handleDiscard}
              className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descartar Sessão</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exercise Library Picker Modal */}
      <ExerciseLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectExercise={addExerciseToSession}
      />
    </div>
  );
};
