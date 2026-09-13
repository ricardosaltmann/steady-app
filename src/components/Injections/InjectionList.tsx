import React, { useState } from 'react';
import { Injection, Compound } from '../../types';
import { INJECTION_SITE_LABELS } from '../../lib/defaultCompounds';
import { formatCompoundDose } from '../../lib/doseFormatter';
import { Syringe, Trash2, Calendar, MapPin, Search, Filter } from 'lucide-react';

interface InjectionListProps {
  injections: Injection[];
  compounds: Compound[];
  onDeleteInjection: (id: string) => void;
  onOpenNewInjection: () => void;
}

export const InjectionList: React.FC<InjectionListProps> = ({
  injections,
  compounds,
  onDeleteInjection,
  onOpenNewInjection,
}) => {
  const [selectedCompoundFilter, setSelectedCompoundFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredInjections = injections.filter(inj => {
    if (selectedCompoundFilter !== 'all' && inj.compoundId !== selectedCompoundFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const comp = compounds.find(c => c.id === inj.compoundId);
      const q = searchQuery.toLowerCase();
      const matchComp = comp?.name.toLowerCase().includes(q);
      const matchSite = (INJECTION_SITE_LABELS[inj.site]?.label || '').toLowerCase().includes(q);
      const matchNotes = (inj.notes || '').toLowerCase().includes(q);
      return matchComp || matchSite || matchNotes;
    }
    return true;
  });

  const compoundMap = new Map(compounds.map(c => [c.id, c]));

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Syringe className="w-5 h-5 text-blue-400" />
            Histórico de Injeções ({filteredInjections.length})
          </h2>
          <p className="text-xs text-slate-400">
            Registro de todas as administrações e locais utilizados
          </p>
        </div>

        <button
          onClick={onOpenNewInjection}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
        >
          <Syringe className="w-4 h-4" />
          <span>Nova Injeção</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px] bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por composto, notas ou local..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white focus:outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCompoundFilter}
            onChange={e => setSelectedCompoundFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Todos os Compostos</option>
            <optgroup label="💉 Esteroides & TRT">
              {compounds.filter(c => c.category === 'steroid').map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="🧬 Peptídeos & GLP-1">
              {compounds.filter(c => c.category === 'peptide').map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="🛡️ Fertilidade & TPC">
              {compounds.filter(c => c.category === 'fertility').map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="🌸 Feminino / HRT">
              {compounds.filter(c => c.category === 'estrogen').map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Injections List Cards */}
      {filteredInjections.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center mx-auto text-blue-400">
            <Syringe className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Nenhuma aplicação encontrada</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Registre sua primeira dose ou altere os filtros de busca acima para ver suas injeções.
          </p>
          <button
            onClick={onOpenNewInjection}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition-all active:scale-95"
          >
            Registrar Primeira Dose
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredInjections.map(inj => {
            const comp = compoundMap.get(inj.compoundId);
            const siteLabel = INJECTION_SITE_LABELS[inj.site]?.label || inj.site;
            const dateObj = new Date(inj.date);
            const formattedDate = dateObj.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={inj.id}
                className="flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl transition-all shadow-sm group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5"
                    style={{
                      backgroundColor: `${comp?.color || '#3b82f6'}15`,
                      borderColor: `${comp?.color || '#3b82f6'}40`,
                      color: comp?.color || '#3b82f6',
                    }}
                  >
                    <Syringe className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white truncate">
                        {comp?.name || 'Composto'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-800/50">
                        {formatCompoundDose(inj.dose, comp?.unit).fullText}
                      </span>
                      {inj.volumeMl && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({inj.volumeMl} mL • <strong className="text-emerald-400 font-semibold">{Math.round(inj.volumeMl * 100 * 10) / 10} UI</strong>)
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300">
                        {inj.route}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        {siteLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {formattedDate} às {formattedTime}
                      </span>
                      {inj.needleInfo && (
                        <span className="text-[11px] text-slate-500">
                          Agulha: {inj.needleInfo}
                        </span>
                      )}
                    </div>

                    {inj.notes && (
                      <p className="text-xs text-slate-400 italic pt-0.5">
                        "{inj.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 pl-2 shrink-0">
                  <button
                    onClick={() => {
                      if (confirm('Deseja realmente excluir este registro de injeção?')) {
                        onDeleteInjection(inj.id);
                      }
                    }}
                    title="Excluir injeção"
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
