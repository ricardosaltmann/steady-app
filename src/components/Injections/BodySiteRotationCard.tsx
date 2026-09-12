import React from 'react';
import { Injection } from '../../types';
import { INJECTION_SITE_LABELS } from '../../lib/defaultCompounds';
import { RotateCw, CheckCircle2, ShieldAlert } from 'lucide-react';

interface BodySiteRotationCardProps {
  injections: Injection[];
  onSelectSiteToInject?: (site: string) => void;
}

export const BodySiteRotationCard: React.FC<BodySiteRotationCardProps> = ({
  injections,
}) => {
  // Get last 4 injections with sites
  const recentInjections = injections.slice(0, 4);
  const lastUsedSite = recentInjections[0]?.site;

  // Compute site frequencies
  const siteUsageCounts: Record<string, number> = {};
  injections.forEach(inj => {
    siteUsageCounts[inj.site] = (siteUsageCounts[inj.site] || 0) + 1;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Guia de Rotação de Locais
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Prevenção de fibrose</span>
      </div>

      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Último Local Utilizado
          </span>
          <div className="text-sm font-bold text-white">
            {lastUsedSite ? INJECTION_SITE_LABELS[lastUsedSite]?.label || lastUsedSite : 'Nenhum registro ainda'}
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

      {recentInjections.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-medium text-slate-400 block px-1">
            Sequência recente de rotação:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {recentInjections.map((inj, idx) => {
              const label = INJECTION_SITE_LABELS[inj.site]?.label || inj.site;
              const dateStr = new Date(inj.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

              return (
                <div
                  key={inj.id}
                  className="bg-slate-950/50 border border-slate-800 rounded-xl p-2 text-xs space-y-0.5"
                >
                  <div className="text-[10px] text-slate-500 font-mono">
                    #{idx + 1} ({dateStr})
                  </div>
                  <div className="font-semibold text-slate-200 truncate" title={label}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
