import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { LabResult, LabMarker } from '../../types';
import { DEFAULT_LAB_MARKERS } from '../../lib/defaultCompounds';
import { evaluateMarkerStatus, getTE2Ratio } from '../../lib/labAnalysis';
import { TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Scale, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

interface LabEvolutionChartProps {
  labs: LabResult[];
  gender?: 'male' | 'female' | 'other';
}

export const LabEvolutionChart: React.FC<LabEvolutionChartProps> = ({
  labs,
  gender = 'male',
}) => {
  // Coletar todos os códigos de marcadores presentes nos exames
  const presentMarkerCodes = useMemo(() => {
    const codes = new Set<string>();
    labs.forEach(lab => {
      lab.markers.forEach(m => {
        if (m.value !== undefined && m.value !== null) {
          codes.add(m.markerCode);
        }
      });
    });
    return Array.from(codes);
  }, [labs]);

  // Escolher o marcador padrão inicial: hematócrito ou testosterona ou o primeiro presente
  const [selectedMarkerCode, setSelectedMarkerCode] = useState<string>(() => {
    if (presentMarkerCodes.includes('hematocrit')) return 'hematocrit';
    if (presentMarkerCodes.includes('total_t')) return 'total_t';
    if (presentMarkerCodes.length > 0) return presentMarkerCodes[0];
    return 'hematocrit';
  });

  // Atualizar seleção caso o marcador não exista mais e tenhamos novos dados
  const activeMarkerCode = presentMarkerCodes.includes(selectedMarkerCode)
    ? selectedMarkerCode
    : (presentMarkerCodes[0] || selectedMarkerCode);

  const markerDef: LabMarker = useMemo(() => {
    return DEFAULT_LAB_MARKERS.find(m => m.code === activeMarkerCode) || {
      id: activeMarkerCode,
      name: activeMarkerCode,
      code: activeMarkerCode,
      category: 'hormones',
      unit: '',
      maleRef: undefined,
      femaleRef: undefined,
    };
  }, [activeMarkerCode]);

  const ref = gender === 'female' ? markerDef.femaleRef : markerDef.maleRef;

  // Filtrar e ordenar os exames cronologicamente (do mais antigo ao mais recente)
  const chartData = useMemo(() => {
    const sorted = [...labs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted
      .map(lab => {
        const markerObj = lab.markers.find(m => m.markerCode === activeMarkerCode);
        if (!markerObj || markerObj.value === undefined || markerObj.value === null) {
          return null;
        }

        const dateObj = new Date(lab.date + 'T12:00:00');
        const displayDate = dateObj.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        });

        const statusRes = evaluateMarkerStatus(
          activeMarkerCode,
          markerObj.value,
          lab.markers,
          gender,
          labs,
          lab
        );

        // Se o exame tiver tanto Testo quanto E2, calcula a relação para o tooltip
        const te2RatioData = getTE2Ratio(lab, labs);

        return {
          id: lab.id,
          date: lab.date,
          displayDate,
          fullDate: dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          value: markerObj.value,
          unit: markerObj.unit || markerDef.unit || '',
          labName: lab.labName,
          statusResult: statusRes,
          te2RatioData,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [labs, activeMarkerCode, gender, markerDef]);

  // Cálculos de métricas do marcador selecionado
  const latestPoint = chartData[chartData.length - 1];
  const previousPoint = chartData.length >= 2 ? chartData[chartData.length - 2] : null;

  const percentageChange = useMemo(() => {
    if (!latestPoint || !previousPoint || previousPoint.value === 0) return null;
    const diff = latestPoint.value - previousPoint.value;
    const pct = (diff / previousPoint.value) * 100;
    return parseFloat(pct.toFixed(1));
  }, [latestPoint, previousPoint]);

  // Limites do eixo Y com margem visual
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const vals = chartData.map(d => d.value);
    if (ref) {
      vals.push(ref.min, ref.max);
    }
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const padding = (maxVal - minVal) * 0.15 || maxVal * 0.1 || 10;
    return [
      Math.max(0, parseFloat((minVal - padding).toFixed(1))),
      parseFloat((maxVal + padding).toFixed(1)),
    ];
  }, [chartData, ref]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      {/* Header com Título e Dropdown de Marcador */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Evolução Longitudinal</h3>
            <p className="text-[11px] text-slate-400">
              Histórico temporal dos seus exames laboratoriais
            </p>
          </div>
        </div>

        {/* Dropdown Seletor de Marcador */}
        <div className="relative min-w-[200px]">
          <select
            value={activeMarkerCode}
            onChange={e => setSelectedMarkerCode(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors pr-8 appearance-none cursor-pointer"
          >
            {presentMarkerCodes.length > 0 && (
              <optgroup label="📊 Marcadores com Exames Registrados">
                {presentMarkerCodes.map(code => {
                  const def = DEFAULT_LAB_MARKERS.find(m => m.code === code);
                  const count = labs.filter(l => l.markers.some(m => m.markerCode === code)).length;
                  return (
                    <option key={code} value={code}>
                      {def?.name || code} ({count} {count === 1 ? 'exame' : 'exames'})
                    </option>
                  );
                })}
              </optgroup>
            )}

            <optgroup label="📋 Todos os Marcadores Disponíveis">
              {DEFAULT_LAB_MARKERS.filter(m => !presentMarkerCodes.includes(m.code)).map(m => (
                <option key={m.code} value={m.code}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* KPI Cards / Destaques do Marcador */}
      {latestPoint && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Último Valor Registrado */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Último Valor
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-white">{latestPoint.value}</span>
              <span className="text-xs text-slate-400 font-medium">{latestPoint.unit}</span>
            </div>
            <div className="pt-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${latestPoint.statusResult.badgeClass}`}>
                {latestPoint.statusResult.label}
              </span>
            </div>
          </div>

          {/* Variação vs. Exame Anterior */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Variação Recente
            </span>
            {percentageChange !== null ? (
              <div className="flex items-center gap-1">
                {percentageChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-sky-400" />
                )}
                <span className={`text-base font-bold ${percentageChange >= 0 ? 'text-emerald-400' : 'text-sky-400'}`}>
                  {percentageChange >= 0 ? `+${percentageChange}%` : `${percentageChange}%`}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium block pt-1">1ª Coleta</span>
            )}
            <span className="text-[10px] text-slate-500 block truncate">
              {previousPoint ? `vs. ${previousPoint.displayDate}` : 'Sem base anterior'}
            </span>
          </div>

          {/* Faixa de Referência Laboratorial */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Faixa de Referência
            </span>
            {ref ? (
              <>
                <div className="text-sm font-bold text-slate-200">
                  {ref.min} - {ref.max} <span className="text-[11px] text-slate-400 font-normal">{markerDef.unit}</span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Padrão {gender === 'female' ? 'Feminino' : 'Masculino'}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-500 font-medium block pt-1">Customizado</span>
            )}
          </div>

          {/* Smart Card: Relação T:E2 se aplicável */}
          {latestPoint.te2RatioData ? (
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                <Scale className="w-3 h-3 text-cyan-400" />
                Relação T:E2
              </span>
              <div className="text-base font-black text-cyan-300">
                {latestPoint.te2RatioData.ratio}:1
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block ${latestPoint.te2RatioData.badgeClass}`}>
                {latestPoint.te2RatioData.isOptimal ? 'Zona Alvo TRT (14-20)' : latestPoint.te2RatioData.text}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Total de Registros
              </span>
              <div className="text-base font-bold text-slate-200">
                {chartData.length} {chartData.length === 1 ? 'exame' : 'exames'}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Último em {latestPoint.displayDate}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Gráfico Recharts */}
      {chartData.length === 0 ? (
        <div className="py-10 text-center bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl p-4 space-y-2">
          <Activity className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">
            Nenhum resultado registrado para {markerDef.name}
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Cadastre um exame informando o valor deste marcador para habilitar o gráfico evolutivo.
          </p>
        </div>
      ) : chartData.length === 1 ? (
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Ponto único registrado:</span>
            <span className="font-bold text-white">
              {latestPoint.fullDate} • {latestPoint.value} {latestPoint.unit}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
            {ref && (
              <>
                <div style={{ width: '30%' }} className="bg-amber-500/30" title="Abaixo da Ref" />
                <div style={{ width: '40%' }} className="bg-emerald-500/40" title="Faixa Ideal" />
                <div style={{ width: '30%' }} className="bg-rose-500/30" title="Acima da Ref" />
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 italic text-center">
            Cadastre seu próximo exame de sangue para visualizar a curva de evolução longitudinal com linha de tendência.
          </p>
        </div>
      ) : (
        <div className="pt-2">
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="gradLab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                <XAxis
                  dataKey="displayDate"
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />

                <YAxis
                  domain={yDomain}
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[190px]">
                        <div className="border-b border-slate-800 pb-1 flex items-center justify-between gap-2">
                          <span className="font-bold text-white">{data.fullDate}</span>
                          {data.labName && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                              {data.labName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400">{markerDef.name}:</span>
                          <span className="font-black text-sm text-emerald-400">
                            {data.value} {data.unit}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-400">Status:</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${data.statusResult.badgeClass}`}>
                            {data.statusResult.label}
                          </span>
                        </div>

                        {data.statusResult.description && (
                          <div className="text-[10px] text-slate-400 italic pt-0.5 border-t border-slate-800/80">
                            {data.statusResult.description}
                          </div>
                        )}

                        {data.te2RatioData && (
                          <div className="pt-1 border-t border-slate-800 text-[10px] text-cyan-300 flex items-center justify-between">
                            <span>Proporção T:E2:</span>
                            <span className="font-bold">{data.te2RatioData.ratio}:1</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {/* Linhas de Referência Laboratorial */}
                {ref && (
                  <>
                    <ReferenceLine
                      y={ref.min}
                      stroke="#0284c7"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Mín ${ref.min}`,
                        fill: '#38bdf8',
                        fontSize: 9,
                        position: 'insideBottomLeft',
                      }}
                    />
                    <ReferenceLine
                      y={ref.max}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Máx ${ref.max}`,
                        fill: '#fb7185',
                        fontSize: 9,
                        position: 'insideTopLeft',
                      }}
                    />
                  </>
                )}

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradLab)"
                  dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between px-2 pt-1 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-sky-500 inline-block" /> Limite Mínimo Laboratorial
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-rose-500 inline-block" /> Limite Máximo Laboratorial
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
