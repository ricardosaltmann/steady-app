import React, { useState, useMemo } from 'react';
import { Exercise, MuscleGroup, ExerciseEquipment } from '../../types';
import { DEFAULT_EXERCISES } from '../../domain/gym';
import { Search, X, Dumbbell, Filter, Check } from 'lucide-react';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectExercise,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');

  const muscles: { id: string; label: string }[] = [
    { id: 'all', label: 'Todos os Músculos' },
    { id: 'chest', label: 'Peito' },
    { id: 'back', label: 'Costas' },
    { id: 'lats', label: 'Dorsal' },
    { id: 'shoulders', label: 'Ombros' },
    { id: 'quads', label: 'Quadríceps' },
    { id: 'hamstrings', label: 'Posteriores' },
    { id: 'glutes', label: 'Glúteos' },
    { id: 'biceps', label: 'Bíceps' },
    { id: 'triceps', label: 'Tríceps' },
    { id: 'abs', label: 'Abdômen' },
    { id: 'calves', label: 'Panturrilhas' },
  ];

  const equipments: { id: string; label: string }[] = [
    { id: 'all', label: 'Qualquer Equipamento' },
    { id: 'barbell', label: 'Barra' },
    { id: 'dumbbell', label: 'Halteres' },
    { id: 'cable', label: 'Polia / Cabo' },
    { id: 'machine', label: 'Máquina' },
    { id: 'bodyweight', label: 'Peso Corporal' },
  ];

  const filteredExercises = useMemo(() => {
    return DEFAULT_EXERCISES.filter(ex => {
      const matchSearch =
        ex.name.toLowerCase().includes(search.toLowerCase()) ||
        ex.targetMuscle.toLowerCase().includes(search.toLowerCase());

      const matchMuscle =
        selectedMuscle === 'all' ||
        ex.targetMuscle === selectedMuscle ||
        ex.bodyPart === selectedMuscle ||
        ex.secondaryMuscles?.includes(selectedMuscle as MuscleGroup);

      const matchEquip = selectedEquipment === 'all' || ex.equipment === selectedEquipment;

      return matchSearch && matchMuscle && matchEquip;
    });
  }, [search, selectedMuscle, selectedEquipment]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Biblioteca de Exercícios</h3>
              <p className="text-xs text-slate-400">
                {filteredExercises.length} exercícios disponíveis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar exercício pelo nome ou músculo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {muscles.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMuscle(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedMuscle === m.id
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {filteredExercises.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhum exercício encontrado com esses filtros.
            </div>
          ) : (
            filteredExercises.map(ex => (
              <div
                key={ex.id}
                onClick={() => {
                  onSelectExercise(ex);
                  onClose();
                }}
                className="pt-2.5 first:pt-0 flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/60 transition-all cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {ex.name}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="capitalize px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-medium border border-slate-700">
                      {ex.targetMuscle}
                    </span>
                    <span className="capitalize text-slate-400">• {ex.equipment}</span>
                    {ex.isBodyweight && (
                      <span className="text-emerald-400">• Peso Corporal</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 group-hover:bg-cyan-600 text-slate-200 group-hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
