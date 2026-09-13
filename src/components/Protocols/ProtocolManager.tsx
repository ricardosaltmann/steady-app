import React, { useState } from 'react';
import { Protocol, Compound, ProtocolFrequency } from '../../types';
import { Calendar, Plus, CheckCircle2, Clock, Trash2, Edit3, ShieldAlert, Sparkles, Droplets, Syringe, X } from 'lucide-react';
import { formatCompoundDose, getWeeklyTotalDose } from '../../lib/doseFormatter';

interface ProtocolManagerProps {
  protocols: Protocol[];
  compounds: Compound[];
  onSaveProtocol: (protocol: Protocol) => void;
  onDeleteProtocol: (id: string) => Promise<boolean | void> | void;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const availableCompounds = compounds.filter(c => c.enabled !== false);
  const compsToUse = availableCompounds.length > 0 ? availableCompounds : compounds;
  const steroidComps = compsToUse.filter(c => c.category === 'steroid');
  const peptideComps = compsToUse.filter(c => c.category === 'peptide');
  const fertilityComps = compsToUse.filter(c => c.category === 'fertility');
  const estrogenComps = compsToUse.filter(c => c.category === 'estrogen');

  const firstEnabledComp = compsToUse[0] || compounds[0];
  const [name, setName] = useState('');
  const [compoundId, setCompoundId] = useState(firstEnabledComp?.id || '');
  const [dose, setDose] = useState('50');
  const [doseUnit, setDoseUnit] = useState<'mg' | 'mcg'>('mg');
  const [route, setRoute] = useState<'IM' | 'SubQ' | 'Oral'>('IM');
  const [frequency, setFrequency] = useState<ProtocolFrequency>('every_3_5_days');
  const [intervalDays, setIntervalDays] = useState('3.5');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Reconstitution states for peptides
  const [vialMg, setVialMg] = useState<string>('20');
  const [waterMl, setWaterMl] = useState<string>('2.6');

  const selectedComp = compsToUse.find(c => c.id === compoundId) || compsToUse[0] || compounds[0];
  const isPeptide = selectedComp?.category === 'peptide';

  const handleCompoundChange = (newCompId: string) => {
    setCompoundId(newCompId);
    const comp = compounds.find(c => c.id === newCompId);
    if (comp?.category === 'peptide') {
      setRoute('SubQ');
      setVialMg(String(comp.vialMg || 20));
      setWaterMl(String(comp.waterMl || 2.6));
      if (comp.unit === 'mcg') {
        setDoseUnit('mcg');
        setDose('100');
      } else {
        setDoseUnit('mg');
        setDose('2.5');
      }
    } else {
      setDoseUnit('mg');
      if (dose === '2.5' || dose === '100') setDose('50');
    }
  };

  const handleUnitToggle = (newUnit: 'mg' | 'mcg') => {
    if (newUnit === doseUnit) return;
    const val = parseFloat(dose);
    if (!isNaN(val) && val > 0) {
      if (newUnit === 'mcg') {
        // Converte mg -> mcg (ex: 0.1 mg -> 100 mcg; 2.5 mg -> 2500 mcg)
        setDose(String(parseFloat((val * 1000).toFixed(1))));
      } else {
        // Converte mcg -> mg (ex: 100 mcg -> 0.1 mg; 1000 mcg -> 1 mg)
        setDose(String(parseFloat((val / 1000).toFixed(3))));
      }
    }
    setDoseUnit(newUnit);
  };

