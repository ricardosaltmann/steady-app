import React from 'react';
import { Activity, Syringe, Calendar, FileText, Calculator, Scale } from 'lucide-react';

export type NavTab = 'chart' | 'injections' | 'protocols' | 'calc' | 'labs' | 'symptoms';

interface BottomNavProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab }) => {
  const tabs = [
    { id: 'chart' as NavTab, label: 'Curva', icon: Activity },
    { id: 'injections' as NavTab, label: 'Injeções', icon: Syringe },
    { id: 'protocols' as NavTab, label: 'Protocolos', icon: Calendar },
    { id: 'calc' as NavTab, label: 'Diluição', icon: Calculator },
    { id: 'labs' as NavTab, label: 'Exames', icon: FileText },
    { id: 'symptoms' as NavTab, label: 'Saúde & Peso', icon: Scale },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-1 sm:px-2 pt-1.5 safe-area-bottom shadow-2xl">
      <div className="max-w-lg mx-auto flex items-center justify-between sm:justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 sm:px-2 rounded-2xl transition-all relative flex-1 min-w-0 ${
                isActive
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-cyan-600/20 ring-1 ring-cyan-500/40 scale-105' : ''
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight truncate w-full text-center">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
