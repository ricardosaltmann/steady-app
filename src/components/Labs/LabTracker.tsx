import React, { useState } from 'react';
import { LabResult, LabMarker } from '../../types';
import { DEFAULT_LAB_MARKERS } from '../../lib/defaultCompounds';
import { Activity, Plus, Calendar, Trash2, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface LabTrackerProps {
  labs: LabResult[];
  onSaveLab: (lab: LabResult) => void;
  onDeleteLab: (id: string) => void;
}

export const LabTracker: React.FC<LabTrackerProps> = ({
  labs,
  onSaveLab,
  onDeleteLab,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [labName, setLabName] = useState('Laboratório Dasa / Fleury');
  const [notes, setNotes] = useState('');

  // Values for common markers in the modal form
  const [markerValues, setMarkerValues] = useState<Record<string, string>>({
    total_t: '750',
    free_t: '21',
    e2: '32',
    shbg: '30',
    hematocrit: '46',
    prolactin: '8.5',
    glucose: '85',
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

  // Helper to check marker status against male standard reference
  const getMarkerStatus = (code: string, value: number) => {
    const markerDef = DEFAULT_LAB_MARKERS.find(m => m.code === code);
    if (!markerDef || !markerDef.maleRef) return 'normal';
    if (value > markerDef.maleRef.max) return 'high';
    if (value < markerDef.maleRef.min) return 'low';
    return 'normal';
  };

  const markerMap = new Map(DEFAULT_LAB_MARKERS.map(m => [m.code, m]));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Exames Laboratoriais & Marcadores ({labs.length})
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe a resposta fisiológica real aos seus protocolos
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Exame</span>
        </button>
      </div>

      {/* Lab Results Cards */}
      {labs.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
          <Activity className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-semibold text-white">Nenhum exame cadastrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Cadastre seus exames de sangue para calibrar a curva farmacocinética e acompanhar sua saúde metabólica.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md"
          >
            Adicionar Primeiro Exame
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {labs.map(lab => {
            const dateObj = new Date(lab.date);
            const formattedDate = dateObj.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            });

            return (
              <div
                key={lab.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4"
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
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('Excluir este exame?')) onDeleteLab(lab.id);
                    }}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Grid of Biomarkers */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {lab.markers.map(m => {
                    const def = markerMap.get(m.markerCode);
                    const name = def?.name || m.markerCode;
                    const status = getMarkerStatus(m.markerCode, m.value);

                    const statusBadge = {
                      normal: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
                      high: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
                      low: 'text-blue-400 bg-blue-950/40 border-blue-800/40',
                    }[status];

                    return (
                      <div
                        key={m.markerCode}
                        className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-1"
                      >
                        <span className="text-[11px] font-medium text-slate-400 truncate block">
                          {name}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-extrabold text-white">
                            {m.value}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {m.unit}
                          </span>
                        </div>
                        {def?.maleRef && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] text-slate-400">
                              Ref: {def.maleRef.min} - {def.maleRef.max}
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${statusBadge}`}>
                              {status === 'normal' ? 'OK' : status === 'high' ? 'Alto' : 'Baixo'}
                            </span>
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

      {/* New Lab Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Adicionar Novo Exame de Sangue
            </h3>

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

              {/* Markers Form Inputs */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Marcadores Sanguíneos
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {DEFAULT_LAB_MARKERS.slice(0, 8).map(marker => (
                    <div key={marker.code} className="space-y-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <label className="text-[11px] text-slate-300 truncate block font-medium">
                        {marker.name} ({marker.unit})
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ex: 750"
                        value={markerValues[marker.code] || ''}
                        onChange={e => handleMarkerChange(marker.code, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md"
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
