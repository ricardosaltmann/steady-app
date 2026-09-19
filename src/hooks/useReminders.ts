import { useEffect } from 'react';
import { Protocol, Compound, DailyWaterData, NotificationSettings } from '../types';
import { notificationsService, isProtocolDueToday } from '../lib/notifications';
import { formatCompoundDose } from '../lib/doseFormatter';
import { getLocalDateKey, getLocalTimeKey } from '../lib/dateUtils';
import { storage } from '../lib/storage';

interface UseRemindersProps {
  userId?: string;
  protocols: Protocol[];
  compounds: Compound[];
  waterData: DailyWaterData;
  notificationSettings: NotificationSettings;
  setNotificationSettings: (settings: NotificationSettings) => void;
}

export function useReminders({
  userId,
  protocols,
  compounds,
  waterData,
  notificationSettings,
  setNotificationSettings,
}: UseRemindersProps) {
  useEffect(() => {
    if (!userId) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHourMinute = getLocalTimeKey(now);
      const todayStr = getLocalDateKey(now);

      // 1. Medication reminder check
      if (notificationSettings.medicationReminders) {
        const activeProtos = protocols.filter(p => p.active);
        const due = activeProtos.filter(p => isProtocolDueToday(p));

        if (due.length > 0 && notificationSettings.lastMedReminderDate !== todayStr) {
          if (currentHourMinute >= (notificationSettings.medicationTime || '08:00')) {
            const first = due[0];
            const comp = compounds.find(c => c.id === first.compoundId);
            const compDoseStr = formatCompoundDose(first.dose, comp?.unit).fullText;
            notificationsService.sendMedicationReminder(
              first.name,
              compDoseStr,
              notificationSettings.soundEnabled
            );
            const updated = { ...notificationSettings, lastMedReminderDate: todayStr };
            setNotificationSettings(updated);
            storage.saveNotificationSettings(updated, userId);
          }
        }
      }

      // 2. Water reminder check
      if (notificationSettings.waterReminders) {
        const lastTimestamp = notificationSettings.lastWaterReminderTimestamp || 0;
        const intervalMs = (notificationSettings.waterIntervalHours || 2) * 3600000;
        if (Date.now() - lastTimestamp >= intervalMs) {
          const remaining = Math.max(0, (waterData.targetMl || 2500) - waterData.totalMl);
          if (remaining > 0) {
            notificationsService.sendWaterReminder(remaining, notificationSettings.soundEnabled);
          }
          const updated = { ...notificationSettings, lastWaterReminderTimestamp: Date.now() };
          setNotificationSettings(updated);
          storage.saveNotificationSettings(updated, userId);
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [userId, protocols, compounds, waterData, notificationSettings, setNotificationSettings]);
}
