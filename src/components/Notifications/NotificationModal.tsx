import React, { useState, useEffect } from 'react';
import { Protocol, Compound, NotificationSettings } from '../../types';
import { Bell, Syringe, Droplets, Volume2, Check, X, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { notificationsService, isProtocolDueToday } from '../../lib/notifications';
import { formatCompoundDose } from '../../lib/doseFormatter';

interface NotificationModalProps {
  protocols: Protocol[];
  compounds: Compound[];
  settings: NotificationSettings;
  onSaveSettings: (settings: NotificationSettings) => void;
  onQuickLogDose: (protocol: Protocol) => void;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  protocols,
  compounds,
  settings,
  onSaveSettings,
  onQuickLogDose,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const activeProtocols = protocols.filter(p => p.active);
  const protocolsDueToday = activeProtocols.filter(p => isProtocolDueToday(p));

  const handleRequestPermission = async () => {
    const granted = await notificationsService.requestPermission();
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
    if (granted) {
      notificationsService.sendTestNotification(localSettings.soundEnabled);
    }
  };

  const handleToggleMedReminder = async () => {
    const next = !localSettings.medicationReminders;
    if (next && browserPermission !== 'granted') {
      await handleRequestPermission();
    }
    const updated = { ...localSettings, medicationReminders: next };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleToggleWaterReminder = async () => {
    const next = !localSettings.waterReminders;
    if (next && browserPermission !== 'granted') {
      await handleRequestPermission();
    }
    const updated = { ...localSettings, waterReminders: next };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleToggleSound = () => {
    const updated = { ...localSettings, soundEnabled: !localSettings.soundEnabled };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleTimeChange = (time: string) => {
    const updated = { ...localSettings, medicationTime: time };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleIntervalChange = (hours: number) => {
    const updated = { ...localSettings, waterIntervalHours: hours };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleTestMed = () => {
    const firstDue = protocolsDueToday[0] || activeProtocols[0];
    const comp = firstDue ? compounds.find(c => c.id === firstDue.compoundId) : null;
    notificationsService.sendMedicationReminder(
      firstDue ? firstDue.name : 'Durateston TRT',
      firstDue ? formatCompoundDose(firstDue.dose, comp?.unit).fullText : '250mg',
      localSettings.soundEnabled
    );
    setTestSent('med');
    setTimeout(() => setTestSent(null), 3000);
  };

  const handleTestWater = () => {
    notificationsService.sendWaterReminder(1500, localSettings.soundEnabled);
    setTestSent('water');
    setTimeout(() => setTestSent(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Central de Lembretes & Alertas
              </h2>
              <p className="text-xs text-slate-400">
                Notificações de doses de medicamentos e hidratação diária
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
          {/* Permission Status Banner */}
          {browserPermission !== 'granted' ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-800/60 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-bold text-white block">
                  Permitir Notificações no Navegador
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Para receber os alertas mesmo com o app em segundo plano, autorize as notificações do seu aparelho.
                </p>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="mt-2.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
                >
                  Ativar Notificações Agora
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-300">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Notificações ativas e autorizadas no seu navegador!
              </span>
              <button
                type="button"
                onClick={() => notificationsService.sendTestNotification(localSettings.soundEnabled)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
              >
                Testar
              </button>
            </div>
          )}

          {/* SECTION 1: Medication Reminders */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Syringe className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Lembretes de Medicamentos & Doses
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Avisa você quando houver uma aplicação programada para o dia
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleMedReminder}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  localSettings.medicationReminders ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {localSettings.medicationReminders && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    Horário padrão do lembrete diário:
                  </span>
                  <input
                    type="time"
                    value={localSettings.medicationTime || '08:00'}
                    onChange={e => handleTimeChange(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                {/* Doses due today preview */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Doses Programadas para Hoje ({protocolsDueToday.length})
                  </span>
                  {protocolsDueToday.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Nenhuma dose programada para o dia de hoje.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {protocolsDueToday.map(p => {
                        const comp = compounds.find(c => c.id === p.compoundId);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                          >
                            <div>
                              <span className="font-bold text-white block">{p.name}</span>
                              <span className="text-[11px] text-slate-400">
                                {formatCompoundDose(p.dose, comp?.unit).fullText} • {comp?.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onQuickLogDose(p);
                                onClose();
                              }}
                              className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Tomar Dose
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Testar aviso de aplicação:
                  </span>
                  <button
                    type="button"
                    onClick={handleTestMed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-blue-300 font-semibold transition-colors cursor-pointer"
                  >
                    {testSent === 'med' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Enviado!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>Testar Lembrete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Water Reminders */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Lembretes Periódicos de Água
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Notificações automáticas para beber água ao longo do dia
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleWaterReminder}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  localSettings.waterReminders ? 'bg-cyan-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {localSettings.waterReminders && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Frequência dos avisos:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleIntervalChange(h)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          localSettings.waterIntervalHours === h
                            ? 'bg-cyan-600 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        A cada {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Testar aviso de hidratação:
                  </span>
                  <button
                    type="button"
                    onClick={handleTestWater}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-cyan-300 font-semibold transition-colors cursor-pointer"
                  >
                    {testSent === 'water' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Enviado!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Testar Lembrete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Sounds */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Aviso Sonoro Suave
                </span>
                <span className="text-[11px] text-slate-400">
                  Toca um sino sutil sintetizado ao disparar os lembretes
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                localSettings.soundEnabled ? 'bg-purple-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
