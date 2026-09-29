import React from 'react';
import {
  Protocol,
  Injection,
  DailyWaterData,
  UserProfile,
  Routine,
  WorkoutSession,
  Compound,
} from '../../types';
import { isProtocolDueToday } from '../../lib/notifications';
import { getLocalDateKey, formatDisplayDate } from '../../lib/dateUtils';
import {
  Calendar,
  Syringe,
  Dumbbell,
  Droplets,
  Scale,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface TodayViewProps {
  protocols: Protocol[];
  compounds: Compound[];
  injections: Injection[];
  waterData: DailyWaterData;
  profile?: UserProfile | null;
  activeSession: WorkoutSession | null;
  routines: Routine[];
  onOpenNewInjection: (protocol?: Protocol) => void;
  onStartWorkout: (routine?: Routine) => void;
  onResumeWorkout: () => void;
  onOpenWaterModal: () => void;
  onAddWaterQuick: (amountMl: number) => void;
  onOpenWeightModal: () => void;
  onNavigateTab: (tab: any) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  protocols,
  compounds,
  injections,
  waterData,
  profile,
  activeSession,
  routines,
  onOpenNewInjection,
  onStartWorkout,
  onResumeWorkout,
  onOpenWaterModal,
  onAddWaterQuick,
  onOpenWeightModal,
  onNavigateTab,
}) => {
  const todayStr = getLocalDateKey();
  const todayDate = new Date();
  const currentWeekday = todayDate.getDay(); // 0 = Sunday ... 6 = Saturday

  // 1. Identify protocols due today and doses taken today
  const dueProtocols = protocols.filter(p => p.active && isProtocolDueToday(p));
  const todayInjections = injections.filter(inj => inj.date.startsWith(todayStr));

  // 2. Identify workout for today
  // If a routine has targetWeekday === currentWeekday, it's today's scheduled routine
  const todayRoutine = routines.find(r => r.active && r.targetWeekday === currentWeekday) || routines[0];

  // 3. Weekly Strip (7 days: Mon-Sun)
  const mondayOffset = (currentWeekday + 6) % 7;
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - mondayOffset);

  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dIso = d.toISOString().slice(0, 10);
    const isToday = dIso === todayStr;
    const hasInj = injections.some(inj => inj.date.startsWith(dIso));
    const dayLetter = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()];

    return {
      dayIndex: d.getDay(),
      dateNumber: d.getDate(),
      dayLetter,
      isToday,
      hasInj,
      iso: dIso,
    };
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-6">
      {/* Greeting & Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            {formatDisplayDate(todayStr)}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Olá, {profile?.name || 'Atleta'} 👋
          </h1>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Fase Ativa</span>
        </div>
      </div>

      {/* 7-Day Horizontal Week Strip */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-3.5 shadow-xl">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {weekDays.map(item => (
            <div
              key={item.iso}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
                item.isToday
                  ? 'bg-gradient-to-b from-cyan-500/20 to-blue-600/30 border border-cyan-500/50 shadow-lg shadow-cyan-950/40 scale-105'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <span className={`text-[10px] font-bold ${item.isToday ? 'text-cyan-400' : 'text-slate-400'}`}>
                {item.dayLetter}
              </span>
              <span className={`text-sm font-black my-0.5 ${item.isToday ? 'text-white' : 'text-slate-200'}`}>
                {item.dateNumber}
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                  item.hasInj
                    ? 'bg-cyan-400 shadow-sm shadow-cyan-400/80'
                    : item.isToday
                    ? 'bg-cyan-500/40'
                    : 'bg-transparent'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Core Action Cards: Medication Dose & Workout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1: MEDICATION DOSE OF TODAY */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/40 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Aplicação & Protocolo
                  </h3>
                  <span className="text-base font-black text-white">Dose de Hoje</span>
                </div>
              </div>

              {todayInjections.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aplicada
                </span>
              )}
            </div>

            {dueProtocols.length > 0 ? (
              <div className="space-y-2">
                {dueProtocols.map(proto => {
                  const comp = compounds.find(c => c.id === proto.compoundId);
                  const isTaken = todayInjections.some(inj => inj.protocolId === proto.id);
                  return (
                    <div
                      key={proto.id}
                      className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-black text-white">{proto.name}</div>
                        <div className="text-xs text-cyan-400 font-semibold mt-0.5">
                          {proto.dose} {comp?.unit || 'mg'} • {proto.route}
                        </div>
                      </div>

                      {isTaken ? (
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Feito
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenNewInjection(proto)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
                        >
                          Tomar Dose
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : todayInjections.length > 0 ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">
                Você já registrou {todayInjections.length} aplicação(ões) hoje. Seus níveis séricos estão projetados!
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
                <span>Nenhuma dose obrigatória programada para hoje.</span>
                <button
                  type="button"
                  onClick={() => onOpenNewInjection()}
                  className="text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  + Dose Extra
                </button>
              </div>
            )}
          </div>

          <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Farmacocinética Estável</span>
            <button
              type="button"
              onClick={() => onNavigateTab('pharma')}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              Ver Curva <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CARD 2: WORKOUT OF TODAY */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/40 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Treino & Hipertrofia
                  </h3>
                  <span className="text-base font-black text-white">Sessão de Hoje</span>
                </div>
              </div>

              {activeSession && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/60 animate-pulse">
                  Em Andamento
                </span>
              )}
            </div>

            {activeSession ? (
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-white">{activeSession.name}</div>
                  <div className="text-xs text-amber-300 mt-0.5">Sessão ativa não finalizada</div>
                </div>
                <button
                  type="button"
                  onClick={onResumeWorkout}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-950/60"
                >
                  Retomar Treino
                </button>
              </div>
            ) : todayRoutine ? (
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{todayRoutine.emoji || '⚡'}</span>
                    <span className="text-sm font-black text-white truncate">{todayRoutine.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {todayRoutine.exercises.length} exercícios programados
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onStartWorkout(todayRoutine)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-950/50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Iniciar
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
                <span>Dia livre de treino. Descanse ou faça uma sessão livre.</span>
                <button
                  type="button"
                  onClick={() => onStartWorkout()}
                  className="text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  + Treino Livre
                </button>
              </div>
            )}
          </div>

          <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Periodização Semanal</span>
            <button
              type="button"
              onClick={() => onNavigateTab('gym')}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
            >
              Ver Rotinas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Support Cards: Water & Body Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WATER CARD */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Droplets className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Hidratação Celular
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenWaterModal}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold"
            >
              Ajustar Meta
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white">{waterData.totalMl}</span>
              <span className="text-xs text-slate-400 ml-1.5">/ {waterData.targetMl} ml</span>
            </div>
            <span className="text-xs font-bold text-blue-400">
              {Math.min(100, Math.round((waterData.totalMl / (waterData.targetMl || 2500)) * 100))}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (waterData.totalMl / (waterData.targetMl || 2500)) * 100)}%`,
              }}
            />
          </div>

          {/* Quick buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onAddWaterQuick(250)}
              className="flex-1 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-blue-300 text-xs font-bold border border-slate-800"
            >
              +250ml
            </button>
            <button
              type="button"
              onClick={() => onAddWaterQuick(500)}
              className="flex-1 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-blue-300 text-xs font-bold border border-slate-800"
            >
              +500ml
            </button>
          </div>
        </div>

        {/* BODY WEIGHT CARD */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Scale className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Peso & IMC
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenWeightModal}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
            >
              + Registrar Peso
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white">
                {profile?.weightKg ? `${profile.weightKg} kg` : 'Sem registro'}
              </span>
              {profile?.heightCm && profile?.weightKg && (
                <span className="text-xs text-slate-400 ml-2">
                  IMC: {(profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)}
                </span>
              )}
            </div>

            {profile?.targetWeightKg && (
              <span className="text-xs font-bold text-amber-400">
                Meta: {profile.targetWeightKg} kg
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            Mantenha suas pesagens matinais em jejum para correlação precisa com a farmacocinética e retenção hídrica.
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => onNavigateTab('health')}
              className="w-full py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-indigo-300 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1"
            >
              Ver Histórico & Sintomas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