  const openNewModal = () => {
    setEditingProtocol(null);
    setName('');
    const firstComp = compsToUse[0] || compounds[0];
    const firstCompId = firstComp?.id || '';
    setCompoundId(firstCompId);
    if (firstComp?.unit === 'mcg') {
      setDoseUnit('mcg');
      setDose('100');
      setRoute('SubQ');
      setVialMg(String(firstComp.vialMg || 20));
      setWaterMl(String(firstComp.waterMl || 2.6));
    } else if (firstComp?.category === 'peptide') {
      setDoseUnit('mg');
      setDose('2.5');
      setRoute('SubQ');
      setVialMg(String(firstComp.vialMg || 20));
      setWaterMl(String(firstComp.waterMl || 2.6));
    } else {
      setDoseUnit('mg');
      setDose('50');
      setRoute('IM');
      setVialMg('20');
      setWaterMl('2.6');
    }
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

    // Identificar a unidade correta
    let initialUnit: 'mg' | 'mcg' = 'mg';
    let initialDose = String(p.dose);

    if (p.unit) {
      initialUnit = p.unit;
    } else {
      // Se não tinha unidade gravada:
      // Se a dose for de 1 em diante (ex: 1, 2.5, 5, 50), entende como mg
      if (p.dose >= 1) {
        initialUnit = 'mg';
        initialDose = String(p.dose);
      } else {
        // Fração em mg (ex: 0.1 mg) representa 100 mcg
        initialUnit = 'mcg';
        initialDose = String(parseFloat((p.dose * 1000).toFixed(1)));
      }
    }

    setDoseUnit(initialUnit);
    setDose(initialDose);
    setRoute(p.route);
    setFrequency(p.frequency);
    setIntervalDays(String(p.intervalDays || 3.5));
    setStartDate(p.startDate);
    setNotes(p.notes || '');
    setVialMg(String(p.vialMg || 20));
    setWaterMl(String(p.waterMl || 2.6));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDose = parseFloat(dose);
    if (isNaN(parsedDose) || parsedDose <= 0) return;

    // Normalização para mg no cálculo volumétrico da seringa
    const doseInMg = doseUnit === 'mcg' ? parsedDose / 1000 : parsedDose;

    const numVialMg = parseFloat(vialMg) || undefined;
    const numWaterMl = parseFloat(waterMl) || undefined;
    let concentrationMgMl: number | undefined = undefined;
    let syringeUnits: number | undefined = undefined;

    if (numVialMg && numWaterMl && numWaterMl > 0) {
      concentrationMgMl = Number((numVialMg / numWaterMl).toFixed(2));
      syringeUnits = Number(((doseInMg / concentrationMgMl) * 100).toFixed(1));
    }

    const protocolToSave: Protocol = {
      id: editingProtocol ? editingProtocol.id : 'proto_' + Date.now(),
      name: name.trim() || 'Protocolo Sem Nome',
      compoundId,
      dose: parsedDose,
      unit: doseUnit,
      route,
      frequency,
      intervalDays: frequency === 'every_x_days' ? parseFloat(intervalDays) || 3 : undefined,
      startDate,
      active: editingProtocol ? editingProtocol.active : true,
      notes: notes.trim() || undefined,
      vialMg: isPeptide ? numVialMg : undefined,
      waterMl: isPeptide ? numWaterMl : undefined,
      concentrationMgMl: isPeptide ? concentrationMgMl : undefined,
      syringeUnits: isPeptide ? syringeUnits : undefined,
    };

    onSaveProtocol(protocolToSave);
    setIsModalOpen(false);
  };

