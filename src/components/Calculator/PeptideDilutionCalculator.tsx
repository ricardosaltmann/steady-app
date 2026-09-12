import React, { useState, useMemo } from 'react';
import { Calculator, Sparkles, Syringe, Info, Check, ArrowRight, ShieldAlert, Droplets, RefreshCw } from 'lucide-react';

interface ReconstitutionPreset {
  id: string;
  name: string;
  vialMg: number;
  waterMl: number;
  defaultDoseMcg: number;
  description: string;
}

const PRESETS: ReconstitutionPreset[] = [
  {
    id: 'tirzepatide',
    name: 'Tirzepatida (20mg / 2.6mL)',
    vialMg: 20,
    waterMl: 2.6,
    defaultDoseMcg: 2500, // 2.5mg
    description: 'Padrão clínico: Frasco de 20mg diluído em 2.6mL (7.69 mg/mL). Dose padrão inicial de 2.5mg (32.5 UI na seringa U-100). Rendimento de 8 doses.',
  },
  {
    id: 'retatrutide',
    name: 'Retatrutida (20mg / 2.6mL)',
    vialMg: 20,
    waterMl: 2.6,
    defaultDoseMcg: 2500, // 2.5mg
    description: 'Padrão clínico: Frasco de 20mg diluído em 2.6mL (7.69 mg/mL). Dose padrão inicial de 2.5mg (32.5 UI na seringa U-100). Rendimento de 8 doses.',
  },
  {
    id: 'bpc157',
    name: 'BPC-157 (5mg)',
    vialMg: 5,
    waterMl: 2.6,
    defaultDoseMcg: 250,
    description: 'Frasco de 5mg diluído no padrão de 2.6mL. Dose de 250mcg a 500mcg 1x a 2x ao dia.',
  },
  {
    id: 'semaglutide',
    name: 'Semaglutida (5mg)',
    vialMg: 5,
    waterMl: 2.6,
    defaultDoseMcg: 250, // 0.25mg
    description: 'Frasco de 5mg diluído no padrão de 2.6mL. Dose inicial de 0.25mg (250mcg / 13 UI) por semana.',
  },
  {
    id: 'cjc_ipa',
    name: 'CJC-1295 + Ipamorelina (10mg)',
    vialMg: 10,
    waterMl: 2.6,
    defaultDoseMcg: 200, // 200mcg
    description: 'Frasco de 10mg diluído no padrão de 2.6mL. Dose noturna de 200mcg.',
  },
  {
    id: 'tb500',
    name: 'TB-500 (5mg)',
    vialMg: 5,
    waterMl: 2.6,
    defaultDoseMcg: 2500, // 2.5mg
    description: 'Frasco de 5mg diluído no padrão de 2.6mL. Dose de 2.5mg 2x por semana.',
  },
  {
    id: 'glow',
    name: 'GLOW Protocol (70mg)',
    vialMg: 70,
    waterMl: 2.6,
    defaultDoseMcg: 2300,
    description: 'Blend de GHK-Cu + BPC + TB diluído no padrão de 2.6mL.',
  },
  {
    id: 'klow',
    name: 'KLOW Protocol (75mg)',
    vialMg: 75,
    waterMl: 2.6,
    defaultDoseMcg: 2500,
    description: 'Blend KLOW com KPV diluído no padrão de 2.6mL.',
  },
  {
    id: 'ghkcu',
    name: 'GHK-Cu Puro (50mg)',
    vialMg: 50,
    waterMl: 2.6,
    defaultDoseMcg: 1500,
    description: 'GHK-Cu diluído no padrão de 2.6mL. Dose de 1.5mg a 2mg diários.',
  },
];

interface PeptideDilutionCalculatorProps {
  onApplyCalculatedDose?: (doseMg: number, volumeMl: number) => void;
}

