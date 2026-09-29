import React, { useState, useMemo } from 'react';
import { Injection, WorkoutSession, MuscleGroup } from '../../types';
import { INJECTION_SITE_LABELS } from '../../lib/defaultCompounds';
import { DEFAULT_EXERCISES } from '../../domain/gym/exerciseData';
import { Exercise } from '../../types';
import { Syringe, Dumbbell, ShieldCheck, AlertCircle, Info, Sparkles } from 'lucide-react';

export type AnatomyMode = 'injection' | 'fatigue';

interface UnifiedAnatomyMapProps {
  mode?: AnatomyMode;
  onModeChange?: (mode: AnatomyMode) => void;
  injections?: Injection[];
  workoutSessions?: WorkoutSession[];
  onSelectSite?: (siteKey: string) => void;
  onSelectMuscle?: (muscle: MuscleGroup) => void;
  className?: string;
}

interface SiteStatus {
  key: string;
  label: string;
  daysAgo: number | null;
  lastDate: string | null;
  status: 'fresh' | 'recovering' | 'ready'; // fresh <= 2 days (red), recovering 3-5 days (amber), ready >= 6 days (green)
}

interface MuscleFatigue {
  muscle: MuscleGroup;
  label: string;
  fatiguePercent: number; // 0 to 100
  hoursAgo: number | null;
  lastSessionDate: string | null;
  totalSetsRecent: number;
}