  // Helper to compute weekly total dose
  const getWeeklyTotal = (p: Protocol, comp?: Compound) => {
    return getWeeklyTotalDose(p, comp);
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

  // Dose normalizada para cálculo da seringa em tempo real no formulário
  const currentDoseInMg = doseUnit === 'mcg' ? (parseFloat(dose) || 0) / 1000 : (parseFloat(dose) || 0);

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
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md transition-all active:scale-95 cursor-pointer"
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
            const normDoseInMg = p.unit === 'mcg' ? p.dose / 1000 : (p.dose >= 1000 ? p.dose / 1000 : p.dose);
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
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
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
                        {formatCompoundDose(p.dose, comp?.unit, p.unit).fullText} ({p.route})
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

                  {p.vialMg && p.waterMl && (
                    <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs flex items-center justify-between">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                        Frasco {p.vialMg}mg em {p.waterMl}mL
                      </span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Syringe className="w-3.5 h-3.5" />
                        {p.syringeUnits || ((normDoseInMg / (p.vialMg / p.waterMl)) * 100).toFixed(1)} UI
                      </span>
                    </div>
                  )}

                  {p.notes && (
                    <p className="text-xs text-slate-400 italic mt-2">
                      "{p.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onQuickLogFromProtocol(p)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Syringe className="w-3.5 h-3.5" />
                      <span>Tomar Dose</span>
                    </button>

                    <button
                      disabled={deletingId === p.id}
                      onClick={async () => {
                        if (window.confirm(`Deseja realmente excluir o protocolo "${p.name}"? Esta ação é definitiva.`)) {
                          try {
                            setDeletingId(p.id);
                            await onDeleteProtocol(p.id);
                          } finally {
                            setDeletingId(null);
                          }
                        }
                      }}
                      className="p-1.5 rounded-xl hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                      title="Excluir protocolo"
                    >
                      {deletingId === p.id ? (
                        <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New / Edit Protocol Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                {editingProtocol ? 'Editar Protocolo' : 'Novo Protocolo Recorrente'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                  onChange={e => handleCompoundChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  {steroidComps.length > 0 && (
                    <optgroup label="💉 ESTEROIDES & TRT">
                      {steroidComps.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.subcategory ? `• ${c.subcategory}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {peptideComps.length > 0 && (
                    <optgroup label="🧬 PEPTÍDEOS & GLP-1">
                      {peptideComps.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.subcategory ? `• ${c.subcategory}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {fertilityComps.length > 0 && (
                    <optgroup label="🛡️ FERTILIDADE & TPC">
                      {fertilityComps.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {estrogenComps.length > 0 && (
                    <optgroup label="🌸 FEMININO / HRT">
                      {estrogenComps.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Seção de Reconstituição e Diluição para Peptídeos */}
              {isPeptide && (
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5" />
                      Parâmetros de Diluição do Peptídeo
                    </span>
                    <span className="text-[10px] text-slate-400">Padrão Clínico</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300 flex items-center justify-between">
                        <span>Peptídeo no Frasco</span>
                        <span className="text-emerald-400 font-bold text-[10px]">em mg</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={vialMg}
                        onChange={e => setVialMg(e.target.value)}
                        placeholder="ex: 20"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                        required
                      />
                      <div className="flex gap-1 pt-0.5">
                        {['5', '10', '20'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setVialMg(val)}
                            className={`flex-1 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                              vialMg === val
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {val}mg
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300 flex items-center justify-between">
                        <span>Água Bacteriostática</span>
                        <span className="text-cyan-400 font-bold text-[10px]">em mL</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={waterMl}
                        onChange={e => setWaterMl(e.target.value)}
                        placeholder="ex: 2.6"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                        required
                      />
                      <div className="flex gap-1 pt-0.5">
                        {['1.0', '2.0', '2.6', '3.0'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setWaterMl(val)}
                            className={`flex-1 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                              waterMl === val
                                ? 'bg-cyan-600 border-cyan-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {val}mL
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Concentração e UI calculadas usando a dose em mg */}
                  {parseFloat(vialMg) > 0 && parseFloat(waterMl) > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-900/40 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Concentração Resultante:</span>
                        <strong className="text-slate-200">
                          {(parseFloat(vialMg) / parseFloat(waterMl)).toFixed(2)} mg/mL
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Seringa (U-100):</span>
                        <strong className="text-emerald-400 text-sm">
                          {((currentDoseInMg / (parseFloat(vialMg) / parseFloat(waterMl))) * 100).toFixed(1)} UI
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Dose por Aplicação com Seletor de Unidade [ mcg | mg ] */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Dose por Aplicação</label>
                    <div className="inline-flex items-center bg-slate-900 border border-slate-700/80 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleUnitToggle('mcg')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          doseUnit === 'mcg'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        mcg
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnitToggle('mg')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          doseUnit === 'mg'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        mg
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={dose}
                      onChange={e => setDose(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-purple-500 pr-12"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      {doseUnit}
                    </span>
                  </div>

                  {/* Dica de Equivalência Inteligente */}
                  {dose && parseFloat(dose) > 0 && (
                    <div className="text-[10px] text-slate-400 pt-0.5">
                      {doseUnit === 'mcg' ? (
                        parseFloat(dose) >= 1000 ? (
                          <span className="text-purple-300 font-semibold">
                            = {parseFloat((parseFloat(dose) / 1000).toFixed(2))} mg
                          </span>
                        ) : (
                          <span>= {parseFloat((parseFloat(dose) / 1000).toFixed(3))} mg</span>
                        )
                      ) : (
                        parseFloat(dose) < 1 ? (
                          <span className="text-purple-300 font-semibold">
                            = {parseFloat((parseFloat(dose) * 1000).toFixed(0))} mcg
                          </span>
                        ) : (
                          <span>= {parseFloat((parseFloat(dose) * 1000).toFixed(0))} mcg</span>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Via</label>
                  <select
                    value={route}
                    onChange={e => setRoute(e.target.value as 'IM' | 'SubQ' | 'Oral')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
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
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md cursor-pointer transition-all active:scale-95"
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
