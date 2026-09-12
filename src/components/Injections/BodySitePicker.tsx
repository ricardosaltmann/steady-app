import React from 'react';
import { InjectionSite } from '../../types';
import { INJECTION_SITE_LABELS } from '../../lib/defaultCompounds';
import { CheckCircle2, RotateCw } from 'lucide-react';

interface BodySitePickerProps {
  selectedSite: InjectionSite;
  onSelectSite: (site: InjectionSite) => void;
  lastUsedSite?: InjectionSite;
}

const SITES_LIST: { id: InjectionSite; label: string; group: 'Ombros' | 'Glúteos & Quadril' | 'Coxas' | 'Subcutânea (Barriga)' }[] = [
  // Ombros
  { id: 'deltoid_left', label: 'Deltoide Esquerdo', group: 'Ombros' },
  { id: 'deltoid_right', label: 'Deltoide Direito', group: 'Ombros' },
  // Glúteos
  { id: 'ventroglute_left', label: 'Ventroglúteo Esq.', group: 'Glúteos & Quadril' },
  { id: 'ventroglute_right', label: 'Ventroglúteo Dir.', group: 'Glúteos & Quadril' },
  { id: 'glute_left', label: 'Dorsoglúteo Esq.', group: 'Glúteos & Quadril' },
  { id: 'glute_right', label: 'Dorsoglúteo Dir.', group: 'Glúteos & Quadril' },
  // Coxas
  { id: 'quad_left', label: 'Vasto Lateral Esq.', group: 'Coxas' },
  { id: 'quad_right', label: 'Vasto Lateral Dir.', group: 'Coxas' },
  // SubQ
  { id: 'abdomen_subq_left', label: 'Abdômen Esq. (SubQ)', group: 'Subcutânea (Barriga)' },
  { id: 'abdomen_subq_right', label: 'Abdômen Dir. (SubQ)', group: 'Subcutânea (Barriga)' },
  { id: 'love_handles_left', label: 'Flanco Esq.', group: 'Subcutânea (Barriga)' },
  { id: 'love_handles_right', label: 'Flanco Dir.', group: 'Subcutânea (Barriga)' },
];

export const BodySitePicker: React.FC<BodySitePickerProps> = ({
  selectedSite,
  onSelectSite,
  lastUsedSite,
}) => {
  const groups = ['Ombros', 'Glúteos & Quadril', 'Coxas', 'Subcutânea (Barriga)'] as const;

  return (
    <div className="space-y-4">
      {lastUsedSite && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-300">
          <RotateCw className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Última aplicação feita em: <strong className="text-white">{INJECTION_SITE_LABELS[lastUsedSite]?.label || lastUsedSite}</strong>. Recomenda-se alternar o local.
          </span>
        </div>
      )}

      <div className="space-y-3">
        {groups.map(group => {
          const sitesInGroup = SITES_LIST.filter(s => s.group === group);
          return (
            <div key={group} className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                {group}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {sitesInGroup.map(site => {
                  const isSelected = selectedSite === site.id;
                  const isLastUsed = lastUsedSite === site.id;

                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => onSelectSite(site.id)}
                      className={`relative flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                          : isLastUsed
                          ? 'bg-amber-950/20 border-amber-800/40 text-slate-300 hover:border-slate-600'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-1">
                        <span className="font-medium truncate">{site.label}</span>
                        {isLastUsed && (
                          <span className="text-[10px] text-amber-400 font-normal">
                            Último usado
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
