import React, { useState } from 'react';
import { Scale, Ruler, X, Check } from 'lucide-react';
import { calculateIMC } from '../../domain/clinical/biometrics';
import { getLocalDateKey } from '../../lib/dateUtils';

export interface WeightFormData {
  date: string;
  weightKg: number;
  heightCm?: number;
  waistCm?: number;
  hipCm?: number;
  armCm?: number;
  thighCm?: number;
  bodyFatPercent?: number;
  notes?: string;
}

interface WeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WeightFormData) => void;
  defaultHeightCm: number;
  initialWeight?: number;
}

export const WeightModal: React.FC<WeightModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultHeightCm,
  initialWeight = 82.0,
}) => {
  const [weightDate, setWeightDate] = useState(getLocalDateKey());
  const [weightValue, setWeightValue] = useState<string>(String(initialWeight));
  const [heightInput, setHeightInput] = useState<string>(String(defaultHeightCm));
  const [waistCm, setWaistCm] = useState<string>('');
  const [hipCm, setHipCm] = useState<string>('');
  const [armCm, setArmCm] = useState<string>('');
  const [thighCm, setThighCm] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [weightNotes, setWeightNotes] = useState<string>('');

  if (!isOpen) return null;

  const previewWeightNum = parseFloat(weightValue) || 0;
  const previewHeightNum = parseFloat(heightInput) || defaultHeightCm;
  const previewIMC = calculateIMC(previewWeightNum, previewHeightNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wNum = parseFloat(weightValue);
    if (!wNum || isNaN(wNum)) return;

    const hNum = parseFloat(heightInput);

    onSave({
      date: weightDate,
      weightKg: wNum,
      heightCm: hNum || defaultHeightCm,
      waistCm: waistCm ? parseFloat(waistCm) : undefined,
      hipCm: hipCm ? parseFloat(hipCm) : undefined,
      armCm: armCm ? parseFloat(armCm) : undefined,
      thighCm: thighCm ? parseFloat(thighCm) : undefined,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : undefined,
      notes: weightNotes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Registrar Peso & Medidas</h3>
              <p className="text-xs text-slate-400">Calcula IMC e atualiza sua evolução corporal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Peso Corporal (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                required
                value={weightValue}
                onChange={e => setWeightValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sua Altura (cm)
              </label>
              <input
                type="number"
                min="100"
                max="240"
                required
                value={heightInput}
                onChange={e => setHeightInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Realtime IMC Preview Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">IMC Calculado:</span>
              <div className="text-lg font-black text-white flex items-baseline gap-2">
                <span>{previewIMC.value}</span>
                <span className="text-xs text-slate-400 font-semibold">kg/m²</span>
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-lg ${previewIMC.badgeBg}`}>
              {previewIMC.label}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Data da Medição</label>
            <input
              type="date"
              required
              value={weightDate}
              onChange={e => setWeightDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Medidas Corporais Opcionais */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-amber-400" />
              Medidas Corporais (Opcionais)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400">Cintura (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 82"
                  value={waistCm}
                  onChange={e => setWaistCm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Quadril (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 100"
                  value={hipCm}
                  onChange={e => setHipCm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Braço (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 39"
                  value={armCm}
                  onChange={e => setArmCm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Coxa (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 58"
                  value={thighCm}
                  onChange={e => setThighCm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">% Gordura (BF)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 15.5"
                  value={bodyFat}
                  onChange={e => setBodyFat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notas / Contexto</label>
            <input
              type="text"
              placeholder="Ex: Pesagem matinal em jejum, dia após aplicação"
              value={weightNotes}
              onChange={e => setWeightNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Pesagem</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
