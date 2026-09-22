import { 
  ReminderItem, 
  readLocalReminders, 
  saveLocalReminders, 
  createReminder, 
  updateReminder, 
  deleteReminder, 
  toggleReminder,
  deduplicateReminders 
} from './reminderService';

/**
 * Deduplicate alarms by ID and normalize their structures
 */
export function deduplicateAndNormalizeAlarms(alarms: ReminderItem[]): ReminderItem[] {
  return deduplicateReminders(alarms);
}

/**
 * Read alarms from localStorage with safe fallback
 */
export function readAlarms(): ReminderItem[] {
  return readLocalReminders();
}

/**
 * Persist alarms to localStorage and notify listeners of state updates
 */
export function saveAlarms(alarms: ReminderItem[]): void {
  saveLocalReminders(alarms);
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
    if (!rawHabits) return; // Do not unlink if habits not yet loaded into localStorage

    const habitsList = JSON.parse(rawHabits);
    if (!Array.isArray(habitsList) || habitsList.length === 0) return;

    const habitIds = new Set(habitsList.map((h: any) => h.id));

    const reconciled = alarms.map((alarm) => {
      // If linked to a habit that no longer exists, unlink it
      if (alarm.linkedHabitId && !habitIds.has(alarm.linkedHabitId) && !alarm.linkedHabitId.startsWith('temp_')) {
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
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('streak_user_id') || undefined : undefined;
  createReminder(item, currentUserId);
  return readLocalReminders()[0];
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
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('streak_user_id') || undefined : undefined;
  updateReminder(id, updates, currentUserId);
  return readLocalReminders();
}

/**
 * DELETE an alarm
 */
export function deleteAlarm(id: string): ReminderItem[] {
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('streak_user_id') || undefined : undefined;
  deleteReminder(id, currentUserId);
  return readLocalReminders();
}

/**
 * TOGGLE an alarm's enabled state
 */
export function toggleAlarm(id: string): ReminderItem[] {
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('streak_user_id') || undefined : undefined;
  toggleReminder(id, currentUserId);
  return readLocalReminders();
}
