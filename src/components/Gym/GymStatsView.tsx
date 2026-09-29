import React, { useState, useMemo } from 'react';
import { WorkoutSession } from '../../types';
import { UnifiedAnatomyMap } from '../Anatomy/UnifiedAnatomyMap';
import { Dumbbell, Calendar, Flame, TrendingDown, TrendingUp, Activity, Sparkles } from 'lucide-react';

interface GymStatsViewProps {
  history: WorkoutSession[];
  weightDelta30d?: number;
}

export const GymStatsView: React.FC<GymStatsViewProps> = ({
  history,
  weightDelta30d = -0.8,
}) => {
  const [timeframe, setTimeframe] = useState<'week' | '30d' | '90d' | 'all'>('30d');
  const [metricTab, setMetricTab] = useState<'balance' | 'fatigue' | 'strength'>('balance');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Metric: Workouts This Month
  const thisMonthCount = useMemo(() => {
    return history.filter(session => {
      const d = new Date(session.startTime || session.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [history, currentMonth, currentYear]);

  // 2. Metric: Week Streak
  const weekStreak = useMemo(() => {
    if (history.length === 0) return 0;
    // Count consecutive weeks with at least 1 workout
    const weekKeys = new Set(
      history.map(s => {
        const d = new Date(s.startTime || s.date);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
        return `${d.getFullYear()}-W${week}`;
      })
    );
    return Math.max(1, Math.min(52, weekKeys.size));
  }, [history]);

  // 3. Activity Heatmap: Last 12 months (52 weeks x 7 days)
  const heatmapData = useMemo(() => {
    const matrix: { date: string; intensity: number; workoutName?: string }[][] = [];
    const today = new Date();
    // 52 weeks back
    const startSunday = new Date(today);
    startSunday.setDate(today.getDate() - (52 * 7) + (6 - today.getDay()));

    const workoutDatesMap = new Map<string, WorkoutSession[]>();
    history.forEach(s => {
      const key = (s.startTime || s.date || '').slice(0, 10);
      const list = workoutDatesMap.get(key) || [];
      list.push(s);
      workoutDatesMap.set(key, list);
    });

    for (let w = 0; w < 52; w++) {
      const weekCols: { date: string; intensity: number; workoutName?: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(startSunday);
        dayDate.setDate(startSunday.getDate() + (w * 7) + d);
        const iso = dayDate.toISOString().slice(0, 10);

        const dayWorkouts = workoutDatesMap.get(iso) || [];
        let intensity = 0;
        if (dayWorkouts.length > 0) {
          const totalVol = dayWorkouts.reduce((a, b) => a + (b.totalVolumeKg || 0), 0);
          intensity = totalVol > 6000 ? 4 : totalVol > 3000 ? 3 : totalVol > 1000 ? 2 : 1;
        }

        weekCols.push({
          date: iso,
          intensity,
          workoutName: dayWorkouts[0]?.name,
        });
      }
      matrix.push(weekCols);
    }
    return matrix;
  }, [history]);

  // Filtered workouts for anatomy map
  const filteredSessions = useMemo(() => {
    if (timeframe === 'all') return history;
    const daysLimit = timeframe === 'week' ? 7 : timeframe === '30d' ? 30 : 90;
    const cutoff = Date.now() - daysLimit * 24 * 60 * 60 * 1000;
    return history.filter(s => new Date(s.startTime || s.date).getTime() >= cutoff);
  }, [history, timeframe]);

  // Month labels for the heatmap
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 4 Core openGym Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Workouts */}
        <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <Dumbbell className="w-3.5 h-3.5 text-[#ccff00]" />
            <span>Treinos</span>
          </div>
          <span className="text-2xl font-black text-white font-mono block">
            {history.length}
          </span>
          <span className="text-[10px] text-slate-500">Total registrado</span>
        </div>

        {/* Card 2: This month */}
        <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Este Mês</span>
          </div>
          <span className="text-2xl font-black text-white font-mono block">
            {thisMonthCount}
          </span>
          <span className="text-[10px] text-slate-500">Sessões concluídas</span>
        </div>

        {/* Card 3: Week streak */}
        <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Week Streak</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">
              {weekStreak}
            </span>
            <span className="text-xs text-amber-400 font-bold">sem</span>
          </div>
          <span className="text-[10px] text-slate-500">Consistência contínua</span>
        </div>

        {/* Card 4: Weight 30d */}
        <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            {weightDelta30d <= 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-[#ccff00]" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>Peso 30d</span>
          </div>
          <span
            className={`text-2xl font-black font-mono block ${
              weightDelta30d <= 0 ? 'text-[#ccff00]' : 'text-sky-400'
            }`}
          >
            {weightDelta30d > 0 ? `+${weightDelta30d}` : `${weightDelta30d}`} kg
          </span>
          <span className="text-[10px] text-slate-500">Variação no mês</span>
        </div>
      </div>

      {/* Activity Heatmap — Last 12 Months */}
      <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Atividade — Últimos 12 Meses
            </span>
            <span className="text-xs text-slate-500">Frequência e consistência de treinos</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span>Menos</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-white/[0.06]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#ccff00]/30" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#ccff00]/60" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#ccff00]" />
            <span>Mais</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto no-scrollbar py-2">
          <div className="inline-flex gap-1 min-w-[680px]">
            {heatmapData.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map((day, dIdx) => {
                  const bgClass =
                    day.intensity === 4
                      ? 'bg-[#ccff00] shadow-[0_0_6px_rgba(204,255,0,0.6)]'
                      : day.intensity === 3
                      ? 'bg-[#ccff00]/70'
                      : day.intensity === 2
                      ? 'bg-[#ccff00]/40'
                      : day.intensity === 1
                      ? 'bg-[#ccff00]/20'
                      : 'bg-white/[0.04] hover:bg-white/[0.08]';

                  return (
                    <div
                      key={dIdx}
                      title={`${day.date}${day.workoutName ? ` • ${day.workoutName}` : ''}`}
                      className={`w-2.5 h-2.5 rounded-sm transition-all cursor-pointer ${bgClass}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Muscle Balance & Anatomy Map */}
      <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sub tabs: Muscle balance | Fatigue | Strength */}
          <div className="flex items-center gap-1 p-1 bg-black/50 border border-white/[0.08] rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setMetricTab('balance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metricTab === 'balance'
                  ? 'bg-white/[0.1] text-white shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Equilíbrio Muscular
            </button>
            <button
              type="button"
              onClick={() => setMetricTab('fatigue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metricTab === 'fatigue'
                  ? 'bg-white/[0.1] text-white shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fadiga & Recuperação
            </button>
          </div>

          {/* Timeframe pills: Week | 30d | 90d | All */}
          <div className="flex items-center gap-1">
            {(['week', '30d', '90d', 'all'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeframe === t
                    ? 'bg-[#ccff00] text-black font-black shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {t === 'week' ? 'Semana' : t === '30d' ? '30d' : t === '90d' ? '90d' : 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {/* Anatomical Model */}
        <UnifiedAnatomyMap
          mode="fatigue"
          workoutSessions={filteredSessions}
        />
      </div>
    </div>
  );
};
