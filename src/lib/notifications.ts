import { Protocol } from '../types';

/**
 * Plays a pleasant clinical notification chime using the Web Audio API
 */
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle melodic 2-tone chime: 587.33Hz (D5) -> 880Hz (A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (err) {
    console.warn('Could not play notification sound:', err);
  }
}

/**
 * Requests browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Sends a native browser push notification
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });
    } catch (err) {
      console.warn('Error sending Notification:', err);
    }
  }
}

/**
 * Checks if an active protocol has a scheduled dose due today
 */
export function isProtocolDueToday(protocol: Protocol): boolean {
  if (!protocol.active) return false;
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ...
  const start = new Date(protocol.startDate);
  start.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (now < start) return false;

  if (protocol.frequency === 'daily') return true;

  if (protocol.frequency === 'eod') {
    const diffDays = Math.round((now.getTime() - start.getTime()) / 86400000);
    return diffDays % 2 === 0;
  }

  if (protocol.frequency === 'every_3_5_days') {
    // Mondays and Thursdays (1 and 4)
    return todayDayOfWeek === 1 || todayDayOfWeek === 4;
  }

  if (protocol.frequency === 'weekly') {
    return todayDayOfWeek === start.getDay();
  }

  if (protocol.frequency === 'every_x_days' && protocol.intervalDays) {
    const diffDays = Math.round((now.getTime() - start.getTime()) / 86400000);
    return diffDays % protocol.intervalDays === 0;
  }

  return false;
}

/**
 * High-level notification triggers for SteadySync
 */
export const notificationsService = {
  requestPermission: requestNotificationPermission,

  sendMedicationReminder: (protocolName: string, doseText: string, sound: boolean = true) => {
    if (sound) playNotificationSound();
    sendBrowserNotification(`SteadySync: Hora da sua dose 💉`, {
      body: `Protocolo: ${protocolName} (${doseText}). Não se esqueça de registrar sua aplicação!`,
      tag: 'medication_reminder',
    });
  },

  sendWaterReminder: (targetRemainingMl: number, sound: boolean = true) => {
    if (sound) playNotificationSound();
    sendBrowserNotification(`SteadySync: Hora de se hidratar! 💧`, {
      body: `Beba um copo de água (250ml) para manter seu metabolismo e hidratação celular. Faltam ${targetRemainingMl}ml para sua meta de hoje!`,
      tag: 'water_reminder',
    });
  },

  sendTestNotification: (sound: boolean = true) => {
    if (sound) playNotificationSound();
    sendBrowserNotification(`SteadySync: Notificações Ativadas! ✅`, {
      body: `Seus lembretes de medicação e hidratação estão configurados com sucesso.`,
      tag: 'test_notification',
    });
  },
};
