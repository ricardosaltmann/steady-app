import React, { useState } from 'react';
import { Heart, Flame, Smile, Moon, Droplets, X, Check } from 'lucide-react';
import { getLocalDateKey } from '../../lib/dateUtils';

export interface SymptomFormData {
  date: string;
  energy: number;
  libido: number;
  mood: number;
  sleep: number;
  acne: number;
  waterRetention: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  notes?: string;
}

interface SymptomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SymptomFormData) => void;
  initialDate?: string;
}

export const SymptomModal: React.FC<SymptomModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
}) => {
  const [sympDate, setSympDate] = useState(initialDate || getLocalDateKey());
  const [energy, setEnergy] = useState<number>(4);
  const [libido, setLibido] = useState<number>(4);
  const [mood, setMood] = useState<number>(4);
  const [sleep, setSleep] = useState<number>(4);
  const [acne] = useState<number>(1);
  const [waterRetention, setWaterRetention] = useState<number>(1);
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [sympNotes, setSympNotes] = useState<string>('');

  if (!isOpen) return null;

  const renderRatingButtons = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    icon: React.ReactNode,
    invertColors = false
  ) => (
    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-bold text-white text-xs">{value}/5</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(rating => {
          const isSelected = value === rating;
          let btnColor = 'bg-slate-900 text-slate-400 border-slate-800';
          if (isSelected) {
            if (invertColors) {
              btnColor = rating >= 4 
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm' 
                : 'bg-amber-600 text-white border-amber-500 shadow-sm';
            } else {
              btnColor = rating >= 4 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                : 'bg-blue-600 text-white border-blue-500 shadow-sm';
            }
          }

          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${btnColor}`}
            >
              {rating}
            </button>
          );
        })}
      </div>
    </div>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: sympDate,
      energy,
      libido,
      mood,
      sleep,
      acne,
      waterRetention,
      bloodPressureSystolic: systolic ? parseInt(systolic) : undefined,
      bloodPressureDiastolic: diastolic ? parseInt(diastolic) : undefined,
      notes: sympNotes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        <div className="p-4 sm:p-5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Check-in de Bem-Estar</h3>
              <p className="text-xs text-slate-400">Registre sua percepção corporal e sinais vitais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Data</label>
            <input
              type="date"
              required
              value={sympDate}
              onChange={e => setSympDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {renderRatingButtons('Energia & Disposição', energy, setEnergy, <Flame className="w-4 h-4 text-amber-400" />)}
          {renderRatingButtons('Libido', libido, setLibido, <Heart className="w-4 h-4 text-rose-400" />)}
          {renderRatingButtons('Humor & Foco', mood, setMood, <Smile className="w-4 h-4 text-blue-400" />)}
          {renderRatingButtons('Qualidade do Sono', sleep, setSleep, <Moon className="w-4 h-4 text-indigo-400" />)}
          {renderRatingButtons('Retenção Hídrica (Inchaço)', waterRetention, setWaterRetention, <Droplets className="w-4 h-4 text-cyan-400" />, true)}

          {/* Pressão Arterial */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Pressão Arterial (mmHg)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={systolic}
                onChange={e => setSystolic(e.target.value)}
                placeholder="Sistólica (ex: 120)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                value={diastolic}
                onChange={e => setDiastolic(e.target.value)}
                placeholder="Diastólica (ex: 80)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notas do Dia</label>
            <input
              type="text"
              value={sympNotes}
              onChange={e => setSympNotes(e.target.value)}
              placeholder="Ex: Treino rendeu muito bem, sem dores de cabeça"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

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
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Registro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
