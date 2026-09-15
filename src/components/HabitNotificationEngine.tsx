import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { getUserHabits, getHabitLogs } from '../lib/habitService';
import {
  readLocalReminders,
  shouldReminderTriggerNow,
  sendSystemNotification,
  requestNotificationPermission,
  registerStreakServiceWorker,
  dismissReminderAlarm,
  snoozeReminder,
  ReminderItem,
} from '../lib/reminderService';
import {
  startAlarmSound,
  stopAlarmSound,
  BUILT_IN_TONES,
} from '../lib/alarmAudio';
import { getCustomAudioBlob } from '../lib/customAudioStorage';
import { AlarmScreenModal } from './AlarmScreenModal';
import { format, parse, isAfter, addHours } from 'date-fns';

export function HabitNotificationEngine() {
  const { user, profile } = useAuth();
  const userId = user?.uid || (profile?.isGuest ? 'local' : null);

  const [activeAlarm, setActiveAlarm] = useState<ReminderItem | null>(null);
  const [toneDisplayName, setToneDisplayName] = useState<string>('STREAK Pulse');

  const triggeredMinuteRef = useRef<Set<string>>(new Set());
  const habitsCheckedRef = useRef(false);

  // 1. Register Service Worker on mount
  useEffect(() => {
    registerStreakServiceWorker();

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'STREAK_ALARM_DISMISS') {
        stopAlarmSound();
        if (activeAlarm) {
          dismissReminderAlarm(activeAlarm.id, userId || undefined);
        }
        setActiveAlarm(null);
      } else if (event.data.type === 'STREAK_ALARM_SNOOZE') {
        stopAlarmSound();
        const mins = event.data.minutes || 10;
        if (activeAlarm) {
          snoozeReminder(activeAlarm.id, mins, userId || undefined);
        }
        setActiveAlarm(null);
      }
    };

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [activeAlarm, userId]);

  // 2. Trigger alarm function
  const triggerAlarm = useCallback(async (reminder: ReminderItem) => {
    try {
      // Determine tone name for display
      let toneLabel = 'STREAK Pulse';
      let customBlob: Blob | null = null;

      if (reminder.soundTone === 'custom' && reminder.customAudioId) {
        toneLabel = reminder.customAudioName || 'Custom Device Tone';
        customBlob = await getCustomAudioBlob(reminder.customAudioId);
      } else {
        const found = BUILT_IN_TONES.find((t) => t.id === reminder.soundTone);
        if (found) toneLabel = found.name;
      }

      setToneDisplayName(toneLabel);
      setActiveAlarm(reminder);

      // Start sound & vibration
      const vol = typeof reminder.volume === 'number' ? reminder.volume : 0.85;
      const vib = reminder.vibrate ?? true;
      const pattern = reminder.vibrationPattern || (vib ? 'default' : 'off');
      await startAlarmSound(reminder.soundTone || 'streak-pulse', customBlob, vol, vib, pattern);

      // Trigger system notification
      sendSystemNotification(reminder.title, {
        body: reminder.description || `${reminder.linkedEntityName || 'STREAK'} reminder at ${reminder.time}`,
        tag: `streak-alarm-${reminder.id}`,
      });
    } catch (err) {
      console.error('Failed to trigger reminder alarm:', err);
    }
  }, []);

  // 3. Listen for manual "Test Alarm" event dispatched from Reminders UI
  useEffect(() => {
    const handleTestAlarmEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ReminderItem>;
      if (customEvent.detail) {
        triggerAlarm(customEvent.detail);
      }
    };

    window.addEventListener('STREAK_TRIGGER_TEST_ALARM', handleTestAlarmEvent);
    return () => {
      window.removeEventListener('STREAK_TRIGGER_TEST_ALARM', handleTestAlarmEvent);
    };
  }, [triggerAlarm]);

  // 4. Polling loop for active alarms (every 10 seconds)
  useEffect(() => {
    const checkScheduledReminders = async () => {
      try {
        const now = new Date();
        const minuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}:${now.getMinutes()}`;

        // Periodically purge old minutes from memory
        if (triggeredMinuteRef.current.size > 100) {
          triggeredMinuteRef.current.clear();
        }

        const reminders = readLocalReminders();
        for (const reminder of reminders) {
          if (!reminder.enabled) continue;

          const triggerKey = `${reminder.id}_${minuteKey}`;
          if (triggeredMinuteRef.current.has(triggerKey)) {
            continue;
          }

          if (shouldReminderTriggerNow(reminder, now)) {
            triggeredMinuteRef.current.add(triggerKey);
            triggerAlarm(reminder);
            break; // Trigger one alarm modal at a time
          }
        }
      } catch (err) {
        console.error('Error during scheduled reminder check:', err);
      }
    };

    const reminderInterval = setInterval(checkScheduledReminders, 10000);
    // Initial check
    checkScheduledReminders();

    return () => clearInterval(reminderInterval);
  }, [triggerAlarm]);

  // 5. Existing 2-hour overdue habit notification check
  useEffect(() => {
    if (!userId) return;

    const checkHabits = async () => {
      try {
        const habits = await getUserHabits(userId);
        const logs = await getHabitLogs(userId);
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        for (const habit of habits) {
          if (!habit.reminderTime || habit.archived) continue;

          const targetTime = parse(habit.reminderTime, 'HH:mm', new Date());
          const twoHoursAfter = addHours(targetTime, 2);
          const now = new Date();

          if (isAfter(now, twoHoursAfter)) {
            const logForToday = logs.find((l) => l.habitId === habit.id && l.date === todayStr);
            const isCompleted = logForToday && (logForToday.status === 'completed' || logForToday.status === 'partial');

            if (!isCompleted) {
              const notifKey = `streak_notif_${habit.id}_${todayStr}`;
              if (!localStorage.getItem(notifKey)) {
                if (
                  typeof window !== 'undefined' &&
                  'Notification' in window &&
                  Notification.permission !== 'granted' &&
                  Notification.permission !== 'denied'
                ) {
                  await requestNotificationPermission();
                }

                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  const success = await sendSystemNotification(`Habit Reminder: ${habit.name}`, {
                    body: `It's been 2 hours since your target time. Let's keep the streak alive!`,
                  });
                  if (success) {
                    localStorage.setItem(notifKey, 'true');
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking habit notifications:', err);
      }
    };

    if (!habitsCheckedRef.current) {
      checkHabits();
      habitsCheckedRef.current = true;
    }

    const intervalId = setInterval(checkHabits, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [userId]);

  // Handlers for Alarm Screen Modal
  const handleDismiss = async () => {
    stopAlarmSound();
    if (activeAlarm) {
      await dismissReminderAlarm(activeAlarm.id, userId || undefined);
    }
    setActiveAlarm(null);
  };

  const handleSnooze = async (minutes: number) => {
    stopAlarmSound();
    if (activeAlarm) {
      await snoozeReminder(activeAlarm.id, minutes, userId || undefined);
    }
    setActiveAlarm(null);
  };

  return (
    <AlarmScreenModal
      activeAlarm={activeAlarm}
      toneName={toneDisplayName}
      onDismiss={handleDismiss}
      onSnooze={handleSnooze}
    />
  );
}
