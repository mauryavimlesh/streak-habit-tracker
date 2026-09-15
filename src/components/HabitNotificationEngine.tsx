import React, { useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { getUserHabits, getHabitLogs, Habit, HabitLog } from '../lib/habitService';
import { sendSystemNotification, requestNotificationPermission } from '../lib/reminderService';
import { format, parse, isAfter, addHours, startOfDay } from 'date-fns';

export function HabitNotificationEngine() {
  const { user, profile } = useAuth();
  const userId = user?.uid || (profile?.isGuest ? 'local' : null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const checkHabits = async () => {
      try {
        const habits = await getUserHabits(userId);
        const logs = await getHabitLogs(userId);
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        // Check each habit
        for (const habit of habits) {
          if (!habit.reminderTime || habit.archived) continue;

          // e.g. "14:00"
          const targetTime = parse(habit.reminderTime, 'HH:mm', new Date());
          const twoHoursAfter = addHours(targetTime, 2);
          const now = new Date();

          // If current time is after (targetTime + 2 hours)
          if (isAfter(now, twoHoursAfter)) {
            // Check if completed today
            const logForToday = logs.find(l => l.habitId === habit.id && l.date === todayStr);
            const isCompleted = logForToday && (logForToday.status === 'completed' || logForToday.status === 'partial');

            if (!isCompleted) {
              // Ensure we only notify once per day per habit
              const notifKey = `streak_notif_${habit.id}_${todayStr}`;
              if (!localStorage.getItem(notifKey)) {
                // Request permission if not granted
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                  await requestNotificationPermission();
                }

                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  const success = await sendSystemNotification(`Habit Reminder: ${habit.name}`, {
                    body: `It's been 2 hours since your target time. Let's keep the streak alive!`
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

    // Run immediately once, then every 5 minutes
    if (!checkedRef.current) {
      checkHabits();
      checkedRef.current = true;
    }

    const intervalId = setInterval(checkHabits, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [userId]);

  return null;
}
