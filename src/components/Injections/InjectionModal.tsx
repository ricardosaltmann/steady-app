import React, { useState, useEffect } from 'react';
import { Compound, Injection, InjectionSite } from '../../types';
import { BodySitePicker } from './BodySitePicker';
import { X, Syringe, Calendar, Clock, Calculator, Check, Sparkles } from 'lucide-react';
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
}) => {
  const [selectedCompoundId, setSelectedCompoundId] = useState(defaultCompoundId);
  const [dose, setDose] = useState<string>(initialDose ? String(initialDose) : '50');
  const [concentration, setConcentration] = useState<string>('200');
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

  const currentCompound = compounds.find(c => c.id === selectedCompoundId) || compounds[0];

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
    if (currentCompound) {
      const defaultConc = currentCompound.defaultConcentrationMgMl ? String(currentCompound.defaultConcentrationMgMl) : '200';
      setConcentration(defaultConc);

      // Set reasonable default dose based on compound
      if (currentCompound.category === 'peptide') {
        const defaultPeptideDose = '2.5';
        setRoute('SubQ');
        setNeedleInfo('31G 5/16"');
        updateCalculationsFromDoseAndConc(defaultPeptideDose, defaultConc);
      } else if (currentCompound.category === 'fertility') {
        const defaultFertDose = '250';
        setRoute('SubQ');
        setNeedleInfo('30G 1/2"');
        updateCalculationsFromDoseAndConc(defaultFertDose, defaultConc);
      } else {
        const defaultSteroidDose = '50';
        setRoute('IM');
        setNeedleInfo('30G 1/2"');
        updateCalculationsFromDoseAndConc(defaultSteroidDose, defaultConc);
      }
    }
  }, [selectedCompoundId, currentCompound]);

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
    };

    onSaveInjection(newInjection);

    // Trigger celebration confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.85 },
      colors: ['#3b82f6', '#10b981', '#a855f7'],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Syringe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Registrar Injeção / Dose</h3>
              <p className="text-xs text-slate-400">Atualiza sua curva sérica instantaneamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Compound Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Composto / Medicamento
            </label>
            <select
              value={selectedCompoundId}
              onChange={e => setSelectedCompoundId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <optgroup label="💉 ESTEROIDES ANABOLIZANTES & TRT">
                {compounds.filter(c => c.category === 'steroid').map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} {comp.subcategory ? `• ${comp.subcategory}` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🧬 PEPTÍDEOS & AGONISTAS GLP-1">
                {compounds.filter(c => c.category === 'peptide').map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} {comp.subcategory ? `• ${comp.subcategory}` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🛡️ FERTILIDADE, TPC & PROTETORES">
                {compounds.filter(c => c.category === 'fertility').map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🌸 HORMÔNIOS FEMININOS / HRT">
                {compounds.filter(c => c.category === 'estrogen').map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </optgroup>
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
