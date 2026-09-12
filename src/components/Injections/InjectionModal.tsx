import React, { useState, useEffect } from 'react';
import { Compound, Injection, InjectionSite, Protocol } from '../../types';
import { BodySitePicker } from './BodySitePicker';
import { X, Syringe, Calendar, Clock, Calculator, Check, Sparkles, Droplets } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  compounds: Compound[];
  defaultCompoundId: string;
  onSaveInjection: (injection: Injection) => void;
  lastUsedSite?: InjectionSite;
  initialDose?: number;
  initialVolumeMl?: number;
  onOpenDilutionCalculator?: () => void;
  protocols?: Protocol[];
  selectedProtocol?: Protocol | null;
}

export const InjectionModal: React.FC<InjectionModalProps> = ({
  isOpen,
  onClose,
  compounds,
  defaultCompoundId,
  onSaveInjection,
  lastUsedSite,
  initialDose,
  initialVolumeMl,
  onOpenDilutionCalculator,
  protocols,
  selectedProtocol,
}) => {
  const [selectedCompoundId, setSelectedCompoundId] = useState(defaultCompoundId);
  const [dose, setDose] = useState<string>(initialDose ? String(initialDose) : '50');
  const [concentration, setConcentration] = useState<string>('200');
  const [vialMg, setVialMg] = useState<string>('20');
  const [waterMl, setWaterMl] = useState<string>('2.6');
  const [volumeMl, setVolumeMl] = useState<string>('0.25');
  const [volumeUnits, setVolumeUnits] = useState<string>('25');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [site, setSite] = useState<InjectionSite>('deltoid_right');
  const [route, setRoute] = useState<'IM' | 'SubQ'>('IM');
  const [needleInfo, setNeedleInfo] = useState<string>('30G 1/2"');
  const [notes, setNotes] = useState<string>('');
  const [protocolId, setProtocolId] = useState<string | undefined>(undefined);

  const availableCompounds = compounds.filter(c => c.enabled !== false);
  const compsToUse = availableCompounds.length > 0 ? availableCompounds : compounds;
  const currentCompound = compsToUse.find(c => c.id === selectedCompoundId) || compsToUse[0] || compounds[0];
  const steroidComps = compsToUse.filter(c => c.category === 'steroid');
  const peptideComps = compsToUse.filter(c => c.category === 'peptide');
  const fertilityComps = compsToUse.filter(c => c.category === 'fertility');
  const estrogenComps = compsToUse.filter(c => c.category === 'estrogen');

  // Helper to sync dose, concentration, mL and UI
  const updateCalculationsFromDoseAndConc = (newDose: string, newConc: string) => {
    setDose(newDose);
    setConcentration(newConc);
    const d = parseFloat(newDose);
    const c = parseFloat(newConc);
    if (!isNaN(d) && !isNaN(c) && c > 0) {
      const vol = d / c;
      const formattedMl = vol >= 1 ? vol.toFixed(2) : vol.toFixed(3).replace(/\.?0+$/, '');
      setVolumeMl(formattedMl);
      const units = Math.round(vol * 100 * 10) / 10;
      setVolumeUnits(String(units));
    }
  };

  const handleVialWaterChange = (newVial: string, newWater: string) => {
    setVialMg(newVial);
    setWaterMl(newWater);
    const v = parseFloat(newVial);
    const w = parseFloat(newWater);
    if (!isNaN(v) && !isNaN(w) && w > 0) {
      const calcConc = (v / w).toFixed(2);
      setConcentration(calcConc);
      updateCalculationsFromDoseAndConc(dose, calcConc);
    }
  };

  const handleUnitsChange = (newUnits: string) => {
    setVolumeUnits(newUnits);
    const u = parseFloat(newUnits);
    const c = parseFloat(concentration);
    if (!isNaN(u) && u >= 0) {
      const vol = u / 100;
      setVolumeMl(vol.toFixed(3).replace(/\.?0+$/, '') || '0');
      if (!isNaN(c) && c > 0) {
        const calculatedDose = vol * c;
        setDose(calculatedDose >= 1 ? calculatedDose.toFixed(1).replace(/\.0$/, '') : calculatedDose.toFixed(2));
      }
    }
  };

  const handleVolumeMlChange = (newVol: string) => {
    setVolumeMl(newVol);
    const vol = parseFloat(newVol);
    const c = parseFloat(concentration);
    if (!isNaN(vol) && vol >= 0) {
      const units = Math.round(vol * 100 * 10) / 10;
      setVolumeUnits(String(units));
      if (!isNaN(c) && c > 0) {
        const calculatedDose = vol * c;
        setDose(calculatedDose >= 1 ? calculatedDose.toFixed(1).replace(/\.0$/, '') : calculatedDose.toFixed(2));
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // 1. Check if there is an active protocol for this compound
    const targetProto = (selectedProtocol && selectedProtocol.compoundId === selectedCompoundId)
      ? selectedProtocol
      : protocols?.find(p => p.compoundId === selectedCompoundId && p.active);

    if (targetProto) {
      setProtocolId(targetProto.id);
      const protoDose = String(targetProto.dose);
      setDose(protoDose);
      const targetRoute = (targetProto.route as 'IM' | 'SubQ') || (currentCompound?.category === 'peptide' ? 'SubQ' : 'IM');
      setRoute(targetRoute);
      if (targetRoute === 'SubQ') {
        setSite('abdomen_center');
        setNeedleInfo('31G 5/16"');
      }

      if (currentCompound?.category === 'peptide') {
        const pVial = targetProto.vialMg || currentCompound.vialMg || 20;
        const pWater = targetProto.waterMl || currentCompound.waterMl || 2.6;
        setVialMg(String(pVial));
        setWaterMl(String(pWater));
        const calcConc = (pVial / pWater).toFixed(2);
        setConcentration(calcConc);
        updateCalculationsFromDoseAndConc(protoDose, calcConc);
      } else {
        const protoConc = targetProto.concentrationMgMl 
          ? String(targetProto.concentrationMgMl)
          : (currentCompound?.defaultConcentrationMgMl ? String(currentCompound.defaultConcentrationMgMl) : '200');
        setConcentration(protoConc);
        updateCalculationsFromDoseAndConc(protoDose, protoConc);
      }
      return;
    }

    setProtocolId(undefined);
    if (currentCompound) {
      if (currentCompound.category === 'peptide') {
        const pVial = currentCompound.vialMg || 20;
        const pWater = currentCompound.waterMl || 2.6;
        setVialMg(String(pVial));
        setWaterMl(String(pWater));
        const calcConc = (pVial / pWater).toFixed(2);
        setConcentration(calcConc);
        const defaultPeptideDose = '2.5';
        setRoute('SubQ');
        setSite('abdomen_center');
        setNeedleInfo('31G 5/16"');
        updateCalculationsFromDoseAndConc(defaultPeptideDose, calcConc);
      } else if (currentCompound.category === 'fertility') {
        const defaultFertDose = '250';
        const defaultConc = currentCompound.defaultConcentrationMgMl ? String(currentCompound.defaultConcentrationMgMl) : '100';
        setConcentration(defaultConc);
        setRoute('SubQ');
        setNeedleInfo('30G 1/2"');
        updateCalculationsFromDoseAndConc(defaultFertDose, defaultConc);
      } else {
        const defaultSteroidDose = '50';
        const defaultConc = currentCompound.defaultConcentrationMgMl ? String(currentCompound.defaultConcentrationMgMl) : '200';
        setConcentration(defaultConc);
        setRoute('IM');
        setNeedleInfo('30G 1/2"');
        updateCalculationsFromDoseAndConc(defaultSteroidDose, defaultConc);
      }
    }
  }, [isOpen, selectedCompoundId, currentCompound, selectedProtocol, protocols]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDose = parseFloat(dose);
    if (isNaN(parsedDose) || parsedDose <= 0) return;

    const fullDate = `${date}T${time}`;
    const newInjection: Injection = {
      id: 'inj_' + Date.now(),
      compoundId: selectedCompoundId,
      date: fullDate,
      dose: parsedDose,
      volumeMl: parseFloat(volumeMl) || undefined,
      site,
      route,
      needleInfo: needleInfo.trim() || undefined,
      notes: notes.trim() || undefined,
      protocolId: protocolId || undefined,
    };

    onSaveInjection(newInjection);

    // Trigger celebration confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.85 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Modal Header (Fixed / Non-clipped) */}
        <div className="p-4 sm:p-5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Registrar Injeção / Dose
              </h2>
              <p className="text-xs text-slate-400">
                Atualiza sua curva sérica instantaneamente
              </p>
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
          {/* Compound Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Composto / Medicamento
            </label>
            <select
              value={selectedCompoundId}
              onChange={e => setSelectedCompoundId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
            >
              {steroidComps.length > 0 && (
                <optgroup label="💉 ESTEROIDES & ANDROGÊNICOS">
                  {steroidComps.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} {comp.subcategory ? `• ${comp.subcategory}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {peptideComps.length > 0 && (
                <optgroup label="🧬 PEPTÍDEOS & AGONISTAS GLP-1">
                  {peptideComps.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} {comp.subcategory ? `• ${comp.subcategory}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {fertilityComps.length > 0 && (
                <optgroup label="🛡️ FERTILIDADE, TPC & PROTETORES">
                  {fertilityComps.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {estrogenComps.length > 0 && (
                <optgroup label="🌸 HORMÔNIOS FEMININOS / HRT">
                  {estrogenComps.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Dose & Volume Calculator */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <Calculator className="w-3.5 h-3.5 text-blue-400" />
                Dosagem & Medição na Seringa
              </span>
              {onOpenDilutionCalculator && (
                <button
                  type="button"
                  onClick={onOpenDilutionCalculator}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors"
                >
                  Calculadora de Diluição ↗
                </button>
              )}
            </div>

            {/* Peptídeos: Parâmetros Explícitos de Reconstituição */}
            {currentCompound.category === 'peptide' ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-cyan-400" />
                      Diluição do Peptídeo no Frasco
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Concentração: <strong className="text-white font-mono">{concentration} mg/mL</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Força do Frasco */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300 font-medium flex items-center justify-between">
                        <span>Peptídeo no Frasco</span>
                        <span className="text-emerald-400 font-bold text-[10px]">em mg</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={vialMg}
                        onChange={e => handleVialWaterChange(e.target.value, waterMl)}
                        placeholder="ex: 20"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                        required
                      />
                      <div className="flex gap-1 pt-0.5">
                        {['5', '10', '20'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleVialWaterChange(val, waterMl)}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                              vialMg === val
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {val}mg
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Água Bacteriostática Adicionada */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300 font-medium flex items-center justify-between">
                        <span>Água Adicionada</span>
                        <span className="text-cyan-400 font-bold text-[10px]">em mL</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={waterMl}
                        onChange={e => handleVialWaterChange(vialMg, e.target.value)}
                        placeholder="ex: 2.6"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                        required
                      />
                      <div className="flex gap-1 pt-0.5">
                        {['1.0', '2.0', '2.6', '3.0'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleVialWaterChange(vialMg, val)}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                              waterMl === val
                                ? 'bg-cyan-600 border-cyan-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {val}mL
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Dose prescrita */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                      <span>Dose ({currentCompound.unit})</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Prescrita</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={dose}
                      onChange={e => updateCalculationsFromDoseAndConc(e.target.value, concentration)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none"
                      required
                    />
                    <div className="flex gap-1 pt-0.5">
                      {['1.25', '2.5', '5.0', '7.5'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => updateCalculationsFromDoseAndConc(val, concentration)}
                          className={`flex-1 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                            dose === val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {val}mg
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seringa em UI */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <Syringe className="w-3.5 h-3.5" />
                      Seringa (UI)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={volumeUnits}
                      onChange={e => handleUnitsChange(e.target.value)}
                      placeholder="ex: 32.5"
                      className="w-full bg-emerald-950/40 border border-emerald-500/50 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm text-emerald-300 font-extrabold focus:outline-none ring-1 ring-emerald-500/30"
                    />
                    <span className="text-[10px] text-slate-400 block pt-0.5 truncate">
                      Graduação seringa U-100
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Dose */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Dose ({currentCompound.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={dose}
                    onChange={e => updateCalculationsFromDoseAndConc(e.target.value, concentration)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none"
                    required
                  />
                </div>

                {/* 2. Concentração */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 truncate block">
                    Concentração ({currentCompound.unit}/mL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={concentration}
                    onChange={e => updateCalculationsFromDoseAndConc(dose, e.target.value)}
                    placeholder="ex: 200"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>

                {/* 3. Seringa em UI (Destaque Principal) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <Syringe className="w-3.5 h-3.5" />
                    Seringa (UI)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={volumeUnits}
                    onChange={e => handleUnitsChange(e.target.value)}
                    placeholder="ex: 25"
                    className="w-full bg-emerald-950/40 border border-emerald-500/50 focus:border-emerald-400 rounded-xl px-3 py-2 text-sm text-emerald-300 font-extrabold focus:outline-none ring-1 ring-emerald-500/30"
                  />
                </div>
              </div>
            )}

            {/* Live Needle Gauge Tip Banner */}
            {parseFloat(volumeUnits) > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/50 border border-emerald-500/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-slate-300">
                  Puxe o êmbolo até a linha de <strong className="text-emerald-300 text-sm font-black">{volumeUnits} UI</strong> na seringa (U-100)
                </span>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Horário
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Via de Administração (Route) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Via de Aplicação
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['IM', 'SubQ'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRoute(r);
                    if (r === 'SubQ') {
                      setSite('abdomen_center');
                    } else {
                      setSite('deltoid_right');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    route === r
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {r === 'IM' ? 'Intramuscular (IM)' : 'Subcutânea (SubQ)'}
                </button>
              ))}
            </div>
          </div>

          {/* Body Site Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Local Anatômico da Injeção (Rotação)
            </label>
            <BodySitePicker
              selectedSite={site}
              onSelectSite={setSite}
              lastUsedSite={lastUsedSite}
              route={route}
            />
          </div>

          {/* Needle info & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Agulha Utilizada</label>
              <input
                type="text"
                value={needleInfo}
                onChange={e => setNeedleInfo(e.target.value)}
                placeholder="ex: 30G 1/2 ou 25G 1"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Observações</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ex: Sem dor, pós-treino"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Injeção</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
