import React, { useState } from 'react';
import { Compound, CompoundCategory, UserAccount } from '../../types';
import { CATEGORY_LABELS } from '../../lib/defaultCompounds';
import { Settings, Plus, Layers, Sparkles, Syringe, Heart, Shield, Activity, SlidersHorizontal, LogOut, User } from 'lucide-react';

interface HeaderProps {
  compounds: Compound[];
  selectedCompoundId: string;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  onSelectCompound: (id: string) => void;
  onOpenNewInjection: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  compounds,
  selectedCompoundId,
  currentUser,
  onLogout,
  onOpenAdmin,
  onSelectCompound,
  onOpenNewInjection,
  onOpenSettings,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | CompoundCategory>('all');

  // Only consider compounds where enabled !== false
  const activeCompounds = compounds.filter(c => c.enabled !== false);
  const compoundsToDisplay = activeCompounds.length > 0 ? activeCompounds : compounds;

  const hasSteroids = compoundsToDisplay.some(c => c.category === 'steroid');
  const hasPeptides = compoundsToDisplay.some(c => c.category === 'peptide');
  const hasFertility = compoundsToDisplay.some(c => c.category === 'fertility');
  const hasEstrogen = compoundsToDisplay.some(c => c.category === 'estrogen');

  const effectiveFilter = 
    (categoryFilter === 'steroid' && !hasSteroids) ||
    (categoryFilter === 'peptide' && !hasPeptides) ||
    (categoryFilter === 'fertility' && !hasFertility) ||
    (categoryFilter === 'estrogen' && !hasEstrogen)
      ? 'all'
      : categoryFilter;

  // Filter compounds shown in the switcher
  const filteredCompounds = compoundsToDisplay.filter(c => {
    if (effectiveFilter === 'all') return true;
    return c.category === effectiveFilter;
  });

  const selectedCompound = compounds.find(c => c.id === selectedCompoundId);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
        {/* Top Row: Brand, User Profile, Quick Actions & Settings */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-tight text-white text-lg">Steady</span>
                <span className="text-[9px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-400 border border-blue-800/60">
                  BIO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none">Farmacocinética • Esteroides & Peptídeos</p>
            </div>
          </div>

          {/* Quick Actions & User Account */}
          <div className="flex items-center gap-2">
            {/* Admin Panel Shortcut if user is Admin */}
            {currentUser?.isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 hover:border-amber-500/80 text-amber-300 font-bold text-xs transition-all shrink-0 shadow-sm"
                title="Abrir Painel de Gestão e Manutenção"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Painel Admin</span>
              </button>
            )}

            <button
              onClick={onOpenNewInjection}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95 shrink-0"
              title="Registrar Nova Injeção"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Dose</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 rounded-xl transition-colors shrink-0"
              title="Configurações e Farmácia"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logged in User Pill & Logout */}
            {currentUser && (
              <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                <div 
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-[140px] truncate"
                  title={`Conectado como: ${currentUser.name} (${currentUser.email})`}
                >
                  <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate font-medium">{currentUser.name.split(' ')[0]}</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800/80 rounded-xl transition-colors shrink-0"
                    title="Sair da conta / Trocar de usuário"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Category Filter Tabs & Compound Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                effectiveFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({compoundsToDisplay.length})
            </button>

            {hasSteroids && (
              <button
                onClick={() => setCategoryFilter('steroid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                  effectiveFilter === 'steroid'
                    ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500/50'
                    : 'text-slate-400 hover:text-blue-300'
                }`}
              >
                <Syringe className="w-3 h-3 text-blue-400" />
                Esteroides & TRT
              </button>
            )}

            {hasPeptides && (
              <button
                onClick={() => setCategoryFilter('peptide')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                  effectiveFilter === 'peptide'
                    ? 'bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Peptídeos & GLP-1
              </button>
            )}

            {hasFertility && (
              <button
                onClick={() => setCategoryFilter('fertility')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                  effectiveFilter === 'fertility'
                    ? 'bg-amber-600/30 text-amber-300 ring-1 ring-amber-500/50'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <Shield className="w-3 h-3 text-amber-400" />
                Fertilidade & TPC
              </button>
            )}

            {hasEstrogen && (
              <button
                onClick={() => setCategoryFilter('estrogen')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                  effectiveFilter === 'estrogen'
                    ? 'bg-pink-600/30 text-pink-300 ring-1 ring-pink-500/50'
                    : 'text-slate-400 hover:text-pink-300'
                }`}
              >
                <Heart className="w-3 h-3 text-pink-400" />
                Feminino
              </button>
            )}
          </div>

          {/* Active Compound Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 ml-auto shrink-0">
            <span 
              className="w-2 h-2 rounded-full shrink-0" 
              style={{ backgroundColor: selectedCompound?.color || '#3b82f6' }}
            />
            <select
              value={selectedCompoundId}
              onChange={e => onSelectCompound(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
            >
              {filteredCompounds.length === 0 && (
                <option value={selectedCompoundId} className="bg-slate-900 text-white">
                  {selectedCompound?.name}
                </option>
              )}
              {filteredCompounds.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name} {c.subcategory ? `(${c.subcategory})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={onOpenSettings}
              title="Personalizar lista de compostos ativos"
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors ml-0.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
