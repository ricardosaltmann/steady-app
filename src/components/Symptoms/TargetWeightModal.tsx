import React, { useState } from 'react';
import { Target, X } from 'lucide-react';

interface TargetWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (targetWeightKg: number, heightCm: number) => void;
  initialTargetWeightKg?: number;
  currentHeightCm: number;
}

export const TargetWeightModal: React.FC<TargetWeightModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTargetWeightKg,
  currentHeightCm,
}) => {
  const [targetWeightInput, setTargetWeightInput] = useState<string>(
    initialTargetWeightKg ? String(initialTargetWeightKg) : ''
  );
  const [heightInput, setHeightInput] = useState<string>(String(currentHeightCm));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetW = parseFloat(targetWeightInput);
    const height = parseFloat(heightInput) || currentHeightCm;
    if (!isNaN(targetW)) {
      onSave(targetW, height);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        <div className="p-4 sm:p-5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Meta de Peso Corporal</h3>
              <p className="text-xs text-slate-400">Defina seu objetivo para acompanhar o progresso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Qual é a sua meta de peso? (kg)
            </label>
            <input
              type="number"
              step="0.5"
              required
              placeholder="Ex: 75.0"
              value={targetWeightInput}
              onChange={e => setTargetWeightInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Sua Altura (cm)
            </label>
            <input
              type="number"
              required
              value={heightInput}
              onChange={e => setHeightInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Salvar Meta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