export const PeptideDilutionCalculator: React.FC<PeptideDilutionCalculatorProps> = ({
  onApplyCalculatedDose,
}) => {
  // Inputs com padrão clínico: Frasco 20mg, Diluição 2.6mL, Dose 2.5mg
  const [vialMg, setVialMg] = useState<string>('20');
  const [waterMl, setWaterMl] = useState<string>('2.6');
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mg');
  const [desiredDose, setDesiredDose] = useState<string>('2.5');
  const [syringeType, setSyringeType] = useState<100 | 50 | 30>(100); // 100 UI (1ml), 50 UI (0.5ml), 30 UI (0.3ml)

  // Apply preset
  const handleApplyPreset = (preset: ReconstitutionPreset) => {
    setVialMg(String(preset.vialMg));
    setWaterMl(String(preset.waterMl));
    if (preset.defaultDoseMcg >= 1000) {
      setDoseUnit('mg');
      setDesiredDose(String(preset.defaultDoseMcg / 1000));
    } else {
      setDoseUnit('mcg');
      setDesiredDose(String(preset.defaultDoseMcg));
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    const mg = parseFloat(vialMg) || 0;
    const ml = parseFloat(waterMl) || 0;
    const rawDose = parseFloat(desiredDose) || 0;
    const doseInMg = doseUnit === 'mg' ? rawDose : rawDose / 1000;
    const doseInMcg = doseUnit === 'mcg' ? rawDose : rawDose * 1000;

    if (mg <= 0 || ml <= 0 || doseInMg <= 0) {
      return {
        concentrationMgMl: 0,
        concentrationMcgMl: 0,
        volumePerDoseMl: 0,
        syringeUnits: 0,
        totalDosesInVial: 0,
        mcgPerUnit: 0,
        isValid: false,
        doseInMg: 0,
      };
    }

    const concentrationMgMl = mg / ml;
    const concentrationMcgMl = (mg * 1000) / ml;
    const volumePerDoseMl = doseInMg / concentrationMgMl;
    // For standard U-100 insulin syringes (100 units = 1.0 mL)
    const syringeUnits = Number((volumePerDoseMl * 100).toFixed(1));
    const totalDosesInVial = Math.floor(mg / doseInMg);
    const mcgPerUnit = Number((concentrationMcgMl / 100).toFixed(2));

    return {
      concentrationMgMl: Number(concentrationMgMl.toFixed(2)),
      concentrationMcgMl: Number(concentrationMcgMl.toFixed(1)),
      volumePerDoseMl: Number(volumePerDoseMl.toFixed(3)),
      syringeUnits,
      totalDosesInVial,
      mcgPerUnit,
      isValid: syringeUnits > 0 && syringeUnits <= syringeType,
      isOverSyringe: syringeUnits > syringeType,
      doseInMg: Number(doseInMg.toFixed(2)),
    };
  }, [vialMg, waterMl, desiredDose, doseUnit, syringeType]);

  // Syringe fill percentage
  const syringeFillPercentage = Math.min(100, Math.max(0, (calculations.syringeUnits / syringeType) * 100));

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Calculadora de Diluição & Reconstituição
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 uppercase">
                  Precisão Clínica (UI)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calcule a quantidade exata de água bacteriostática e as Unidades (UI) na seringa de insulina
              </p>
            </div>
          </div>
        </div>

        {/* Quick Presets Carousel / Pills */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Presets Rápidos de Peptídeos Populares:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 text-slate-300 hover:text-white transition-all shrink-0 active:scale-95"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Form Inputs (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Droplets className="w-4 h-4 text-emerald-400" />
            Parâmetros de Reconstituição
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Quantidade no Frasco */}
            <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Peptídeo no Frasco</span>
                <span className="text-[10px] text-emerald-400 font-bold">em mg</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  value={vialMg}
                  onChange={e => setVialMg(e.target.value)}
                  placeholder="ex: 5, 10, 15"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-slate-400 font-semibold px-1">mg</span>
              </div>
              <div className="flex gap-1 pt-1">
                {['2', '5', '10', '20', '50'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setVialMg(val)}
                    className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                      vialMg === val
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {val}mg
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Água Bacteriostática Adicionada */}
            <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Água Bacteriostática</span>
                <span className="text-[10px] text-cyan-400 font-bold">em mL</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={waterMl}
                  onChange={e => setWaterMl(e.target.value)}
                  placeholder="ex: 1, 2, 2.6"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-400 font-semibold px-1">mL</span>
              </div>
              <div className="flex gap-1 pt-1">
                {['1', '2', '2.6', '3', '5'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setWaterMl(val)}
                    className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                      waterMl === val
                        ? 'bg-cyan-600 border-cyan-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {val}mL
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Dose Desejada */}
          <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Dose Desejada por Aplicação
              </label>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (doseUnit === 'mg') {
                      const num = parseFloat(desiredDose);
                      if (!isNaN(num)) setDesiredDose(String(num * 1000));
                      setDoseUnit('mcg');
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    doseUnit === 'mcg' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  mcg
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (doseUnit === 'mcg') {
                      const num = parseFloat(desiredDose);
                      if (!isNaN(num)) setDesiredDose(String(num / 1000));
                      setDoseUnit('mg');
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    doseUnit === 'mg' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  mg
                </button>
              </div>
            </div>

            <input
              type="number"
              step="any"
              value={desiredDose}
              onChange={e => setDesiredDose(e.target.value)}
              placeholder={doseUnit === 'mcg' ? 'ex: 250, 500' : 'ex: 2.5, 5'}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-1 pt-1">
              {(doseUnit === 'mg' ? ['1.25', '2.5', '5', '7.5', '10'] : ['250', '500', '1000', '2500']).map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDesiredDose(val)}
                  className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                    desiredDose === val
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {val}{doseUnit}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Seringa de Insulina */}
          <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Seringa de Insulina Utilizada (U-100)</span>
              <span className="text-[10px] text-slate-400">Graduação padrão</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 100 as const, label: '1.0 mL (100 UI)' },
                { value: 50 as const, label: '0.5 mL (50 UI)' },
                { value: 30 as const, label: '0.3 mL (30 UI)' },
              ].map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSyringeType(s.value)}
                  className={`py-2 px-2 rounded-xl border text-xs font-semibold transition-all ${
                    syringeType === s.value
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Syringe & Calculation Output (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Main Big Result Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                Puxar na Seringa de Insulina:
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  {calculations.syringeUnits}
                </span>
                <span className="text-xl font-bold text-emerald-400">
                  Unidades (UI)
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Equivalente a <strong>{calculations.volumePerDoseMl} mL</strong> de solução reconstituída.
              </p>
            </div>

            {/* Visual Syringe Representation */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Syringe className="w-3.5 h-3.5 text-emerald-400" />
                  Visualização da Seringa (U-{syringeType})
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {calculations.syringeUnits} / {syringeType} UI
                </span>
              </div>

              {/* Syringe Barrel Graphic */}
              <div className="relative w-full h-10 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center">
                {/* Colored Liquid Fill */}
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300 relative"
                  style={{ width: `${syringeFillPercentage}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white shadow-md animate-pulse" />
                </div>

                {/* Syringe Measurement Tick Marks */}
                <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none opacity-40">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-0.5 h-3 bg-white" />
                      <span className="text-[8px] text-white font-mono mt-0.5">
                        {Math.round((syringeType / 10) * i)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {calculations.isOverSyringe ? (
                <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Atenção: o volume de {calculations.syringeUnits} UI excede a capacidade máxima de {syringeType} UI desta seringa. Selecione uma seringa de 1.0 mL ou reduza a água de diluição.
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  👉 Puxe o êmbolo até a linha correspondente a <strong>{calculations.syringeUnits} Unidades</strong> na sua seringa de {syringeType} UI.
                </p>
              )}
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Concentração Solução</span>
                <span className="font-bold text-slate-200">
                  {calculations.concentrationMgMl} mg/mL
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({calculations.mcgPerUnit} mcg por UI)
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Rendimento do Frasco</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {calculations.totalDosesInVial} doses
                </span>
                <span className="text-[10px] text-slate-500 block">
                  por frasco reconstituído
                </span>
              </div>
            </div>

            {/* Action button to record injection */}
            {onApplyCalculatedDose && calculations.isValid && (
              <button
                type="button"
                onClick={() => onApplyCalculatedDose(calculations.doseInMg, calculations.volumePerDoseMl)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-98 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Registrar Dose ({calculations.doseInMg}mg • {calculations.syringeUnits} UI) no Diário
              </button>
            )}
          </div>

          {/* Instructions & Best Practices */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Info className="w-4 h-4 text-blue-400" />
              Boas Práticas de Reconstituição de Peptídeos:
            </div>
            <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-400">
              <li>Higienize o topo da tampa do frasco com álcool 70% antes de perfurar.</li>
              <li>Injete a água bacteriostática <strong>lentamente</strong> pelas paredes internas do vidro.</li>
              <li><strong>Não agite bruscamente</strong> o frasco; faça movimentos circulares suaves até dissolver.</li>
              <li>Após reconstituído, mantenha sempre refrigerado entre <strong>2°C e 8°C</strong> e ao abrigo da luz.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
