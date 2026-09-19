import { ReminderItem, ReminderRepeat, ReminderCategory } from './reminderService';

const LOCAL_REMINDERS_KEY = 'streak_reminders_v1';

/**
 * Deduplicate alarms by ID and normalize their structures
 */
export function deduplicateAndNormalizeAlarms(alarms: ReminderItem[]): ReminderItem[] {
  const seenIds = new Set<string>();
  const result: ReminderItem[] = [];

  for (const alarm of alarms) {
    if (!alarm || !alarm.id) continue;
    
    // Deduplicate by ID
    if (seenIds.has(alarm.id)) continue;
    seenIds.add(alarm.id);

    // Normalize structure with safe defaults
    const normalized: ReminderItem = {
      ...alarm,
      repeat: alarm.repeat || (alarm.days?.length === 7 ? 'daily' : alarm.days?.length === 5 ? 'weekdays' : 'once'),
      days: alarm.days || [],
      enabled: alarm.enabled ?? true,
      notificationEnabled: alarm.notificationEnabled ?? true,
      category: alarm.category || 'general',
      soundTone: alarm.soundTone || 'streak-pulse',
      volume: typeof alarm.volume === 'number' ? alarm.volume : 0.85,
      vibrate: alarm.vibrate ?? true,
      vibrationPattern: alarm.vibrationPattern || (alarm.vibrate === false ? 'off' : 'default'),
      snoozeEnabled: alarm.snoozeEnabled ?? true,
      snoozeMinutes: typeof alarm.snoozeMinutes === 'number' ? alarm.snoozeMinutes : 10,
      snoozeCount: typeof alarm.snoozeCount === 'number' ? alarm.snoozeCount : 0,
      createdAt: alarm.createdAt || new Date().toISOString(),
    };

    result.push(normalized);
  }

  return result;
}

/**
 * Read alarms from localStorage with safe fallback
 */
export function readAlarms(): ReminderItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_REMINDERS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return deduplicateAndNormalizeAlarms(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to parse local alarms:', err);
  }
  return [];
}

/**
 * Persist alarms to localStorage and notify listeners of state updates
 */
export function saveAlarms(alarms: ReminderItem[]): void {
  try {
    const normalized = deduplicateAndNormalizeAlarms(alarms);
    localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(normalized));
    
    // Dispatch custom event to sync with UI across tabs or React components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_reminders_updated', { detail: normalized }));
    }
  } catch (err) {
    console.error('Failed to persist local alarms:', err);
  }
}

/**
 * Reconciles the state of alarms with any referenced entities in localStorage
 * (e.g. unlinking/updating if a habit or task gets deleted)
 */
export function reconcileAlarmsState(): void {
  try {
    const alarms = readAlarms();
    let changed = false;

    // Fetch local habits
    const rawHabits = localStorage.getItem('streak_habits_v1');
    const habitsList = rawHabits ? JSON.parse(rawHabits) : [];
    const habitIds = new Set(Array.isArray(habitsList) ? habitsList.map((h: any) => h.id) : []);

    const reconciled = alarms.map((alarm) => {
      // If linked to a habit that no longer exists, unlink it
      if (alarm.linkedHabitId && !habitIds.has(alarm.linkedHabitId)) {
        changed = true;
        const { linkedHabitId, linkedEntityName, ...rest } = alarm;
        return rest as ReminderItem;
      }
      return alarm;
    });

    if (changed) {
      saveAlarms(reconciled);
      console.log('Alarms state reconciled: cleaned up orphaned habit linkages.');
    }
  } catch (err) {
    console.warn('Alarms state reconciliation warning:', err);
  }
}

/**
 * CREATE a new alarm
 */
export function createAlarm(item: Omit<ReminderItem, 'id' | 'createdAt'>): ReminderItem {
  const list = readAlarms();
  const newAlarm: ReminderItem = {
    ...item,
    id: 'alarm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
  };

  list.unshift(newAlarm);
  saveAlarms(list);
  return newAlarm;
}

/**
 * READ a single alarm by ID
 */
export function getAlarmById(id: string): ReminderItem | null {
  const list = readAlarms();
  return list.find((a) => a.id === id) || null;
}

/**
 * UPDATE an existing alarm
 */
export function updateAlarm(id: string, updates: Partial<ReminderItem>): ReminderItem[] {
  const list = readAlarms();
  const updated = list.map((a) => (a.id === id ? { ...a, ...updates } : a));
  saveAlarms(updated);
  return updated;
}

/**
 * DELETE an alarm
 */
export function deleteAlarm(id: string): ReminderItem[] {
  const list = readAlarms();
  const updated = list.filter((a) => a.id !== id);
  saveAlarms(updated);
  return updated;
}

/**
 * TOGGLE an alarm's enabled state
 */
export function toggleAlarm(id: string): ReminderItem[] {
  const list = readAlarms();
  const updated = list.map((a) => {
    if (a.id === id) {
      return { ...a, enabled: !a.enabled };
    }
    return a;
  });
  saveAlarms(updated);
  return updated;
}
