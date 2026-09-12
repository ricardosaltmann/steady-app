import React, { useState } from 'react';
import { Protocol, Compound, ProtocolFrequency } from '../../types';
import { Calendar, Plus, CheckCircle2, Clock, Trash2, Edit3, ShieldAlert, Sparkles } from 'lucide-react';

interface ProtocolManagerProps {
  protocols: Protocol[];
  compounds: Compound[];
  onSaveProtocol: (protocol: Protocol) => void;
  onDeleteProtocol: (id: string) => void;
  onToggleActive: (id: string) => void;
  onQuickLogFromProtocol: (protocol: Protocol) => void;
}

export const ProtocolManager: React.FC<ProtocolManagerProps> = ({
  protocols,
  compounds,
  onSaveProtocol,
  onDeleteProtocol,
  onToggleActive,
  onQuickLogFromProtocol,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [compoundId, setCompoundId] = useState(compounds[0]?.id || '');
  const [dose, setDose] = useState('50');
  const [route, setRoute] = useState<'IM' | 'SubQ' | 'Oral'>('IM');
  const [frequency, setFrequency] = useState<ProtocolFrequency>('every_3_5_days');
  const [intervalDays, setIntervalDays] = useState('3.5');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const openNewModal = () => {
    setEditingProtocol(null);
    setName('');
    setCompoundId(compounds[0]?.id || '');
    setDose('50');
    setRoute('IM');
    setFrequency('every_3_5_days');
    setIntervalDays('3.5');
    setStartDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Protocol) => {
    setEditingProtocol(p);
    setName(p.name);
    setCompoundId(p.compoundId);
    setDose(String(p.dose));
    setRoute(p.route);
    setFrequency(p.frequency);
    setIntervalDays(String(p.intervalDays || 3.5));
    setStartDate(p.startDate);
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDose = parseFloat(dose);
    if (isNaN(parsedDose) || parsedDose <= 0) return;

    const protocolToSave: Protocol = {
      id: editingProtocol ? editingProtocol.id : 'proto_' + Date.now(),
      name: name.trim() || 'Protocolo Sem Nome',
      compoundId,
      dose: parsedDose,
      route,
      frequency,
      intervalDays: frequency === 'every_x_days' ? parseFloat(intervalDays) || 3 : undefined,
      startDate,
      active: editingProtocol ? editingProtocol.active : true,
      notes: notes.trim() || undefined,
    };

    onSaveProtocol(protocolToSave);
    setIsModalOpen(false);
  };

  // Helper to compute weekly total dose
  const getWeeklyTotal = (p: Protocol, comp?: Compound) => {
    let multiplier = 1;
    switch (p.frequency) {
      case 'daily': multiplier = 7; break;
      case 'eod': multiplier = 3.5; break;
      case 'every_3_5_days': multiplier = 2; break;
      case 'weekly': multiplier = 1; break;
      case 'biweekly': multiplier = 0.5; break;
      case 'monthly': multiplier = 0.25; break;
      case 'every_x_days': multiplier = p.intervalDays ? 7 / p.intervalDays : 2; break;
    }
    const total = (p.dose * multiplier).toFixed(1);
    return `${total} ${comp?.unit || 'mg'}/semana`;
  };

  const frequencyLabels: Record<ProtocolFrequency, string> = {
    daily: 'Diário (Todo dia)',
    eod: 'DSDN (A cada 2 dias)',
    every_3_5_days: '2x por semana (Ex: Seg/Qui)',
    weekly: '1x por semana (Semanal)',
    biweekly: 'A cada 2 semanas (Quinzenal)',
    monthly: '1x por mês (Mensal)',
    every_x_days: 'Intervalo Personalizado em dias',
  };

  const compoundMap = new Map(compounds.map(c => [c.id, c]));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Protocolos Recorrentes ({protocols.length})
          </h2>
          <p className="text-xs text-slate-400">
            Define sua frequência e projeta sua curva sérica futura automaticamente
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Protocolo</span>
        </button>
      </div>

      {/* Protocol Cards */}
      {protocols.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
          <Calendar className="w-10 h-10 text-purple-400 mx-auto" />
          <h3 className="text-sm font-semibold text-white">Nenhum protocolo cadastrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Crie um protocolo para automatizar o cálculo das próximas doses e visualizar a projeção na curva sérica.
          </p>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md"
          >
            Criar Primeiro Protocolo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {protocols.map(p => {
            const comp = compoundMap.get(p.compoundId);
            return (
              <div
                key={p.id}
                className={`p-4 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between space-y-4 ${
                  p.active
                    ? 'bg-slate-900/90 border-slate-700/80 shadow-lg'
                    : 'bg-slate-950/40 border-slate-800/50 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: comp?.color || '#a855f7' }}
                        />
                        <h3 className="font-bold text-sm text-white">{p.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{comp?.name}</p>
                    </div>

                    <button
                      onClick={() => onToggleActive(p.id)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        p.active
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {p.active ? 'Ativo' : 'Pausado'}
                    </button>
                  </div>

                  {/* Badges / Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5">
                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        Dose por Aplicação
                      </span>
                      <div className="font-extrabold text-sm text-blue-400">
                        {p.dose} {comp?.unit || 'mg'} ({p.route})
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 space-y-0.5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        Equivalente Semanal
                      </span>
                      <div className="font-extrabold text-sm text-purple-400">
                        {getWeeklyTotal(p, comp)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{frequencyLabels[p.frequency]}</span>
                  </div>

                  {p.notes && (
                    <p className="text-xs text-slate-400 italic mt-2">
                      "{p.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onQuickLogFromProtocol(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Aplicar Esta Dose</span>
                  </button>

                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Excluir o protocolo "${p.name}"?`)) {
                        onDeleteProtocol(p.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Protocol Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingProtocol ? 'Editar Protocolo' : 'Novo Protocolo Recorrente'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nome do Protocolo</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: TRT Seg/Qui, Ozempic Domingo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Composto</label>
                <select
                  value={compoundId}
                  onChange={e => setCompoundId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <optgroup label="💉 ESTEROIDES & TRT">
                    {compounds.filter(c => c.category === 'steroid').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.subcategory ? `• ${c.subcategory}` : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🧬 PEPTÍDEOS & GLP-1">
                    {compounds.filter(c => c.category === 'peptide').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.subcategory ? `• ${c.subcategory}` : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🛡️ FERTILIDADE & TPC">
                    {compounds.filter(c => c.category === 'fertility').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🌸 FEMININO / HRT">
                    {compounds.filter(c => c.category === 'estrogen').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Dose por Aplicação</label>
                  <input
                    type="number"
                    step="any"
                    value={dose}
                    onChange={e => setDose(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Via</label>
                  <select
                    value={route}
                    onChange={e => setRoute(e.target.value as 'IM' | 'SubQ' | 'Oral')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="IM">Intramuscular (IM)</option>
                    <option value="SubQ">Subcutânea (SubQ)</option>
                    <option value="Oral">Oral (Comprimido)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Frequência</label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value as ProtocolFrequency)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="every_3_5_days">2x por semana (Ex: Seg/Qui ou Ter/Sex)</option>
                  <option value="weekly">1x por semana (Semanal)</option>
                  <option value="eod">DSDN (A cada 2 dias / Dia Sim Dia Não)</option>
                  <option value="daily">Diário (Todo dia)</option>
                  <option value="biweekly">A cada 2 semanas (Quinzenal)</option>
                  <option value="every_x_days">A cada X dias customizado</option>
                </select>
              </div>

              {frequency === 'every_x_days' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Intervalo em dias</label>
                  <input
                    type="number"
                    step="0.5"
                    value={intervalDays}
                    onChange={e => setIntervalDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Data de Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Notas Adicionais</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ex: Prescrição Dr. Silva, retorno em 90 dias"
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md"
                >
                  Salvar Protocolo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
