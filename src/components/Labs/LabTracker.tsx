import React, { useState } from 'react';
import { LabResult, LabMarker } from '../../types';
import { DEFAULT_LAB_MARKERS } from '../../lib/defaultCompounds';
import { evaluateMarkerStatus, getTE2Ratio } from '../../lib/labAnalysis';
import { getLocalDateKey } from '../../lib/dateUtils';
import { LabEvolutionChart } from './LabEvolutionChart';
import { Activity, Plus, Calendar, Trash2, Scale, X, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface LabTrackerProps {
  labs: LabResult[];
  gender?: 'male' | 'female' | 'other';
  onSaveLab: (lab: LabResult) => void;
  onDeleteLab: (id: string) => void;
}

export const LabTracker: React.FC<LabTrackerProps> = ({
  labs,
  gender = 'male',
  onSaveLab,
  onDeleteLab,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(getLocalDateKey());
  const [labName, setLabName] = useState('Laboratório Dasa / Fleury');
  const [notes, setNotes] = useState('');

  // Valores padrão para o formulário de cadastro de novo exame
  const [markerValues, setMarkerValues] = useState<Record<string, string>>({
    total_t: '750',
    free_t: '21',
    e2: '32',
    shbg: '30',
    hematocrit: '46',
    prolactin: '8.5',
    glucose: '85',
    hba1c: '5.2',
    alt: '25',
  });

  const handleMarkerChange = (code: string, val: string) => {
    setMarkerValues(prev => ({ ...prev, [code]: val }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const markersToSave = Object.entries(markerValues)
      .filter(([_, val]) => val.trim() !== '')
      .map(([code, val]) => {
        const markerDef = DEFAULT_LAB_MARKERS.find(m => m.code === code);
        return {
          markerCode: code,
          value: parseFloat(val) || 0,
          unit: markerDef?.unit || '',
        };
      });

    const newLab: LabResult = {
      id: 'lab_' + Date.now(),
      date,
      labName: labName.trim() || undefined,
      notes: notes.trim() || undefined,
      markers: markersToSave,
    };

    onSaveLab(newLab);
    setIsModalOpen(false);
  };

  const markerMap = new Map(DEFAULT_LAB_MARKERS.map(m => [m.code, m]));

  // Ordenar exames: mais recentes primeiro na listagem de histórico
  const sortedLabs = [...labs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-5">
      {/* Header Principal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Exames Laboratoriais & Marcadores ({labs.length})
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe a resposta fisiológica real aos seus protocolos e controle biomarcadores
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Exame</span>
        </button>
      </div>

      {/* 1. Gráfico de Acompanhamento (Evolução Longitudinal) */}
      <LabEvolutionChart labs={labs} gender={gender} />

      {/* 2. Histórico de Exames / Cards de Biomarcadores */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Histórico de Coletas Registradas
          </h3>
          <span className="text-xs text-slate-400">
            {labs.length} {labs.length === 1 ? 'coleta' : 'coletas'}
          </span>
        </div>

        {sortedLabs.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
            <Activity className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold text-white">Nenhum exame cadastrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cadastre seus exames de sangue para calibrar a curva farmacocinética, verificar a relação T:E2 e acompanhar sua saúde metabólica.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md"
            >
              Adicionar Primeiro Exame
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLabs.map(lab => {
              const dateObj = new Date(lab.date + 'T12:00:00');
              const formattedDate = dateObj.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });

              // Relação T:E2 para este exame
              const te2Data = getTE2Ratio(lab, labs);

              return (
                <div
                  key={lab.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-bold text-sm text-white">{formattedDate}</h3>
                      </div>
                      {lab.labName && (
                        <p className="text-xs text-slate-400 mt-0.5">{lab.labName}</p>
                      )}
                      {lab.notes && (
                        <p className="text-xs text-slate-400 italic mt-1">"{lab.notes}"</p>
                      )}

                      {/* Pill Smart Alert de Relação T:E2 para o Exame */}
                      {te2Data && (
                        <div className="pt-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${te2Data.badgeClass}`}
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Relação T:E2: {te2Data.text}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (confirm('Excluir este exame?')) onDeleteLab(lab.id);
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                      title="Excluir exame"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Grid de Biomarcadores com Badges Inteligentes */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {lab.markers.map(m => {
                      const def = markerMap.get(m.markerCode);
                      const name = def?.name || m.markerCode;
                      const ref = gender === 'female' ? def?.femaleRef : def?.maleRef;
                      const statusRes = evaluateMarkerStatus(
                        m.markerCode,
                        m.value,
                        lab.markers,
                        gender,
                        labs,
                        lab
                      );

                      const isProportional = statusRes.status === 'proportional';
                      const isHigh = statusRes.status === 'high';

                      return (
                        <div
                          key={m.markerCode}
                          className={`p-3 bg-slate-950/70 border rounded-2xl space-y-1 transition-all ${
                            isProportional
                              ? 'border-teal-500/40 bg-teal-950/15'
                              : isHigh
                              ? 'border-rose-900/40 bg-rose-950/10'
                              : 'border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-medium text-slate-400 truncate block">
                              {name}
                            </span>
                            {isProportional && (
                              <span className="text-[8px] font-extrabold text-teal-400 uppercase tracking-wider bg-teal-950/80 px-1 rounded border border-teal-800/60">
                                TRT
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold text-white">
                              {m.value}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {m.unit}
                            </span>
                          </div>

                          {ref && (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[9px] text-slate-400">
                                Ref: {ref.min} - {ref.max}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusRes.badgeClass}`}>
                                {statusRes.label}
                              </span>
                            </div>
                          )}

                          {/* Se for Estradiol e tiver relação T:E2 calculada */}
                          {m.markerCode === 'e2' && statusRes.ratioTE2 && (
                            <div className="pt-1 border-t border-slate-800/80 text-[9px] text-teal-300 flex items-center justify-between">
                              <span>Relação T:E2:</span>
                              <strong className="font-bold">{statusRes.ratioTE2}:1</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Novo Exame */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Adicionar Novo Exame de Sangue
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Data da Coleta</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Laboratório</label>
                  <input
                    type="text"
                    value={labName}
                    onChange={e => setLabName(e.target.value)}
                    placeholder="ex: Fleury, Hermes Pardini"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Formulário de Marcadores Sanguíneos */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Marcadores Sanguíneos
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Preencha os marcadores disponíveis no laudo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {DEFAULT_LAB_MARKERS.map(marker => {
                    const mRef = gender === 'female' ? marker.femaleRef : marker.maleRef;
                    return (
                      <div key={marker.code} className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <label className="text-[11px] text-slate-300 truncate block font-medium">
                          {marker.name}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            placeholder={mRef ? `${mRef.min}` : '0'}
                            value={markerValues[marker.code] || ''}
                            onChange={e => handleMarkerChange(marker.code, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {marker.unit}
                          </span>
                        </div>
                        {mRef && (
                          <span className="text-[9px] text-slate-500 block">
                            Ref: {mRef.min} - {mRef.max}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Observações da Coleta</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ex: Coletado em jejum de 12h, no vale da injeção"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Salvar Exame
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
