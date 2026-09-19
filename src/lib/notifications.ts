import { Protocol } from '../types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

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
 * Checks current notification permission status across native Android and Web
 */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch (err) {
      console.warn('[notifications] Error checking native permissions:', err);
      return 'prompt';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  return 'prompt';
}

/**
 * Requests notification permission across native Android (POST_NOTIFICATIONS) and Web
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      if (res.display === 'granted') {
        try {
          await LocalNotifications.createChannel({
            id: 'steadysync_reminders',
            name: 'Lembretes SteadySync',
            description: 'Alertas de doses de medicamentos e hidratação',
            importance: 5,
            visibility: 1,
            vibration: true,
          });
        } catch (e) {
          console.warn('[notifications] Failed to create channel:', e);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('[notifications] Error requesting native permission:', err);
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  }

  return false;
}

/**
 * Sends a notification via native Android LocalNotifications or Web Notification API
 */
export async function sendNotification(title: string, body: string, sound: boolean = true) {
  if (sound) {
    playNotificationSound();
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000) + 1,
            title,
            body,
            channelId: 'steadysync_reminders',
            smallIcon: 'ic_launcher',
            sound: sound ? 'beep.wav' : undefined,
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('[notifications] Could not schedule local notification:', err);
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      });
    } catch (err) {
      console.warn('[notifications] Error sending browser notification:', err);
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
  checkPermissionStatus: checkNotificationPermission,
  requestPermission: requestNotificationPermission,

  sendMedicationReminder: (protocolName: string, doseText: string, sound: boolean = true) => {
    sendNotification(
      'SteadySync: Hora da sua dose 💉',
      `Protocolo: ${protocolName} (${doseText}). Não se esqueça de registrar sua aplicação!`,
      sound
    );
  },

  sendWaterReminder: (targetRemainingMl: number, sound: boolean = true) => {
    sendNotification(
      'SteadySync: Hora de se hidratar! 💧',
      `Beba um copo de água (250ml) para manter seu metabolismo e hidratação celular. Faltam ${targetRemainingMl}ml para sua meta de hoje!`,
      sound
    );
  },

  sendTestNotification: (sound: boolean = true) => {
    sendNotification(
      'SteadySync: Notificações Ativadas! ✅',
      'Seus lembretes de medicação e hidratação estão configurados com sucesso.',
      sound
    );
  },
};
