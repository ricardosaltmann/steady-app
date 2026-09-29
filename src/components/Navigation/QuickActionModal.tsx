import React from 'react';
import { Syringe, Dumbbell, Droplets, Scale, Heart, X } from 'lucide-react';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'injection' | 'workout' | 'water' | 'weight' | 'symptom') => void;
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
      color: 'from-cyan-500/20 to-blue-600/20 text-cyan-400 border-cyan-500/40',
    },
    {
      id: 'workout' as const,
      label: 'Iniciar Treino',
      desc: 'Cronômetro, séries, cargas e timer de descanso',
      icon: Dumbbell,
      color: 'from-emerald-500/20 to-teal-600/20 text-emerald-400 border-emerald-500/40',
    },
    {
      id: 'water' as const,
      label: 'Registrar Consumo de Água',
      desc: 'Adicione copos e acompanhe a hidratação diária',
      icon: Droplets,
      color: 'from-blue-500/20 to-sky-600/20 text-blue-400 border-blue-500/40',
    },
    {
      id: 'weight' as const,
      label: 'Registrar Peso & Medidas',
      desc: 'Acompanhe evolução de peso, IMC e medidas corporais',
      icon: Scale,
      color: 'from-indigo-500/20 to-purple-600/20 text-indigo-400 border-indigo-500/40',
    },
    {
      id: 'symptom' as const,
      label: 'Check-in de Bem-Estar',
      desc: 'Monitore disposição, sono, libido e pressão arterial',
      icon: Heart,
      color: 'from-rose-500/20 to-pink-600/20 text-rose-400 border-rose-500/40',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-black text-white">Ação Rápida</h3>
            <p className="text-xs text-slate-400">O que você gostaria de registrar agora?</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
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
                className="w-full p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 flex items-center gap-3.5 transition-all text-left cursor-pointer group"
              >
                <div
                  className={`p-2.5 rounded-2xl bg-gradient-to-br ${act.color} border shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {act.label}
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
