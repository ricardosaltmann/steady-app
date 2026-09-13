import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Compound, Injection, Protocol, LabResult, SymptomLog } from '../../types';
import { generateSerumCurve, getDisplayUnit } from '../../lib/pharmacokinetics';
import { formatCompoundDose } from '../../lib/doseFormatter';
import {
  Activity,
  Calendar,
  Scale,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Syringe,
  Filter,
} from 'lucide-react';

interface PharmacokineticChartProps {
  compound: Compound;
  compounds: Compound[];
  injections: Injection[];
  protocols: Protocol[];
  labs: LabResult[];
  symptoms: SymptomLog[];
  onOpenLogDose?: () => void;
}

const PROTOCOL_COLORS = [
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#8b5cf6', // Indigo
];

export const PharmacokineticChart: React.FC<PharmacokineticChartProps> = ({
  compound,
  compounds,
  injections,
  protocols,
  labs,
  symptoms,
}) => {
  const [timeRange, setTimeRange] = useState<'14d' | '30d' | '60d'>('30d');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Strict time window respecting the selected filter (total span equals filter)
  const rangeConfig = useMemo(() => {
    switch (timeRange) {
      case '14d':
        return { daysPast: 10, daysFuture: 4, stepHours: 4 }; // 14 days total
      case '60d':
        return { daysPast: 42, daysFuture: 18, stepHours: 8 }; // 60 days total
      case '30d':
      default:
        return { daysPast: 21, daysFuture: 9, stepHours: 6 }; // 30 days total
    }
  }, [timeRange]);

  // STRICT RULE: Keep ONLY active protocols to avoid cluttering the app
  const activeProtocols = useMemo(() => {
    return protocols.filter(p => p.active);
  }, [protocols]);

  // Build series configs for all active protocols (or fallback to activeCompound)
  const seriesConfigs = useMemo(() => {
    if (activeProtocols.length > 0) {
      return activeProtocols.map((proto, idx) => {
        const comp = compounds.find(c => c.id === proto.compoundId) || compound;
        const color = comp.color || PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length];
        const { points, summary } = generateSerumCurve(comp, injections, [proto], labs, rangeConfig);
        return {
          id: proto.id,
          name: proto.name,
          compoundName: comp.name,
          unit: comp.unit,
          clinicalUnit: summary.unit,
          color,
          currentLevel: summary.currentLevel,
          points,
          summary,
          protocol: proto,
        };
      });
    }

    // Fallback if no active protocols exist yet
    const fallbackCurve = generateSerumCurve(compound, injections, protocols, labs, rangeConfig);
    return [{
      id: compound.id,
      name: compound.name,
      compoundName: compound.name,
      unit: compound.unit,
      clinicalUnit: getDisplayUnit(compound),
      color: compound.color || '#06b6d4',
      currentLevel: fallbackCurve.summary.currentLevel,
      points: fallbackCurve.points,
      summary: fallbackCurve.summary,
      protocol: undefined,
    }];
  }, [activeProtocols, compounds, compound, injections, protocols, labs, rangeConfig]);

  // Selected series for chart display
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<string[]>([]);

  // Synchronize selected series whenever active protocols change
  useEffect(() => {
    const validIds = new Set([...seriesConfigs.map(s => s.id), 'weight']);
    setSelectedSeriesIds(prev => {
      if (prev.length === 0) {
        return [...seriesConfigs.map(s => s.id), 'weight'];
      }
      const filtered = prev.filter(id => validIds.has(id));
      return filtered.length > 0 ? filtered : [...seriesConfigs.map(s => s.id), 'weight'];
    });
  }, [seriesConfigs]);

  // Map recorded weight by date (YYYY-MM-DD)
  const weightMap = useMemo(() => {
    const map: Record<string, number> = {};
    symptoms.forEach(s => {
      if (s.weightKg && s.weightKg > 0) {
        map[s.date] = s.weightKg;
      }
    });
    return map;
  }, [symptoms]);

  const latestWeight = useMemo(() => {
    const sorted = symptoms
      .filter(s => s.weightKg && s.weightKg > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0]?.weightKg || null;
  }, [symptoms]);

  // Combine multiple curves and weight into a single unified time series
  const chartData = useMemo(() => {
    if (seriesConfigs.length === 0) return [];
    const base = seriesConfigs[0].points;

    return base.map((bp, i) => {
      const d = new Date(bp.timestamp);
      const yyyyMmDd = d.toISOString().slice(0, 10);
      const pt: any = {
        timestamp: bp.timestamp,
        dateLabel: bp.dateLabel,
        dayLabel: bp.dayLabel,
        isFuture: bp.isFuture,
        weightKg: weightMap[yyyyMmDd] ?? null,
        injectionPoints: [] as Injection[],
        labPoints: [] as any[],
      };

      if (bp.injectionPoint) pt.injectionPoints.push(bp.injectionPoint);
      if (bp.labPoint) pt.labPoints.push(bp.labPoint);

      seriesConfigs.forEach(item => {
        const itemPoint = item.points[i];
        if (itemPoint) {
          // Both actual (solid) and projected (dashed) keys
          pt[`actual_${item.id}`] = itemPoint.actualLevel;
          pt[`projected_${item.id}`] = itemPoint.projectedLevel;
          pt[`level_${item.id}`] = itemPoint.isFuture ? itemPoint.projectedLevel : itemPoint.actualLevel;

          if (itemPoint.injectionPoint && !pt.injectionPoints.some((x: any) => x.compoundName === itemPoint.injectionPoint?.compoundName && x.dose === itemPoint.injectionPoint?.dose)) {
            pt.injectionPoints.push(itemPoint.injectionPoint);
          }
        }
      });

      return pt;
    });
  }, [seriesConfigs, weightMap]);

  // Timestamp for "Now"
  const nowMs = Date.now();

  // Series toggle handler
  const toggleSeries = (id: string) => {
    setSelectedSeriesIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const isWeightSelected = selectedSeriesIds.includes('weight');
  const hasWeightData = Object.keys(weightMap).length > 0;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-xs space-y-2 max-w-[280px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {data.dateLabel}
          </span>
          {data.isFuture ? (
            <span className="bg-purple-950/70 text-purple-300 border border-purple-700/60 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Projeção Estimada
            </span>
          ) : (
            <span className="bg-slate-800/80 text-slate-300 border border-slate-700 text-[10px] font-medium px-1.5 py-0.5 rounded-md">
              Histórico
            </span>
          )}
        </div>

        {/* Selected series levels */}
        <div className="space-y-1.5 pt-0.5">
          {isWeightSelected && data.weightKg && (
            <div className="flex items-center justify-between text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-800/40">
              <span className="flex items-center gap-1 font-semibold text-[11px]">
                <Scale className="w-3 h-3 text-emerald-400" />
                Peso Corporal
              </span>
              <span className="font-bold">{data.weightKg.toFixed(1)} kg</span>
            </div>
          )}

          {seriesConfigs.filter(s => selectedSeriesIds.includes(s.id)).map(s => {
            const val = data.isFuture ? data[`projected_${s.id}`] : data[`actual_${s.id}`];
            if (val === undefined || val === null) return null;
            return (
              <div key={s.id} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300 truncate max-w-[160px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="font-bold text-white ml-2">
                  {val} {s.clinicalUnit}
                </span>
              </div>
            );
          })}
        </div>

        {/* Injections at this date */}
        {data.injectionPoints && data.injectionPoints.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-800">
            {data.injectionPoints.map((inj: any, idx: number) => (
              <div key={idx} className="p-1.5 bg-blue-950/40 border border-blue-800/50 rounded-lg text-blue-200 text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1 truncate font-medium">
                  <Syringe className="w-3 h-3 text-blue-400 shrink-0" />
                  {inj.compoundName || 'Injeção'}: {formatCompoundDose(inj.dose, inj.unit).fullText}
                </span>
                <span className="text-[10px] text-slate-400 uppercase">{inj.site}</span>
              </div>
            ))}
          </div>
        )}

        {/* Real Labs at this date */}
        {data.labPoints && data.labPoints.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-800">
            {data.labPoints.map((lab: any, i: number) => (
              <div key={i} className="p-1.5 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-200 text-[11px]">
                Exame Real: <strong className="text-white">{lab.value} {lab.unit}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Interactive Chart Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
        {/* Top Control Header: Title, Drop List Filter & Time Range */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide block">
                Curva Farmacocinética & Biomarcadores
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400">
                {activeProtocols.length > 0 
                  ? `${activeProtocols.length} protocolo(s) ativo(s) sincronizado(s)` 
                  : 'Exibindo composto selecionado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Drop List Selector for Metrics */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-semibold text-slate-200 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dados ({selectedSeriesIds.length})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Drop List Floating Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-cyan-400" />
                      Dados a Exibir
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedSeriesIds([...seriesConfigs.map(s => s.id), 'weight'])}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                      >
                        Todos
                      </button>
                    </div>
                  </div>

                  {/* Biometria & Peso */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Biometria & Saúde
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSeries('weight')}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all border cursor-pointer ${
                        isWeightSelected
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <div>
                          <span className="font-semibold block">Peso Corporal (kg)</span>
                          <span className="text-[10px] text-slate-400">
                            {latestWeight ? `Último: ${latestWeight.toFixed(1)} kg` : 'Sem pesagens registradas'}
                          </span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        isWeightSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700'
                      }`}>
                        {isWeightSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  </div>

                  {/* Active Protocols list */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Protocolos Ativos
                      </span>
                      <span className="text-[9px] text-slate-500">Apenas ativos</span>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {seriesConfigs.map(s => {
                        const isSelected = selectedSeriesIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSeries(s.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-slate-800/80 border-slate-600 text-white'
                                : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-1">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                              <div className="truncate">
                                <span className="font-semibold block truncate">{s.name}</span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  {s.protocol?.dose ? `${formatCompoundDose(s.protocol.dose, s.unit).fullText}` : s.compoundName} • {s.clinicalUnit}
                                </span>
                              </div>
                            </div>
                            <div 
                              className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                                isSelected ? 'border-transparent text-slate-950' : 'border-slate-700'
                              }`}
                              style={{ backgroundColor: isSelected ? s.color : 'transparent' }}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-tight pt-1 border-t border-slate-800/80">
                    💡 Apenas protocolos com status <strong>Ativo</strong> são listados para manter a visualização limpa.
                  </p>
                </div>
              )}
            </div>

            {/* Strict Time range switcher (14d, 30d, 60d) */}
            <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              {(['14d', '30d', '60d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                    timeRange === range
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {range === '14d' ? '14d' : range === '30d' ? '30d' : '60d'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Selection Toggle Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none pt-1">
          {/* Weight Chip */}
          <button
            type="button"
            onClick={() => toggleSeries('weight')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
              isWeightSelected
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60 hover:opacity-90'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Peso</span>
            {latestWeight && (
              <span className="text-[10px] text-emerald-400/80 font-normal">
                ({latestWeight.toFixed(1)} kg)
              </span>
            )}
          </button>

          {/* Active Protocols Chips */}
          {seriesConfigs.map(s => {
            const isSelected = selectedSeriesIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSeries(s.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-slate-600 text-white shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60 hover:opacity-90'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({s.currentLevel} {s.clinicalUnit})
                </span>
              </button>
            );
          })}
        </div>

        {/* The Recharts Graphic (Dual Y-Axis: Left for Compounds, Right for Weight) */}
        <div className="w-full h-64 sm:h-76">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: isWeightSelected && hasWeightData ? 0 : 5, left: -20, bottom: 0 }}>
              <defs>
                {seriesConfigs.map(s => (
                  <linearGradient key={s.id} id={`grad_${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>

              {/* XAxis strictly using timestamp domain to guarantee precise time window */}
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                tickFormatter={(ts: number) => {
                  const d = new Date(ts);
                  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  return `${d.getDate()} ${months[d.getMonth()]}`;
                }}
              />

              {/* Left Y-Axis: Compounds Concentration */}
              <YAxis
                yAxisId="compoundAxis"
                orientation="left"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />

              {/* Right Y-Axis: Weight in kg (if selected) */}
              {isWeightSelected && hasWeightData && (
                <YAxis
                  yAxisId="weightAxis"
                  orientation="right"
                  stroke="#10b981"
                  domain={['dataMin - 1.5', 'dataMax + 1.5']}
                  unit=" kg"
                  tick={{ fontSize: 10, fill: '#10b981' }}
                  tickLine={false}
                  axisLine={false}
                />
              )}

              <Tooltip content={<CustomTooltip />} />

              {/* "Hoje" Reference Line */}
              <ReferenceLine
                yAxisId="compoundAxis"
                x={nowMs}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: 'Hoje',
                  position: 'insideTopLeft',
                  fill: '#f43f5e',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* 1. Solid Curve for Past History (Up to Today) */}
              {seriesConfigs.filter(s => selectedSeriesIds.includes(s.id)).map(s => (
                <Area
                  key={`act_${s.id}`}
                  yAxisId="compoundAxis"
                  type="monotone"
                  dataKey={`actual_${s.id}`}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#grad_${s.id})`}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                  name={`${s.name} (Histórico)`}
                />
              ))}

              {/* 2. Dashed / Dotted Curve with reduced opacity for Future Projections (Estimates) */}
              {seriesConfigs.filter(s => selectedSeriesIds.includes(s.id)).map(s => (
                <Line
                  key={`proj_${s.id}`}
                  yAxisId="compoundAxis"
                  type="monotone"
                  dataKey={`projected_${s.id}`}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  strokeOpacity={0.75}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                  name={`${s.name} (Projeção Futura)`}
                />
              ))}

              {/* Weight Trend Line (Emerald Green) */}
              {isWeightSelected && (
                <Line
                  yAxisId={hasWeightData ? 'weightAxis' : 'compoundAxis'}
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#10b981', stroke: '#064e3b', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#34d399' }}
                  connectNulls={true}
                  name="Peso Corporal (kg)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {isWeightSelected && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Evolução de Peso (kg)
              </span>
            )}
            {seriesConfigs.filter(s => selectedSeriesIds.includes(s.id)).map(s => (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Linha sólida: Histórico
            </span>
            <span className="flex items-center gap-1 text-purple-300">
              <span className="w-3 border-b-2 border-dashed border-purple-400 inline-block" /> Tracejada: Projeção futura
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
