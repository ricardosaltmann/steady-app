import React, { useState, useMemo } from 'react';
import { Compound, CompoundCategory } from '../../types';
import { CATEGORY_LABELS } from '../../lib/defaultCompounds';
import { Search, Syringe, Sparkles, Shield, Heart, Plus, Check, SlidersHorizontal, Info } from 'lucide-react';

interface CompoundManagerProps {
  compounds: Compound[];
  onToggleCompound: (id: string, enabled: boolean) => void;
  onToggleAllInCategory: (category: CompoundCategory | 'all', enable: boolean) => void;
  onOpenAddCustom: () => void;
}

export const CompoundManager: React.FC<CompoundManagerProps> = ({
  compounds,
  onToggleCompound,
  onToggleAllInCategory,
  onOpenAddCustom,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CompoundCategory>('all');

  // Filtered compounds by category and search
  const filteredCompounds = useMemo(() => {
    return compounds.filter(c => {
      if (selectedCategory !== 'all' && c.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSub = (c.subcategory || '').toLowerCase().includes(q);
        const matchDesc = (c.description || '').toLowerCase().includes(q);
        return matchName || matchSub || matchDesc;
      }
      return true;
    });
  }, [compounds, selectedCategory, searchQuery]);

  // Counts of enabled compounds per category
  const counts = useMemo(() => {
    const totalEnabled = compounds.filter(c => c.enabled !== false).length;
    const steroidEnabled = compounds.filter(c => c.category === 'steroid' && c.enabled !== false).length;
    const steroidTotal = compounds.filter(c => c.category === 'steroid').length;
    const peptideEnabled = compounds.filter(c => c.category === 'peptide' && c.enabled !== false).length;
    const peptideTotal = compounds.filter(c => c.category === 'peptide').length;
    const fertilityEnabled = compounds.filter(c => c.category === 'fertility' && c.enabled !== false).length;
    const fertilityTotal = compounds.filter(c => c.category === 'fertility').length;
    const estrogenEnabled = compounds.filter(c => c.category === 'estrogen' && c.enabled !== false).length;
    const estrogenTotal = compounds.filter(c => c.category === 'estrogen').length;

    return {
      total: { enabled: totalEnabled, total: compounds.length },
      steroid: { enabled: steroidEnabled, total: steroidTotal },
      peptide: { enabled: peptideEnabled, total: peptideTotal },
      fertility: { enabled: fertilityEnabled, total: fertilityTotal },
      estrogen: { enabled: estrogenEnabled, total: estrogenTotal },
    };
  }, [compounds]);

  return (
    <div className="space-y-4">
      {/* Intro Box */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-slate-300">
        <SlidersHorizontal className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">
            Personalize sua Farmácia & Compostos Ativos
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Ative apenas os compostos que você utiliza ou quer acompanhar. Os compostos desativados ficarão ocultos nos seletores de aplicação e gráficos diários para manter sua interface limpa e focada.
          </p>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar composto por nome, éster ou tipo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-white focus:outline-none placeholder:text-slate-500"
          />
        </div>

        <button
          onClick={onOpenAddCustom}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Customizado</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Todos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
            {counts.total.enabled}/{counts.total.total}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('steroid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            selectedCategory === 'steroid'
              ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500/50'
              : 'text-slate-400 hover:text-blue-300'
          }`}
        >
          <Syringe className="w-3.5 h-3.5 text-blue-400" />
          <span>Esteroides & TRT</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 border border-blue-800/50">
            {counts.steroid.enabled}/{counts.steroid.total}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('peptide')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            selectedCategory === 'peptide'
              ? 'bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-500/50'
              : 'text-slate-400 hover:text-emerald-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Peptídeos & GLP-1</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50">
            {counts.peptide.enabled}/{counts.peptide.total}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('fertility')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            selectedCategory === 'fertility'
              ? 'bg-amber-600/30 text-amber-300 ring-1 ring-amber-500/50'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Fertilidade & TPC</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-800/50">
            {counts.fertility.enabled}/{counts.fertility.total}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('estrogen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            selectedCategory === 'estrogen'
              ? 'bg-pink-600/30 text-pink-300 ring-1 ring-pink-500/50'
              : 'text-slate-400 hover:text-pink-300'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-pink-400" />
          <span>Feminino</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-pink-950 text-pink-300 border border-pink-800/50">
            {counts.estrogen.enabled}/{counts.estrogen.total}
          </span>
        </button>
      </div>

      {/* Batch Actions Bar */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>Exibindo {filteredCompounds.length} compostos</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleAllInCategory(selectedCategory, true)}
            className="hover:text-blue-400 transition-colors"
          >
            Ativar Todos
          </button>
          <span>•</span>
          <button
            onClick={() => onToggleAllInCategory(selectedCategory, false)}
            className="hover:text-slate-200 transition-colors"
          >
            Desativar Todos
          </button>
        </div>
      </div>

      {/* Compounds List Cards with Toggle Switches */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {filteredCompounds.map(comp => {
          const isEnabled = comp.enabled !== false;

          return (
            <div
              key={comp.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                isEnabled
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800/40 opacity-50 hover:opacity-75'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 pr-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-1 ring-2 ring-white/10"
                  style={{ backgroundColor: comp.color }}
                />

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white truncate">
                      {comp.name}
                    </span>
                    {comp.subcategory && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {comp.subcategory}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      Meia-vida: {comp.halfLifeDays}d • Pico: {comp.peakHours}h
                    </span>
                  </div>

                  {comp.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {comp.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => onToggleCompound(comp.id, !isEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
