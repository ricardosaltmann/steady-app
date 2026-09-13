import React from 'react';
import { UserAccount } from '../../types';
import { Settings, Plus, Droplets, Bell, Shield, Activity, LogOut, User } from 'lucide-react';

interface HeaderProps {
  currentUser?: UserAccount | null;
  todayWaterMl?: number;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  onOpenNewInjection: () => void;
  onOpenSettings: () => void;
  onOpenWaterModal?: () => void;
  onOpenNotificationsModal?: () => void;
  hasDueReminders?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  todayWaterMl = 0,
  onLogout,
  onOpenAdmin,
  onOpenNewInjection,
  onOpenSettings,
  onOpenWaterModal,
  onOpenNotificationsModal,
  hasDueReminders = false,
}) => {
  return (
    <header 
      className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 pb-2.5 shadow-lg transition-all"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.625rem)'
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2.5">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-tight text-white text-lg">
                Steady<span className="text-cyan-400">Sync</span>
              </span>
              <span className="text-[9px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-400 border border-cyan-800/60">
                BIO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none hidden xs:block">
              Farmacocinética • Esteroides & Peptídeos
            </p>
          </div>
        </div>

        {/* Quick Actions, Water, Notifications & User Account */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Water Button */}
          {onOpenWaterModal && (
            <button
              onClick={onOpenWaterModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-700/60 hover:border-cyan-500/90 text-cyan-300 font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Acompanhamento de Água e Hidratação"
            >
              <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
              <span className="text-[11px] font-bold">
                {todayWaterMl > 0 ? `${(todayWaterMl / 1000).toFixed(1)}L` : 'Água'}
              </span>
            </button>
          )}

          {/* Notifications Modal Button */}
          {onOpenNotificationsModal && (
            <button
              onClick={onOpenNotificationsModal}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-900 border border-slate-800/80 rounded-xl transition-colors shrink-0 relative cursor-pointer"
              title="Lembretes de Doses e Hidratação"
            >
              <Bell className="w-4 h-4" />
              {hasDueReminders && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950 animate-ping" />
              )}
            </button>
          )}

          {/* Admin Panel Shortcut if user is Admin */}
          {currentUser?.isAdmin && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 hover:border-amber-500/80 text-amber-300 font-bold text-xs transition-all shrink-0 shadow-sm cursor-pointer"
              title="Abrir Painel de Gestão e Manutenção"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>
          )}

          {/* Registrar Dose Button */}
          <button
            onClick={onOpenNewInjection}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Registrar Nova Injeção"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Registrar Dose</span>
            <span className="sm:hidden font-bold">Dose</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="Configurações e Farmácia"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Logged in User Pill & Logout */}
          {currentUser && (
            <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-slate-800">
              <div 
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-[130px] truncate"
                title={`Conectado como: ${currentUser.name} (${currentUser.email})`}
              >
                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate font-medium">{currentUser.name.split(' ')[0]}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800/80 rounded-xl transition-colors shrink-0 cursor-pointer"
                  title="Sair da conta / Trocar de usuário"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
