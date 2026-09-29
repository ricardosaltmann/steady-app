import React from 'react';
import { NavTab } from './BottomNav';
import { LineChart, Syringe, Layers, Calculator, Heart, TestTube2, Smartphone } from 'lucide-react';

interface HubSubNavProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const HubSubNav: React.FC<HubSubNavProps> = ({ currentTab, onChangeTab }) => {
  const isPharmaHub = ['chart', 'injections', 'protocols', 'calc'].includes(currentTab);
  const isHealthHub = ['symptoms', 'labs'].includes(currentTab);

  if (!isPharmaHub && !isHealthHub) return null;

  const pharmaTabs: { id: NavTab; label: string; icon: any }[] = [
    { id: 'chart', label: 'Curva Sérica', icon: LineChart },
    { id: 'injections', label: 'Aplicações & Rotação', icon: Syringe },
    { id: 'protocols', label: 'Protocolos', icon: Layers },
    { id: 'calc', label: 'Calculadora de Peptídeos', icon: Calculator },
  ];

  const healthTabs: { id: NavTab; label: string; icon: any }[] = [
    { id: 'symptoms', label: 'Sintomas & Medidas', icon: Heart },
    { id: 'labs', label: 'Exames de Sangue', icon: TestTube2 },
  ];

  const activeTabs = isPharmaHub ? pharmaTabs : healthTabs;

  return (
    <div className="w-full pb-2">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1 bg-[#12141c]/90 border border-white/[0.07] rounded-2xl backdrop-blur-xl shadow-lg">
        {activeTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#ccff00] text-black shadow-md shadow-[#ccff00]/20 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
