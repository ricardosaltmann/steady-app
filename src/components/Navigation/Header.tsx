import React from 'react';
import { UserAccount } from '../../types';
import { Settings, Plus, Droplets, Bell, Shield, Activity, LogOut, User } from 'lucide-react';

interface HeaderProps {
  currentUser?: UserAccount | null;
  todayWaterMl?: number;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  onOpenNewInjection: () => void;
  onOpenSettings: (initialTab?: 'compounds' | 'profile' | 'backup') => void;
  onOpenWaterModal?: () => void;
  onOpenNotificationsModal?: () => void;
  hasDueReminders?: boolean;
  isAlarmActive?: boolean;
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
  isAlarmActive = false,
}) => {
  return (
    <header 
      className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-2.5 sm:px-6 pb-2.5 shadow-lg transition-all"
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 0.5rem)'
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-1 sm:gap-2.5">
        {/* Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="font-black tracking-tight text-white text-base sm:text-lg">
                Steady<span className="text-cyan-400">Sync</span>
              </span>
              <span className="hidden sm:inline-block text-[8px] sm:text-[9px] uppercase font-extrabold tracking-widest px-1 sm:px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-400 border border-cyan-800/60">
                BIO
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 leading-none hidden md:block">
              Farmacocinética • Esteroides & Peptídeos
            </p>
          </div>
        </div>

        {/* Quick Actions, Water, Notifications & User Account */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Water Button */}
          {onOpenWaterModal && (
            <button
              onClick={onOpenWaterModal}
              className="flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-700/60 hover:border-cyan-500/90 text-cyan-300 font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Acompanhamento de Água e Hidratação"
            >
              <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline text-[10px] sm:text-[11px] font-bold">
                {todayWaterMl > 0 ? `${(todayWaterMl / 1000).toFixed(1)}L` : 'Água'}
              </span>
            </button>
          )}

          {/* Notifications Modal Button */}
          {onOpenNotificationsModal && (
            <button
              onClick={onOpenNotificationsModal}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-900 border border-slate-800/80 rounded-xl transition-colors shrink-0 relative cursor-pointer active:scale-95"
              title="Lembretes de Doses e Hidratação"
            >
              <Bell className="w-4 h-4" />
              {hasDueReminders && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950" />
                  {isAlarmActive && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950 animate-ping" />
                  )}
                </>
              )}
            </button>
          )}

          {/* Admin Panel Shortcut if user is Admin */}
          {currentUser?.isAdmin && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 hover:border-amber-500/80 text-amber-300 font-bold text-xs transition-all shrink-0 shadow-sm cursor-pointer"
              title="Abrir Painel de Gestão e Manutenção"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>
          )}

          {/* Registrar Dose Button */}
          <button
            onClick={onOpenNewInjection}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Registrar Nova Injeção"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="font-bold text-xs sm:inline">Dose</span>
          </button>

          {/* User Avatar Button (Opens Profile/Settings Modal directly) */}
          {currentUser && (
            <button
              type="button"
              onClick={() => onOpenSettings('profile')}
              className="flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-all cursor-pointer shrink-0 active:scale-95"
              title={`Conectado como ${currentUser.name} - Clique para abrir configurações`}
            >
              <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow-sm">
                {(currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-semibold text-xs max-w-[80px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>
          )}

          {/* Settings Button (Desktop shortcut) */}
          <button
            onClick={() => onOpenSettings('compounds')}
            className="hidden sm:flex p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="Configurações e Farmácia"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          {currentUser && onLogout && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja realmente sair da sua conta?')) {
                  onLogout();
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800/80 rounded-xl transition-colors shrink-0 cursor-pointer active:scale-95"
              title="Sair da conta (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
