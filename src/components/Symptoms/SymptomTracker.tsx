import React, { useState } from 'react';
import { SymptomLog } from '../../types';
import { Heart, Plus, Calendar, Smile, Moon, Flame, Droplets, Trash2, Gauge } from 'lucide-react';

interface SymptomTrackerProps {
  symptoms: SymptomLog[];
  onSaveSymptom: (log: SymptomLog) => void;
  onDeleteSymptom: (id: string) => void;
}

export const SymptomTracker: React.FC<SymptomTrackerProps> = ({
  symptoms,
  onSaveSymptom,
  onDeleteSymptom,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [energy, setEnergy] = useState<number>(4);
  const [libido, setLibido] = useState<number>(4);
  const [mood, setMood] = useState<number>(4);
  const [sleep, setSleep] = useState<number>(4);
  const [acne, setAcne] = useState<number>(1);
  const [waterRetention, setWaterRetention] = useState<number>(1);
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [weightKg, setWeightKg] = useState<string>('82.0');
  const [notes, setNotes] = useState<string>('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const newLog: SymptomLog = {
      id: 'symp_' + Date.now(),
      date,
      energy,
      libido,
      mood,
      sleep,
      acne,
      waterRetention,
      bloodPressureSystolic: systolic ? parseInt(systolic) : undefined,
      bloodPressureDiastolic: diastolic ? parseInt(diastolic) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      notes: notes.trim() || undefined,
    };

    onSaveSymptom(newLog);
    setIsModalOpen(false);
  };

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
              // Higher is worse (e.g. acne, retention)
              btnColor = rating >= 4 
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm' 
                : 'bg-amber-600 text-white border-amber-500 shadow-sm';
            } else {
              // Higher is better (e.g. energy, libido, mood)
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
              className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${btnColor}`}
            >
              {rating}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-400" />
            Diário de Sintomas & Bem-Estar ({symptoms.length})
          </h2>
          <p className="text-xs text-slate-400">
            Monitore libido, energia, sono e colaterais para afinar sua dosagem
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Hoje</span>
        </button>
      </div>

      {/* Logs List */}
      {symptoms.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
          <Heart className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-sm font-semibold text-white">Nenhum registro diário</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Registre seu bem-estar diário para correlacionar picos e vales séricos com sua disposição e humor.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md"
          >
            Fazer Primeiro Registro
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {symptoms.map(log => {
            const dateObj = new Date(log.date);
            const formattedDate = dateObj.toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            });

            return (
              <div
                key={log.id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-sm text-white capitalize">{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {log.bloodPressureSystolic && log.bloodPressureDiastolic && (
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-lg text-slate-300 font-mono">
                        PA: {log.bloodPressureSystolic}/{log.bloodPressureDiastolic}
                      </span>
                    )}
                    {log.weightKg && (
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-lg text-slate-300 font-mono">
                        {log.weightKg} kg
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Excluir este diário?')) onDeleteSymptom(log.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges of ratings */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Energia:</span>
                    <span className="font-extrabold text-xs text-emerald-400">{log.energy}/5</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Libido:</span>
                    <span className="font-extrabold text-xs text-rose-400">{log.libido}/5</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Humor:</span>
                    <span className="font-extrabold text-xs text-blue-400">{log.mood}/5</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Sono:</span>
                    <span className="font-extrabold text-xs text-purple-400">{log.sleep}/5</span>
                  </div>
                </div>

                {(log.acne > 1 || log.waterRetention > 1) && (
                  <div className="flex items-center gap-3 text-xs text-amber-400 bg-amber-950/30 p-2 rounded-xl border border-amber-800/30">
                    {log.acne > 1 && <span>Acne/Oleosidade: Nível {log.acne}</span>}
                    {log.waterRetention > 1 && <span>Retenção de Líquidos: Nível {log.waterRetention}</span>}
                  </div>
                )}

                {log.notes && (
                  <p className="text-xs text-slate-400 italic">
                    "{log.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" />
              Check-in Diário de Sintomas
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Data do Registro</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {renderRatingButtons('Disposição / Energia', energy, setEnergy, <Flame className="w-3.5 h-3.5 text-amber-400" />)}
              {renderRatingButtons('Libido / Desejo Sexual', libido, setLibido, <Heart className="w-3.5 h-3.5 text-rose-400" />)}
              {renderRatingButtons('Humor / Bem-Estar Mental', mood, setMood, <Smile className="w-3.5 h-3.5 text-blue-400" />)}
              {renderRatingButtons('Qualidade do Sono', sleep, setSleep, <Moon className="w-3.5 h-3.5 text-purple-400" />)}
              {renderRatingButtons('Retenção Hídrica / Inchaço', waterRetention, setWaterRetention, <Droplets className="w-3.5 h-3.5 text-cyan-400" />, true)}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">Pressão Arterial (ex: 120/80)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="120"
                      value={systolic}
                      onChange={e => setSystolic(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                    />
                    <span className="text-slate-500">/</span>
                    <input
                      type="number"
                      placeholder="80"
                      value={diastolic}
                      onChange={e => setDiastolic(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">Peso Corporal (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="82.5"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Notas do Dia</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ex: Treino pesado de perna, sono tranquilo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md"
                >
                  Salvar Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
