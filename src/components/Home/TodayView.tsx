import React, { useState } from 'react';
import {
  Protocol,
  Injection,
  DailyWaterData,
  DailySupplementData,
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
  Calculator,
  TestTube2,
  Activity,
  Layers,
} from 'lucide-react';
import { NavTab } from '../Navigation/BottomNav';
import { SupplementCard } from '../Supplements/SupplementCard';
import { SupplementModal } from '../Supplements/SupplementModal';

interface TodayViewProps {
  protocols: Protocol[];
  compounds: Compound[];
  injections: Injection[];
  waterData: DailyWaterData;
  supplementData: DailySupplementData;
  profile?: UserProfile | null;
  activeSession: WorkoutSession | null;
  routines: Routine[];
  onOpenNewInjection: (protocol?: Protocol) => void;
  onStartWorkout: (routine?: Routine) => void;
  onResumeWorkout: () => void;
  onOpenWaterModal: () => void;
  onAddWaterQuick: (amountMl: number) => void;
  onOpenWeightModal: () => void;
  onToggleSupplementItem: (itemId: string) => void;
  onAddSupplementDose: (itemId: string, amount: number) => void;
  onSaveSupplementData: (data: DailySupplementData) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  protocols,
  compounds,
  injections,
  waterData,
  supplementData,
  profile,
  activeSession,
  routines,
  onOpenNewInjection,
  onStartWorkout,
  onResumeWorkout,
  onOpenWaterModal,
  onAddWaterQuick,
  onOpenWeightModal,
  onToggleSupplementItem,
  onAddSupplementDose,
  onSaveSupplementData,
  onNavigateTab,
}) => {
  const [isSupplementModalOpen, setIsSupplementModalOpen] = useState(false);
  const todayStr = getLocalDateKey();
  const todayDate = new Date();
  const currentWeekday = todayDate.getDay(); // 0 = Sunday ... 6 = Saturday

  // 1. Identify protocols due today and doses taken today
  const dueProtocols = protocols.filter(p => p.active && isProtocolDueToday(p));
  const todayInjections = injections.filter(inj => inj.date.startsWith(todayStr));

  // 2. Identify workout for today
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
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#ccff00] font-black">
            {formatDisplayDate(todayStr)}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Olá, {profile?.name || 'Atleta'} 👋
          </h1>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300">
          <div className="w-2 h-2 rounded-full bg-[#ccff00] shadow-[0_0_8px_#ccff00]" />
          <span className="font-semibold text-[11px]">Sincronizado</span>
        </div>
      </div>

      {/* 7-Day Horizontal Week Strip */}
      <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-3xl p-3.5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {weekDays.map(item => (
            <div
              key={item.iso}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
                item.isToday
                  ? 'bg-white/[0.08] border border-[#ccff00]/60 shadow-lg shadow-[#ccff00]/10 scale-105'
                  : 'hover:bg-white/[0.03]'
              }`}
            >
              <span className={`text-[10px] font-bold ${item.isToday ? 'text-[#ccff00]' : 'text-slate-400'}`}>
                {item.dayLetter}
              </span>
              <span className={`text-sm font-black my-0.5 ${item.isToday ? 'text-white' : 'text-slate-200'}`}>
                {item.dateNumber}
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                  item.hasInj
                    ? 'bg-[#ccff00] shadow-sm shadow-[#ccff00]'
                    : item.isToday
                    ? 'bg-[#ccff00]/40'
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
        <div className="bg-[#10121a]/90 border border-white/[0.08] hover:border-white/[0.18] rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all relative overflow-hidden group">
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/[0.06] text-[#ccff00] border border-white/[0.08]">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-black text-white">{proto.name}</div>
                        <div className="text-xs text-[#ccff00] font-semibold mt-0.5">
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
                          className="px-3.5 py-1.5 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black text-xs font-black transition-all cursor-pointer shadow-sm"
                        >
                          Aplicar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.04] text-center space-y-1">
                <span className="text-xs font-semibold text-slate-300 block">
                  Nenhuma dose agendada para hoje
                </span>
                <span className="text-[11px] text-slate-500">
                  Seus protocolos ativos estão em dia e equilibrados.
                </span>
              </div>
            )}
          </div>

          {/* Bottom Card Actions */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('chart')}
              className="text-xs text-slate-300 hover:text-white font-bold flex items-center gap-1 transition-colors"
            >
              Curva Sérica <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onOpenNewInjection()}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold transition-colors cursor-pointer"
            >
              + Outra Aplicação
            </button>
          </div>
        </div>

        {/* CARD 2: WORKOUT OF TODAY */}
        <div className="bg-[#10121a]/90 border border-white/[0.08] hover:border-white/[0.18] rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all relative overflow-hidden group">
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/[0.06] text-[#ccff00] border border-white/[0.08]">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hipertrofia & Sobrecarga
                  </h3>
                  <span className="text-base font-black text-white">Treino de Hoje</span>
                </div>
              </div>

              {activeSession ? (
                <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 animate-pulse">
                  <Play className="w-3 h-3 fill-current" /> Em Andamento
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-mono">
                  {todayRoutine ? `${todayRoutine.exercises.length} exercícios` : 'Descanso'}
                </span>
              )}
            </div>

            {/* If there's an active workout in progress, show quick resume banner */}
            {activeSession ? (
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#ccff00]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{activeSession.name}</span>
                  <span className="text-xs font-mono text-[#ccff00] font-bold">
                    {activeSession.exercises.reduce(
                      (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
                      0
                    )}{' '}
                    séries feitas
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onResumeWorkout}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Continuar Treino Ativo</span>
                </button>
              </div>
            ) : todayRoutine ? (
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{todayRoutine.emoji || '⚡'}</span>
                      {todayRoutine.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Sugerido
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {todayRoutine.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onStartWorkout(todayRoutine)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Sessão Agora</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.04] text-center space-y-1">
                <span className="text-xs font-semibold text-slate-300 block">
                  Dia de Descanso / Recuperação Ativa
                </span>
                <span className="text-[11px] text-slate-500">
                  Foque em hidratação, nutrição e sono anabólico.
                </span>
              </div>
            )}
          </div>

          {/* Bottom Card Actions */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('gym')}
              className="text-xs text-slate-300 hover:text-white font-bold flex items-center gap-1 transition-colors"
            >
              Ver Todas Rotinas <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onStartWorkout()}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold transition-colors cursor-pointer"
            >
              Treino Livre
            </button>
          </div>
        </div>
      </div>

      {/* DAILY SUPPLEMENT STACK CARD (Creatine, Whey, Vitamins) */}
      <SupplementCard
        supplementData={supplementData}
        onToggleItem={onToggleSupplementItem}
        onAddDose={onAddSupplementDose}
        onOpenModal={() => setIsSupplementModalOpen(true)}
      />

      {/* Secondary Cards: Water & Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WATER TRACKING CARD */}
        <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-400">
              <div className="p-1.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Droplets className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Hidratação Diária
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenWaterModal}
              className="text-xs text-sky-400 hover:text-sky-300 font-bold"
            >
              Histórico & Alertas
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white font-mono">{waterData.totalMl}</span>
              <span className="text-xs text-slate-400 ml-1">/ {waterData.targetMl} ml</span>
            </div>
            <span className="text-xs font-mono font-bold text-sky-400">
              {Math.min(100, Math.round((waterData.totalMl / (waterData.targetMl || 2500)) * 100))}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/60 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/[0.06]">
            <div
              className="bg-sky-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((waterData.totalMl / (waterData.targetMl || 2500)) * 100))}%`,
              }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onAddWaterQuick(250)}
              className="flex-1 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/[0.06] transition-all cursor-pointer active:scale-95"
            >
              + 250 ml
            </button>
            <button
              type="button"
              onClick={() => onAddWaterQuick(500)}
              className="flex-1 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/[0.06] transition-all cursor-pointer active:scale-95"
            >
              + 500 ml
            </button>
          </div>
        </div>

        {/* WEIGHT & METRICS CARD */}
        <div className="bg-[#10121a]/90 border border-white/[0.08] rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Scale className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Peso & IMC
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenWeightModal}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold"
            >
              + Registrar Peso
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white font-mono">
                {profile?.weightKg ? `${profile.weightKg} kg` : 'Sem registro'}
              </span>
              {profile?.heightCm && profile?.weightKg && (
                <span className="text-xs text-slate-400 ml-2 font-mono">
                  IMC: {(profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)}
                </span>
              )}
            </div>

            {profile?.targetWeightKg && (
              <span className="text-xs font-mono font-bold text-amber-400">
                Meta: {profile.targetWeightKg} kg
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            Pesagens matinais em jejum mantêm o cálculo de IMC e sobrecarga de cargas precisos.
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => onNavigateTab('symptoms')}
              className="w-full py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/[0.06] flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              Ver Histórico & Sintomas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* QUICK CLINICAL & PHARMACEUTICAL TOOLS GRID */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 px-1">
          <Activity className="w-4 h-4 text-[#ccff00]" />
          Ferramentas Clínicas & Módulos
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tool 1: Calculadora de Peptídeos */}
          <button
            type="button"
            onClick={() => onNavigateTab('calc')}
            className="p-4 rounded-2xl bg-[#10121a]/90 hover:bg-[#141722] border border-white/[0.08] hover:border-cyan-500/40 text-left transition-all group cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 w-fit mb-3">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
              Calculadora de Peptídeos
            </div>
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
              Diluição em mcg/UI, reconstituição e seringas de insulina (modelo Cellgenic).
            </div>
          </button>

          {/* Tool 2: Exames de Sangue */}
          <button
            type="button"
            onClick={() => onNavigateTab('labs')}
            className="p-4 rounded-2xl bg-[#10121a]/90 hover:bg-[#141722] border border-white/[0.08] hover:border-purple-500/40 text-left transition-all group cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 w-fit mb-3">
              <TestTube2 className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
              Exames Laboratoriais
            </div>
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
              Testosterona, estradiol, prolactina, hemograma e marcadores hepáticos.
            </div>
          </button>

          {/* Tool 3: Guia de Rotação & Mapa Anatômico */}
          <button
            type="button"
            onClick={() => onNavigateTab('injections')}
            className="p-4 rounded-2xl bg-[#10121a]/90 hover:bg-[#141722] border border-white/[0.08] hover:border-[#ccff00]/40 text-left transition-all group cursor-pointer shadow-lg"
          >
            <div className="p-2 rounded-xl bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 w-fit mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white group-hover:text-[#ccff00] transition-colors">
              Aplicações & Rotação 3D
            </div>
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
              Mapa anatômico de locais e descanso tecidual contra fibrose.
            </div>
          </button>
        </div>
      </div>

      {/* Supplement Modal */}
      <SupplementModal
        isOpen={isSupplementModalOpen}
        onClose={() => setIsSupplementModalOpen(false)}
        supplementData={supplementData}
        onSaveData={onSaveSupplementData}
      />
    </div>
  );
};
