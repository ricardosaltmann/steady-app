import React from 'react';
import { Home, Dumbbell, Activity, Scale, Plus } from 'lucide-react';

export type NavTab =
  | 'today'
  | 'gym'
  | 'chart'
  | 'injections'
  | 'protocols'
  | 'calc'
  | 'labs'
  | 'symptoms';

interface BottomNavProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  onOpenQuickAction?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  onOpenQuickAction,
}) => {
  const isPharmaActive = currentTab === 'chart' || currentTab === 'injections' || currentTab === 'protocols' || currentTab === 'calc';
  const isHealthActive = currentTab === 'symptoms' || currentTab === 'labs';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 pt-1.5 pb-2 safe-area-bottom shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {/* TAB 1: HOJE */}
        <button
          type="button"
          onClick={() => onChangeTab('today')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all flex-1 ${
            currentTab === 'today'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              currentTab === 'today' ? 'bg-cyan-500/20 ring-1 ring-cyan-500/40 scale-105' : ''
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Hoje</span>
        </button>

        {/* TAB 2: TREINOS (GYM) */}
        <button
          type="button"
          onClick={() => onChangeTab('gym')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all flex-1 ${
            currentTab === 'gym'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              currentTab === 'gym' ? 'bg-cyan-500/20 ring-1 ring-cyan-500/40 scale-105' : ''
            }`}
          >
            <Dumbbell className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Treinos</span>
        </button>

        {/* CENTER PROMINENT ACTION BUTTON */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            type="button"
            onClick={onOpenQuickAction}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-110 active:scale-95 transition-all border-2 border-slate-950 cursor-pointer"
            title="Ação Rápida (+)"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* TAB 3: FARMACOCINÉTICA & CURVA */}
        <button
          type="button"
          onClick={() => onChangeTab('chart')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all flex-1 ${
            isPharmaActive
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              isPharmaActive ? 'bg-cyan-500/20 ring-1 ring-cyan-500/40 scale-105' : ''
            }`}
          >
            <Activity className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Farmaco</span>
        </button>

        {/* TAB 4: SAÚDE & PESO */}
        <button
          type="button"
          onClick={() => onChangeTab('symptoms')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all flex-1 ${
            isHealthActive
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              isHealthActive ? 'bg-cyan-500/20 ring-1 ring-cyan-500/40 scale-105' : ''
            }`}
          >
            <Scale className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Saúde</span>
        </button>
      </div>
    </nav>
  );
};
