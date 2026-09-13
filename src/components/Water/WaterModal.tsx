import React, { useState } from 'react';
import { DailyWaterData, NotificationSettings } from '../../types';
import { Droplets, Plus, Trash2, X, Bell, Check, Sparkles } from 'lucide-react';
import { notificationsService } from '../../lib/notifications';

interface WaterModalProps {
  waterData: DailyWaterData;
  notificationSettings: NotificationSettings;
  onAddWater: (amountMl: number, targetMl?: number) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateTarget: (targetMl: number) => void;
  onUpdateNotificationSettings: (settings: NotificationSettings) => void;
  onClose: () => void;
}

export const WaterModal: React.FC<WaterModalProps> = ({
  waterData,
  notificationSettings,
  onAddWater,
  onDeleteEntry,
  onUpdateTarget,
  onUpdateNotificationSettings,
  onClose,
}) => {
  const [customAmount, setCustomAmount] = useState('');
  const [targetInput, setTargetInput] = useState(String(waterData.targetMl || 2500));
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [notificationTestSent, setNotificationTestSent] = useState(false);

  const percent = Math.min(100, Math.round((waterData.totalMl / (waterData.targetMl || 2500)) * 100));
  const remainingMl = Math.max(0, (waterData.targetMl || 2500) - waterData.totalMl);

  const handleQuickAdd = (ml: number) => {
    onAddWater(ml, Number(targetInput) || 2500);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customAmount, 10);
    if (val && val > 0) {
      onAddWater(val, Number(targetInput) || 2500);
      setCustomAmount('');
    }
  };

  const handleSaveTarget = () => {
    const val = parseInt(targetInput, 10);
    if (val && val > 500) {
      onUpdateTarget(val);
      setIsEditingTarget(false);
    }
  };

  const handleToggleWaterReminder = async () => {
    const nextState = !notificationSettings.waterReminders;
    if (nextState) {
      await notificationsService.requestPermission();
    }
    onUpdateNotificationSettings({
      ...notificationSettings,
      waterReminders: nextState,
    });
  };

  const handleChangeInterval = (hours: number) => {
    onUpdateNotificationSettings({
      ...notificationSettings,
      waterIntervalHours: hours,
    });
  };

  const handleTestReminder = async () => {
    await notificationsService.requestPermission();
    notificationsService.sendWaterReminder(remainingMl, notificationSettings.soundEnabled);
    setNotificationTestSent(true);
    setTimeout(() => setNotificationTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Droplets className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Acompanhamento de Água
              </h2>
              <p className="text-xs text-slate-400">
                Hidratação metabólica, celular e suporte renal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
          {/* Main Progress Card */}
          <div className="bg-gradient-to-br from-cyan-950/50 via-slate-900 to-blue-950/40 border border-cyan-800/40 rounded-3xl p-5 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider block">
                  Consumo de Hoje
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black tracking-tight text-white">
                    {waterData.totalMl}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">
                    / {waterData.targetMl || 2500} ml
                  </span>
                </div>
                <p className="text-xs text-cyan-400/90 mt-1">
                  {remainingMl > 0 ? `Faltam ${remainingMl} ml para atingir sua meta diária` : '🎉 Meta diária atingida! Excelente hidratação.'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-cyan-400">
                  {percent}%
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingTarget(prev => !prev)}
                  className="block text-[11px] text-slate-400 hover:text-cyan-300 transition-colors mt-1 font-medium cursor-pointer"
                >
                  {isEditingTarget ? 'Fechar Edição' : 'Ajustar Meta'}
                </button>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-950/80 rounded-full h-3.5 mt-4 p-0.5 border border-cyan-800/50 overflow-hidden relative">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/50"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Target Edit Input */}
            {isEditingTarget && (
              <div className="mt-4 pt-3 border-t border-cyan-800/40 flex items-center gap-2 animate-fadeIn">
                <span className="text-xs text-slate-300">Nova meta (ml):</span>
                <input
                  type="number"
                  step="100"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white text-center focus:outline-none focus:border-cyan-500 font-bold"
                />
                <button
                  type="button"
                  onClick={handleSaveTarget}
                  className="px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            )}
          </div>

          {/* Quick Add Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              Adicionar Água Rápida
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { ml: 200, label: '200ml', sub: 'Copo P' },
                { ml: 250, label: '250ml', sub: 'Copo Std' },
                { ml: 350, label: '350ml', sub: 'Caneca' },
                { ml: 500, label: '500ml', sub: 'Garrafinha' },
                { ml: 1000, label: '1 Litro', sub: 'Garrafa G' },
              ].map(item => (
                <button
                  key={item.ml}
                  type="button"
                  onClick={() => handleQuickAdd(item.ml)}
                  className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/80 hover:bg-cyan-950/20 text-center transition-all cursor-pointer group active:scale-95"
                >
                  <span className="text-xs font-bold text-white group-hover:text-cyan-400 block">
                    +{item.label}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {item.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Add Form */}
            <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1">
              <input
                type="number"
                placeholder="Quantidade personalizada (ml)..."
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!customAmount}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                + Adicionar
              </button>
            </form>
          </div>

          {/* Water Notification Settings */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Lembretes Automáticos de Hidratação
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Notificações no navegador / celular para beber água
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleWaterReminder}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  notificationSettings.waterReminders ? 'bg-cyan-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {notificationSettings.waterReminders && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Frequência do lembrete:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map(hours => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => handleChangeInterval(hours)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          notificationSettings.waterIntervalHours === hours
                            ? 'bg-cyan-600 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        A cada {hours}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Testar som e notificação no seu aparelho:
                  </span>
                  <button
                    type="button"
                    onClick={handleTestReminder}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-cyan-300 font-semibold transition-colors cursor-pointer"
                  >
                    {notificationTestSent ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Enviado!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Testar Notificação</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Today's Water Log History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Registros de Hoje ({waterData.entries.length})
              </span>
            </div>

            {waterData.entries.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center italic">
                Nenhum copo registrado hoje ainda. Use os botões acima para começar!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {waterData.entries.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-bold text-white">+{entry.amountMl} ml</span>
                      <span className="text-slate-500 text-[11px]">às {entry.time}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(entry.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Excluir este registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
