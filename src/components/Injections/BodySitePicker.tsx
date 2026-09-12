import React from 'react';
import { InjectionSite } from '../../types';
import { INJECTION_SITE_LABELS } from '../../lib/defaultCompounds';
import { CheckCircle2, RotateCw } from 'lucide-react';

interface BodySitePickerProps {
  selectedSite: InjectionSite;
  onSelectSite: (site: InjectionSite) => void;
  lastUsedSite?: InjectionSite;
  route?: 'IM' | 'SubQ';
}

interface SiteItem {
  id: InjectionSite;
  label: string;
  group: string;
}

const SUBQ_SITES: SiteItem[] = [
  // Abdômen (Superior, Central, Inferior)
  { id: 'abdomen_upper', label: 'Abdômen Superior', group: 'Abdômen' },
  { id: 'abdomen_center', label: 'Abdômen Central', group: 'Abdômen' },
  { id: 'abdomen_lower', label: 'Abdômen Inferior', group: 'Abdômen' },
  // Braços
  { id: 'arm_right', label: 'Braço Direito', group: 'Braços' },
  { id: 'arm_left', label: 'Braço Esquerdo', group: 'Braços' },
  // Pernas
  { id: 'leg_right', label: 'Perna Direita (Coxa)', group: 'Pernas' },
  { id: 'leg_left', label: 'Perna Esquerda (Coxa)', group: 'Pernas' },
];

const IM_SITES: SiteItem[] = [
  // Ombros
  { id: 'deltoid_right', label: 'Deltoide Direito', group: 'Ombros' },
  { id: 'deltoid_left', label: 'Deltoide Esquerdo', group: 'Ombros' },
  // Glúteos & Quadril
  { id: 'ventroglute_right', label: 'Ventroglúteo Dir.', group: 'Glúteos & Quadril' },
  { id: 'ventroglute_left', label: 'Ventroglúteo Esq.', group: 'Glúteos & Quadril' },
  { id: 'glute_right', label: 'Dorsoglúteo Dir.', group: 'Glúteos & Quadril' },
  { id: 'glute_left', label: 'Dorsoglúteo Esq.', group: 'Glúteos & Quadril' },
  // Pernas
  { id: 'quad_right', label: 'Vasto Lateral Dir.', group: 'Pernas' },
  { id: 'quad_left', label: 'Vasto Lateral Esq.', group: 'Pernas' },
];

export const BodySitePicker: React.FC<BodySitePickerProps> = ({
  selectedSite,
  onSelectSite,
  lastUsedSite,
  route = 'IM',
}) => {
  const activeSites = route === 'SubQ' ? SUBQ_SITES : IM_SITES;
  const groups = Array.from(new Set(activeSites.map(s => s.group)));

  return (
    <div className="space-y-4">
      {lastUsedSite && (
        <div className="flex items-center gap-2 p-2.5 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-300">
          <RotateCw className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Última aplicação: <strong className="text-white">{INJECTION_SITE_LABELS[lastUsedSite]?.label || lastUsedSite}</strong>. Alterne o local para melhor absorção.
          </span>
        </div>
      )}

      <div className="space-y-3">
        {groups.map(group => {
          const sitesInGroup = activeSites.filter(s => s.group === group);
          return (
            <div key={group} className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                {group}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
