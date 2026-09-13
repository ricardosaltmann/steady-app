import React from 'react';
import { Injection } from '../../types';
import { INJECTION_SITE_LABELS } from '../../lib/defaultCompounds';
import { RotateCw, MapPin, Sparkles } from 'lucide-react';

interface BodySiteRotationCardProps {
  injections: Injection[];
  onSelectSiteToInject?: (site: string) => void;
}

const OPPOSITE_SITES: Record<string, string> = {
  deltoid_right: 'deltoid_left',
  deltoid_left: 'deltoid_right',
  ventroglute_right: 'ventroglute_left',
  ventroglute_left: 'ventroglute_right',
  glute_right: 'glute_left',
  glute_left: 'glute_right',
  quad_right: 'quad_left',
  quad_left: 'quad_right',
  abdomen_subq_right: 'abdomen_subq_left',
  abdomen_subq_left: 'abdomen_subq_right',
  love_handles_right: 'love_handles_left',
  love_handles_left: 'love_handles_right',
  arm_right: 'arm_left',
  arm_left: 'arm_right',
  leg_right: 'leg_left',
  leg_left: 'leg_right',
  abdomen_upper: 'abdomen_lower',
  abdomen_lower: 'abdomen_upper',
  abdomen_center: 'abdomen_subq_right',
};

export const BodySiteRotationCard: React.FC<BodySiteRotationCardProps> = ({
  injections,
}) => {
  // Sort injections by date descending (most recent first)
  const sortedInjections = [...injections].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const lastUsedSiteKey = sortedInjections[0]?.site;
  const lastUsedSiteLabel = lastUsedSiteKey 
    ? INJECTION_SITE_LABELS[lastUsedSiteKey]?.label || lastUsedSiteKey 
    : null;

  // Determine suggested next site
  let suggestedSiteKey = lastUsedSiteKey ? OPPOSITE_SITES[lastUsedSiteKey] : null;
  let suggestedSiteName = suggestedSiteKey 
    ? INJECTION_SITE_LABELS[suggestedSiteKey]?.label 
    : null;

  // Intelligent fallback if key not directly in OPPOSITE_SITES
  if (!suggestedSiteName && lastUsedSiteLabel) {
    if (lastUsedSiteLabel.includes('Direito')) {
      suggestedSiteName = lastUsedSiteLabel.replace('Direito', 'Esquerdo');
    } else if (lastUsedSiteLabel.includes('Direita')) {
      suggestedSiteName = lastUsedSiteLabel.replace('Direita', 'Esquerda');
    } else if (lastUsedSiteLabel.includes('Esquerdo')) {
      suggestedSiteName = lastUsedSiteLabel.replace('Esquerdo', 'Direito');
    } else if (lastUsedSiteLabel.includes('Esquerda')) {
      suggestedSiteName = lastUsedSiteLabel.replace('Esquerda', 'Direita');
    } else {
      suggestedSiteName = 'Abdômen Esquerdo';
    }
  }

  if (!suggestedSiteName) {
    suggestedSiteName = 'Ventroglúteo Direito ou Abdômen';
  }

  const rationaleText = lastUsedSiteLabel
    ? 'Alternância bilateral para descanso do tecido e absorção ideal.'
    : 'Inicie pelo ventroglúteo ou abdômen para maior conforto e absorção suave.';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Guia de Rotação de Locais
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Prevenção de fibrose</span>
      </div>

      {/* Top box: Último local utilizado */}
      <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Último Local Utilizado
          </span>
          <div className="text-sm font-bold text-white">
            {lastUsedSiteLabel || 'Nenhum registro ainda'}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-semibold text-emerald-400">
            Recomendação
          </span>
          <div className="text-xs font-medium text-slate-300">
            Alternar para o lado oposto
          </div>
        </div>
      </div>

      {/* Bottom box: Sugestão do Local da Próxima Aplicação */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-950/80 to-cyan-950/30 border border-emerald-500/30 rounded-2xl space-y-1.5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Sugestão da Próxima Aplicação
          </span>
          <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 shrink-0">
            Recomendado
          </span>
        </div>

        <div className="text-base font-extrabold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{suggestedSiteName}</span>
        </div>

        <p className="text-[11px] text-slate-400 leading-tight">
          {rationaleText}
        </p>
      </div>
    </div>
  );
};
