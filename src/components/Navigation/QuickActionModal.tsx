import React from 'react';
import { Syringe, Dumbbell, Droplets, Scale, Heart, Calculator, TestTube2, X } from 'lucide-react';

export type QuickActionType =
  | 'injection'
  | 'workout'
  | 'calc'
  | 'lab'
  | 'water'
  | 'weight'
  | 'symptom';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: QuickActionType) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'injection' as const,
      label: 'Registrar Injeção / Dose',
      desc: 'Atualiza sua curva sérica e histórico de aplicações',
      icon: Syringe,
      badge: 'Farmaco',
      color: 'bg-emerald-500/15 text-[#ccff00] border-[#ccff00]/30',
    },
    {
      id: 'workout' as const,
      label: 'Iniciar Treino',
      desc: 'Cronômetro, séries, RPE e timer de descanso',
      icon: Dumbbell,
      badge: 'Hipertrofia',
      color: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
    },
    {
      id: 'calc' as const,
      label: 'Calculadora de Peptídeos (Diluição)',
      desc: 'Cálculo de reconstituição em mcg/UI para seringas de insulina',
      icon: Calculator,
      badge: 'Ferramenta',
      color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'lab' as const,
      label: 'Registrar Exame de Sangue',
      desc: 'Testosterona, estradiol, SHBG, prolactina e marcadores',
      icon: TestTube2,
      badge: 'Clínico',
      color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    },
    {
      id: 'water' as const,
      label: 'Registrar Água (+250ml)',
      desc: 'Adicione um copo para manter o ritmo de hidratação celular',
      icon: Droplets,
      badge: 'Diário',
      color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    },
    {
      id: 'weight' as const,
      label: 'Registrar Peso & Medidas',
      desc: 'Acompanhe evolução de peso, gordura corporal e medidas',
      icon: Scale,
      badge: 'Biometria',
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    },
    {
      id: 'symptom' as const,
      label: 'Check-in de Bem-Estar',
      desc: 'Monitore disposição, sono, libido e pressão arterial',
      icon: Heart,
      badge: 'Saúde',
      color: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1117] border border-white/[0.09] rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-slideUp max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h3 className="text-base font-black text-white tracking-wide">Ações Rápidas</h3>
            <p className="text-xs text-slate-400">Selecione o que deseja registrar ou calcular</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto pr-1 flex-1">
          {actions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  onClose();
                  onSelectAction(act.id);
                }}
                className="w-full p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.14] flex items-center gap-3 transition-all text-left cursor-pointer group"
              >
                <div
                  className={`p-2.5 rounded-xl ${act.color} border shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-sm font-bold text-white group-hover:text-[#ccff00] transition-colors truncate">
                      {act.label}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400 border border-white/[0.05] shrink-0">
                      {act.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{act.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
