import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { Compound, Injection, Protocol, LabResult } from '../../types';
import { generateSerumCurve, CurveDataPoint } from '../../lib/pharmacokinetics';
import { Activity, Calendar, Zap, AlertCircle, Syringe, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PharmacokineticChartProps {
  compound: Compound;
  injections: Injection[];
  protocols: Protocol[];
  labs: LabResult[];
  onOpenLogDose: () => void;
}

export const PharmacokineticChart: React.FC<PharmacokineticChartProps> = ({
  compound,
  injections,
  protocols,
  labs,
  onOpenLogDose,
}) => {
  const [timeRange, setTimeRange] = useState<'14d' | '30d' | '60d'>('30d');

  const rangeConfig = useMemo(() => {
    switch (timeRange) {
      case '14d':
        return { daysPast: 10, daysFuture: 7, stepHours: 4 };
      case '60d':
        return { daysPast: 40, daysFuture: 20, stepHours: 8 };
      case '30d':
      default:
        return { daysPast: 21, daysFuture: 14, stepHours: 6 };
    }
  }, [timeRange]);

  const { points, summary } = useMemo(() => {
    return generateSerumCurve(compound, injections, protocols, labs, rangeConfig);
  }, [compound, injections, protocols, labs, rangeConfig]);

  // Find index or timestamp closest to "Now"
  const nowMs = Date.now();
  const closestNowPoint = useMemo(() => {
    return points.reduce((prev, curr) => 
      Math.abs(curr.timestamp - nowMs) < Math.abs(prev.timestamp - nowMs) ? curr : prev
    , points[0]);
  }, [points, nowMs]);

  // Status icon & label
  const statusConfig = {
    peak: { label: 'Em Pico de Absorção', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
    dropping: { label: 'Fase de Eliminação', icon: TrendingDown, color: 'text-amber-400 bg-amber-950/40 border-amber-800/50' },
    steady: { label: 'Nível Estabilizado', icon: Minus, color: 'text-blue-400 bg-blue-950/40 border-blue-800/50' },
    trough: { label: 'No Vale (Mínimo)', icon: AlertCircle, color: 'text-rose-400 bg-rose-950/40 border-rose-800/50' },
  }[summary.status];

  const StatusIcon = statusConfig.icon;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: CurveDataPoint = payload[0].payload;
    const isFuture = data.isFuture;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {data.dateLabel}
          </span>
          {isFuture && (
            <span className="bg-purple-950/60 text-purple-300 border border-purple-800/50 text-[10px] font-medium px-1.5 py-0.5 rounded-md">
              Projeção
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between pt-0.5">
          <span className="text-slate-400">Concentração estimada:</span>
          <span className="font-bold text-sm text-blue-400">
            {isFuture ? data.projectedLevel : data.actualLevel} {summary.unit}
          </span>
        </div>

        {data.injectionPoint && (
          <div className="p-2 bg-blue-950/50 border border-blue-800/60 rounded-xl space-y-1 text-blue-200">
            <div className="flex items-center gap-1.5 font-semibold text-[11px] text-blue-300">
              <Syringe className="w-3.5 h-3.5 text-blue-400" />
              Injeção Aplicada
            </div>
            <div>Dose: <strong>{data.injectionPoint.dose} {data.injectionPoint.unit}</strong></div>
            <div className="text-[10px] text-slate-300">Local: {data.injectionPoint.site}</div>
          </div>
        )}

        {data.labPoint && (
          <div className="p-2 bg-emerald-950/50 border border-emerald-800/60 rounded-xl space-y-0.5 text-emerald-200">
            <div className="flex items-center gap-1.5 font-semibold text-[11px] text-emerald-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Exame Laboratorial Real
            </div>
            <div>Resultado: <strong className="text-white">{data.labPoint.value} {data.labPoint.unit}</strong></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Metric Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 backdrop-blur-sm shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div 
          className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: compound.color }}
        />

        <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20" 
                style={{ backgroundColor: compound.color }} 
              />
              <h2 className="text-sm font-medium text-slate-400 tracking-wide">
                {compound.name}
              </h2>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-extrabold tracking-tight text-white">
                {summary.currentLevel}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                {summary.unit}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusConfig.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusConfig.label}</span>
            </div>
            {summary.trendPercentage24h !== 0 && (
              <span className="text-[11px] text-slate-400">
                {summary.trendPercentage24h > 0 ? '+' : ''}{summary.trendPercentage24h}% nas últimas 24h
              </span>
            )}
          </div>
        </div>

        {/* Action button & Countdown pill */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            {summary.nextProjectedDose ? (
              <span>
                Próxima dose planejada:{' '}
                <strong className="text-slate-200">
                  {summary.nextProjectedDose.dose} {compound.unit} em{' '}
                  {summary.nextProjectedDose.date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </strong>
              </span>
            ) : (
              <span>Nenhum protocolo recorrente ativo configurado</span>
            )}
          </div>

          <button
            onClick={onOpenLogDose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
          >
            <Syringe className="w-3.5 h-3.5" />
            <span>Registrar Dose</span>
          </button>
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Curva Farmacocinética Sérica
            </span>
          </div>

          {/* Time range switcher */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            {(['14d', '30d', '60d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range === '14d' ? '14 Dias' : range === '30d' ? '30 Dias' : '60 Dias'}
              </button>
            ))}
          </div>
        </div>

        {/* The Recharts Graphic */}
        <div className="w-full h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={compound.color} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={compound.color} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="dayLabel"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Reference Range Band (if available for compound) */}
              {compound.standardReferenceRange && (
                <ReferenceArea
                  y1={compound.standardReferenceRange.min}
                  y2={compound.standardReferenceRange.max}
                  fill="#3b82f6"
                  fillOpacity={0.04}
                  stroke="#3b82f6"
                  strokeOpacity={0.15}
                  strokeDasharray="3 3"
                />
              )}

              {/* "Now" vertical line */}
              {closestNowPoint && (
                <ReferenceLine
                  x={closestNowPoint.dayLabel}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Hoje',
                    position: 'insideTopLeft',
                    fill: '#f43f5e',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Solid curve for actual / logged history */}
              <Area
                type="monotone"
                dataKey="actualLevel"
                stroke={compound.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#curveGradient)"
                name="Nível Real"
                connectNulls={false}
              />

              {/* Dashed curve for future projected schedule */}
              <Area
                type="monotone"
                dataKey="projectedLevel"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#projectedGradient)"
                name="Projeção Futura"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Information */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: compound.color }} />
              Nível Estimado Real
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-purple-500 border-dashed" />
              Projeção Futura (Protocolo)
            </span>
          </div>

          {compound.standardReferenceRange && (
            <span className="text-slate-500">
              Faixa de Ref: {compound.standardReferenceRange.min} - {compound.standardReferenceRange.max} {compound.standardReferenceRange.unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
