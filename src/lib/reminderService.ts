export type ReminderRepeat = 'once' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom' | 'monthly';
export type ReminderCategory = 'habit' | 'task' | 'general' | 'morning' | 'night';

export interface ReminderItem {
  id: string;
  title: string;
  description?: string;
  date?: string; // YYYY-MM-DD (for 'once' or specific date)
  time: string; // e.g. "07:30 AM" or "14:00"
  repeat: ReminderRepeat;
  days: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  enabled: boolean;
  notificationEnabled: boolean;
  category: ReminderCategory;
  linkedHabitId?: string;
  linkedEntityName?: string;
  createdAt: string;
  lastTriggeredAt?: string;
}

const LOCAL_REMINDERS_KEY = 'streak_reminders_v1';

const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: 'rem-1',
    title: 'Morning Routine & Movement',
    description: 'Get hydrated, review today’s 3 primary tasks, and stretch',
    time: '07:00 AM',
    repeat: 'weekdays',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    enabled: true,
    notificationEnabled: true,
    category: 'morning',
    linkedEntityName: 'Morning Workout',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rem-2',
    title: 'Hydration Mid-Day Check',
    description: 'Target 1.5L before afternoon deep work sprint',
    time: '01:00 PM',
    repeat: 'daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    enabled: true,
    notificationEnabled: true,
    category: 'habit',
    linkedEntityName: 'Drink Water',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rem-3',
    title: 'Evening Reflection & Journal',
    description: 'Log wins, note lessons, and prepare tomorrow’s schedule',
    time: '09:30 PM',
    repeat: 'daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    enabled: true,
    notificationEnabled: true,
    category: 'night',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rem-4',
    title: 'Wind Down & Screen Off',
    description: '30 minutes tech-free buffer before sleeping',
    time: '10:30 PM',
    repeat: 'daily',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    enabled: false,
    notificationEnabled: true,
    category: 'habit',
    linkedEntityName: 'Sleep 8 Hours',
    createdAt: new Date().toISOString(),
  },
];

export function readLocalReminders(): ReminderItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_REMINDERS_KEY);
    if (!raw) {
      saveLocalReminders(DEFAULT_REMINDERS);
      return DEFAULT_REMINDERS;
    }
    const parsed: ReminderItem[] = JSON.parse(raw);
    // Ensure all items have repeat & notificationEnabled fields
    return parsed.map((item) => ({
      ...item,
      repeat: item.repeat || (item.days?.length === 7 ? 'daily' : item.days?.length === 5 ? 'weekdays' : 'custom'),
      notificationEnabled: item.notificationEnabled ?? true,
    }));
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export function saveLocalReminders(reminders: ReminderItem[]): void {
  try {
    localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(reminders));
  } catch {
    // Ignore
  }
}

export function toggleReminder(id: string): ReminderItem[] {
  const list = readLocalReminders();
  const updated = list.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
  saveLocalReminders(updated);
  return updated;
}

export function createReminder(
  item: Omit<ReminderItem, 'id' | 'createdAt'>
): ReminderItem {
  const newReminder: ReminderItem = {
    ...item,
    id: 'rem_' + Date.now(),
    createdAt: new Date().toISOString(),
  };
  const list = readLocalReminders();
  list.unshift(newReminder);
  saveLocalReminders(list);
  return newReminder;
}

export function updateReminder(
  id: string,
  updates: Partial<ReminderItem>
): ReminderItem[] {
  const list = readLocalReminders();
  const updated = list.map((r) => (r.id === id ? { ...r, ...updates } : r));
  saveLocalReminders(updated);
  return updated;
}

export function deleteReminder(id: string): ReminderItem[] {
  const list = readLocalReminders();
  const updated = list.filter((r) => r.id !== id);
  saveLocalReminders(updated);
  return updated;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }
  return 'denied';
}

export async function sendSystemNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        if (reg?.showNotification) {
          await reg.showNotification(title, {
            body: options?.body || 'Stay consistent with your daily goals on STREAK.',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options,
          });
          return true;
        }
      }
      new Notification(title, {
        body: options?.body || 'Stay consistent with your daily goals on STREAK.',
        icon: '/favicon.ico',
        ...options,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