export const UnifiedAnatomyMap: React.FC<UnifiedAnatomyMapProps> = ({
  mode: controlledMode,
  onModeChange,
  injections = [],
  workoutSessions = [],
  onSelectSite,
  onSelectMuscle,
  className = '',
}) => {
  const [internalMode, setInternalMode] = useState<AnatomyMode>('injection');
  const [viewSide, setViewSide] = useState<'front' | 'back'>('front');
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const activeMode = controlledMode || internalMode;
  const setMode = (newMode: AnatomyMode) => {
    if (onModeChange) onModeChange(newMode);
    else setInternalMode(newMode);
  };

  // 1. Calculate Injection Sites Status
  const injectionStatusMap = useMemo<Record<string, SiteStatus>>(() => {
    const now = Date.now();
    const result: Record<string, SiteStatus> = {};

    Object.keys(INJECTION_SITE_LABELS).forEach(siteKey => {
      const siteLogs = injections
        .filter(inj => inj.site === siteKey)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (siteLogs.length > 0) {
        const lastTime = new Date(siteLogs[0].date).getTime();
        const daysAgo = Math.max(0, Math.floor((now - lastTime) / (1000 * 60 * 60 * 24)));
        let status: 'fresh' | 'recovering' | 'ready' = 'ready';
        if (daysAgo <= 2) status = 'fresh';
        else if (daysAgo <= 5) status = 'recovering';

        result[siteKey] = {
          key: siteKey,
          label: INJECTION_SITE_LABELS[siteKey].label,
          daysAgo,
          lastDate: siteLogs[0].date,
          status,
        };
      } else {
        result[siteKey] = {
          key: siteKey,
          label: INJECTION_SITE_LABELS[siteKey].label,
          daysAgo: null,
          lastDate: null,
          status: 'ready',
        };
      }
    });

    return result;
  }, [injections]);

  // 2. Calculate Muscle Fatigue from recent workouts
  const muscleFatigueMap = useMemo<Record<string, MuscleFatigue>>(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentSessions = workoutSessions.filter(
      s => new Date(s.startTime).getTime() >= sevenDaysAgo
    );

    const muscles: { id: MuscleGroup; label: string }[] = [
      { id: 'chest', label: 'Peitoral' },
      { id: 'back', label: 'Dorsal / Costas' },
      { id: 'shoulders', label: 'Deltóides' },
      { id: 'biceps', label: 'Bíceps' },
      { id: 'triceps', label: 'Tríceps' },
      { id: 'quads', label: 'Quadríceps' },
      { id: 'hamstrings', label: 'Posterior de Coxa' },
      { id: 'glutes', label: 'Glúteos' },
      { id: 'calves', label: 'Panturrilhas' },
      { id: 'abs', label: 'Abdômen / Core' },
    ];

    const result: Record<string, MuscleFatigue> = {};
    const exerciseMap = new Map<string, Exercise>(DEFAULT_EXERCISES.map((e: Exercise) => [e.id, e]));

    muscles.forEach(({ id, label }) => {
      let mostRecentTime: number | null = null;
      let totalSets = 0;

      recentSessions.forEach(session => {
        const sessionTime = new Date(session.startTime).getTime();
        session.exercises.forEach(we => {
          const ex = exerciseMap.get(we.exerciseId);
          if (ex && (ex.targetMuscle === id || ex.secondaryMuscles?.includes(id))) {
            const completedSets = we.sets.filter(s => s.completed).length;
            totalSets += completedSets;
            if (!mostRecentTime || sessionTime > mostRecentTime) {
              mostRecentTime = sessionTime;
            }
          }
        });
      });

      if (mostRecentTime) {
        const hoursAgo = Math.max(0, Math.floor((now - mostRecentTime) / (1000 * 60 * 60)));
        // Fatigue model: 0-24h = 100% decaying to 40% at 48h, 0% at 72h
        let fatigue = 0;
        if (hoursAgo < 24) {
          fatigue = Math.min(100, Math.round(90 + totalSets * 1.5));
        } else if (hoursAgo < 48) {
          fatigue = Math.round(70 - (hoursAgo - 24) * 2);
        } else if (hoursAgo < 72) {
          fatigue = Math.round(30 - (hoursAgo - 48) * 1.25);
        } else {
          fatigue = Math.max(0, 10 - Math.round((hoursAgo - 72) / 10));
        }

        result[id] = {
          muscle: id,
          label,
          fatiguePercent: Math.max(0, Math.min(100, fatigue)),
          hoursAgo,
          lastSessionDate: new Date(mostRecentTime).toLocaleDateString('pt-BR'),
          totalSetsRecent: totalSets,
        };
      } else {
        result[id] = {
          muscle: id,
          label,
          fatiguePercent: 0,
          hoursAgo: null,
          lastSessionDate: null,
          totalSetsRecent: 0,
        };
      }
    });

    return result;
  }, [workoutSessions]);

  // Color resolution helpers
  const getSiteColor = (siteKey: string) => {
    const status = injectionStatusMap[siteKey]?.status || 'ready';
    if (status === 'fresh') return '#f43f5e'; // Rose 500
    if (status === 'recovering') return '#f59e0b'; // Amber 500
    return '#10b981'; // Emerald 500
  };

  const getMuscleColor = (muscleId: string) => {
    const fatigue = muscleFatigueMap[muscleId]?.fatiguePercent || 0;
    if (fatigue >= 70) return '#ef4444'; // Red 500 (Fatigued)
    if (fatigue >= 40) return '#f59e0b'; // Amber 500 (Recovering)
    if (fatigue > 0) return '#06b6d4'; // Cyan 500 (Near fresh)
    return '#334155'; // Slate 700 (Fresh / Rested)
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 ${className}`}>
      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {activeMode === 'injection' ? (
            <Syringe className="w-5 h-5 text-cyan-400" />
          ) : (
            <Dumbbell className="w-5 h-5 text-purple-400" />
          )}
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {activeMode === 'injection' ? 'Mapa Anatômico de Aplicações' : 'Mapa de Fadiga & Recuperação Muscular'}
            </h3>
            <p className="text-xs text-slate-400">
              {activeMode === 'injection'
                ? 'Monitore rotação para evitar fibrose tecidual'
                : 'Recuperação estimada dos treinos dos últimos 7 dias'}
            </p>
          </div>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('injection')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'injection'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Syringe className="w-3.5 h-3.5" />
            Injeções
          </button>
          <button
            type="button"
            onClick={() => setMode('fatigue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'fatigue'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Fadiga Gym
          </button>
        </div>
      </div>

      {/* View Side Selector (Frente / Verso) & Legend */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => setViewSide('front')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              viewSide === 'front'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Frente
          </button>
          <button
            type="button"
            onClick={() => setViewSide('back')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors ${
              viewSide === 'back'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Costas
          </button>
        </div>

        {/* Legend */}
        {activeMode === 'injection' ? (
          <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Descansado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              3-5d
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Recente
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
              100% Pronto
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Recuperando
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              Fadiga Alta
            </span>
          </div>
        )}
      </div>

      {/* Main Interactive Anatomy Vector Canvas */}
      <div className="relative bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[340px]">
        {/* SVG Graphic (Vector Silhouette with Muscle Part Paths & Injection Target Rings) */}
        <svg
          viewBox="0 0 300 420"
          className="w-full max-w-[260px] h-[340px] select-none"
          aria-label="Mapa Anatômico Interativo"
        >
          <defs>
            <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* HEAD & NECK */}
          <ellipse cx="150" cy="35" rx="20" ry="24" fill="#334155" />
          <path d="M142 58 L142 75 L158 75 L158 58 Z" fill="#334155" />

          {/* FRONT VIEW */}
          {viewSide === 'front' && (
            <g id="anatomy-front">
              {/* Shoulders / Deltoids */}
              {/* Deltoid Left (Anatomical Left = Viewer's Right) */}
              <path
                id="deltoid-left"
                d="M178 78 C195 82 205 95 198 120 C190 122 182 110 178 98 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('shoulders') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('shoulders')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('shoulders')}
              />
              {/* Deltoid Right (Anatomical Right = Viewer's Left) */}
              <path
                id="deltoid-right"
                d="M122 78 C105 82 95 95 102 120 C110 122 118 110 122 98 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('shoulders') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('shoulders')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('shoulders')}
              />

              {/* Chest / Peitoral */}
              <path
                id="chest-left"
                d="M152 82 L176 82 C180 96 178 120 152 125 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('chest') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('chest')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('chest')}
              />
              <path
                id="chest-right"
                d="M148 82 L124 82 C120 96 122 120 148 125 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('chest') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('chest')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('chest')}
              />

              {/* Biceps */}
              <path
                id="biceps-right"
                d="M100 122 C96 142 98 165 108 175 C114 165 116 140 108 122 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('biceps') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('biceps')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('biceps')}
              />
              <path
                id="biceps-left"
                d="M200 122 C204 142 202 165 192 175 C186 165 184 140 192 122 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('biceps') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('biceps')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('biceps')}
              />

              {/* Forearms */}
              <path
                d="M108 178 C102 200 100 225 106 240 L114 238 C116 220 114 195 110 178 Z"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1"
              />
              <path
                d="M192 178 C198 200 200 225 194 240 L186 238 C184 220 186 195 190 178 Z"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1"
              />

              {/* Abs / Core */}
              <rect
                x="134"
                y="130"
                width="32"
                height="62"
                rx="6"
                fill={activeMode === 'fatigue' ? getMuscleColor('abs') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('abs')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('abs')}
              />

              {/* Quadriceps (Coxas Frente) */}
              <path
                id="quad-right"
                d="M125 205 C118 240 120 280 128 310 C136 310 144 285 146 220 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('quads') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('quads')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('quads')}
              />
              <path
                id="quad-left"
                d="M175 205 C182 240 180 280 172 310 C164 310 156 285 154 220 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('quads') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('quads')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('quads')}
              />

              {/* Calves (Panturrilhas Frente) */}
              <path
                d="M126 320 C120 345 122 380 128 400 L136 400 C138 380 138 345 134 320 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('calves') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1"
              />
              <path
                d="M174 320 C180 345 178 380 172 400 L164 400 C162 380 162 345 166 320 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('calves') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1"
              />

              {/* INJECTION TARGET NODES (FRONT) */}
              {activeMode === 'injection' && (
                <g id="injection-nodes-front">
                  {/* Deltoid Right */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('deltoid_right')}
                    onMouseEnter={() => setHoveredSite('deltoid_right')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="108" cy="98" r="9" fill={getSiteColor('deltoid_right')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="108" cy="98" r="3" fill="#ffffff" />
                  </g>

                  {/* Deltoid Left */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('deltoid_left')}
                    onMouseEnter={() => setHoveredSite('deltoid_left')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="192" cy="98" r="9" fill={getSiteColor('deltoid_left')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="192" cy="98" r="3" fill="#ffffff" />
                  </g>

                  {/* Abdomen Right SubQ */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('abdomen_subq_right')}
                    onMouseEnter={() => setHoveredSite('abdomen_subq_right')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="140" cy="165" r="8" fill={getSiteColor('abdomen_subq_right')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="140" cy="165" r="2.5" fill="#ffffff" />
                  </g>

                  {/* Abdomen Left SubQ */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('abdomen_subq_left')}
                    onMouseEnter={() => setHoveredSite('abdomen_subq_left')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="160" cy="165" r="8" fill={getSiteColor('abdomen_subq_left')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="160" cy="165" r="2.5" fill="#ffffff" />
                  </g>

                  {/* Quad / Vasto Lateral Right */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('quad_right')}
                    onMouseEnter={() => setHoveredSite('quad_right')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="124" cy="250" r="9" fill={getSiteColor('quad_right')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="124" cy="250" r="3" fill="#ffffff" />
                  </g>

                  {/* Quad / Vasto Lateral Left */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('quad_left')}
                    onMouseEnter={() => setHoveredSite('quad_left')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="176" cy="250" r="9" fill={getSiteColor('quad_left')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="176" cy="250" r="3" fill="#ffffff" />
                  </g>
                </g>
              )}
            </g>
          )}

          {/* BACK VIEW */}
          {viewSide === 'back' && (
            <g id="anatomy-back">
              {/* Back / Upper Traps & Lats */}
              <path
                id="upper-back"
                d="M136 78 L164 78 L184 100 L180 150 L120 150 L116 100 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('back') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('back')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('back')}
              />

              {/* Triceps */}
              <path
                d="M100 120 C94 140 96 168 106 178 C112 168 114 142 108 120 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('triceps') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('triceps')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('triceps')}
              />
              <path
                d="M200 120 C206 140 204 168 194 178 C188 168 186 142 192 120 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('triceps') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('triceps')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('triceps')}
              />

              {/* Glutes */}
              <path
                id="glute-right"
                d="M122 178 C115 195 120 225 148 225 L148 178 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('glutes') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('glutes')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('glutes')}
              />
              <path
                id="glute-left"
                d="M178 178 C185 195 180 225 152 225 L152 178 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('glutes') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('glutes')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('glutes')}
              />

              {/* Hamstrings (Posterior de Coxa) */}
              <path
                d="M125 230 C120 260 122 290 130 310 C138 310 144 285 146 230 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('hamstrings') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('hamstrings')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('hamstrings')}
              />
              <path
                d="M175 230 C180 260 178 290 170 310 C162 310 156 285 154 230 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('hamstrings') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1.5"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMuscle('hamstrings')}
                onMouseLeave={() => setHoveredMuscle(null)}
                onClick={() => onSelectMuscle?.('hamstrings')}
              />

              {/* Calves Back */}
              <path
                d="M126 320 C118 345 120 380 128 400 L136 400 C138 380 140 345 134 320 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('calves') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1"
              />
              <path
                d="M174 320 C182 345 180 380 172 400 L164 400 C162 380 160 345 166 320 Z"
                fill={activeMode === 'fatigue' ? getMuscleColor('calves') : '#1e293b'}
                stroke="#475569"
                strokeWidth="1"
              />

              {/* INJECTION TARGET NODES (BACK) */}
              {activeMode === 'injection' && (
                <g id="injection-nodes-back">
                  {/* Ventroglute Right (Lateral Upper Quadril) */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('ventroglute_right')}
                    onMouseEnter={() => setHoveredSite('ventroglute_right')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="118" cy="185" r="9" fill={getSiteColor('ventroglute_right')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="118" cy="185" r="3" fill="#ffffff" />
                  </g>

                  {/* Ventroglute Left */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('ventroglute_left')}
                    onMouseEnter={() => setHoveredSite('ventroglute_left')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="182" cy="185" r="9" fill={getSiteColor('ventroglute_left')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="182" cy="185" r="3" fill="#ffffff" />
                  </g>

                  {/* Dorsoglute Right */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('glute_right')}
                    onMouseEnter={() => setHoveredSite('glute_right')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="134" cy="205" r="9" fill={getSiteColor('glute_right')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="134" cy="205" r="3" fill="#ffffff" />
                  </g>

                  {/* Dorsoglute Left */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.('glute_left')}
                    onMouseEnter={() => setHoveredSite('glute_left')}
                    onMouseLeave={() => setHoveredSite(null)}
                  >
                    <circle cx="166" cy="205" r="9" fill={getSiteColor('glute_left')} fillOpacity="0.85" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="166" cy="205" r="3" fill="#ffffff" />
                  </g>
                </g>
              )}
            </g>
          )}
        </svg>

        {/* Dynamic Detail Card / Tooltip at Bottom of Canvas */}
        <div className="w-full mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs min-h-[48px] flex items-center justify-between">
          {activeMode === 'injection' ? (
            hoveredSite && injectionStatusMap[hoveredSite] ? (
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="font-bold text-white block">
                    {injectionStatusMap[hoveredSite].label}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {injectionStatusMap[hoveredSite].daysAgo !== null
                      ? `Última dose: há ${injectionStatusMap[hoveredSite].daysAgo} dia(s)`
                      : 'Nenhuma aplicação recente registrada'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    injectionStatusMap[hoveredSite].status === 'fresh'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      : injectionStatusMap[hoveredSite].status === 'recovering'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  {injectionStatusMap[hoveredSite].status === 'fresh'
                    ? 'Em Descanso'
                    : injectionStatusMap[hoveredSite].status === 'recovering'
                    ? 'Recuperando'
                    : 'Recomendado'}
                </span>
              </div>
            ) : (
              <div className="text-slate-400 flex items-center gap-1.5 w-full justify-center">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Passe o cursor ou toque nos pontos para ver o descanso tecidual
              </div>
            )
          ) : hoveredMuscle && muscleFatigueMap[hoveredMuscle] ? (
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="font-bold text-white block">
                  {muscleFatigueMap[hoveredMuscle].label}
                </span>
                <span className="text-[11px] text-slate-400">
                  {muscleFatigueMap[hoveredMuscle].hoursAgo !== null
                    ? `Treinado há ${muscleFatigueMap[hoveredMuscle].hoursAgo}h (${muscleFatigueMap[hoveredMuscle].totalSetsRecent} séries recentes)`
                    : 'Sem treino recente registrado (100% recuperado)'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-cyan-400">
                  {100 - muscleFatigueMap[hoveredMuscle].fatiguePercent}% Pronto
                </span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 flex items-center gap-1.5 w-full justify-center">
              <Info className="w-3.5 h-3.5 text-purple-400" />
              Toque nos grupos musculares para ver a fadiga e prontidão
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
