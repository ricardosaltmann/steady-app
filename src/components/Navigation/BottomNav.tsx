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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all relative ${
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-blue-600/20 ring-1 ring-blue-500/40 scale-110' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
