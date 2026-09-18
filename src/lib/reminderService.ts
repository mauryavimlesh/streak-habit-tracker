import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { trackReminderCreated, trackReminderTriggered } from './analyticsService';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { isCloudSyncableUser } from './authUtils';
import { VibrationPatternType } from './alarmAudio';

export type ReminderRepeat = 'once' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom' | 'monthly';
export type ReminderCategory = 'habit' | 'task' | 'general' | 'morning' | 'night';

import { registerPWA } from './pwa/pwaManager';

export interface ReminderItem {
  id: string;
  userId?: string;
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
  // Alarm & Sound extensions
  soundTone?: string; // built-in tone id e.g. 'streak-pulse' | 'atomic-focus' | 'zen-bell' | 'gentle-sunrise' | 'digital-beep' | 'vibrant-marimba' | 'custom'
  customAudioId?: string; // id in local IndexedDB
  customAudioName?: string; // original filename e.g. "zen_birds.mp3"
  volume?: number; // 0.0 to 1.0 (default 0.85)
  vibrate?: boolean; // default true
  vibrationPattern?: VibrationPatternType; // 'default' | 'double-pulse' | 'long-persistent' | 'off'
  snoozeEnabled?: boolean; // default true
  snoozeMinutes?: number; // 5, 10, 15, or custom (default 10)
  snoozeUntil?: string; // ISO string if currently snoozed
  snoozeCount?: number; // tracks number of snoozes for smart adaptive intervals
}

export interface SmartSnoozeResult {
  nextMinutes: number;
  reason: string;
  snoozeCount: number;
  patternTag: string;
}

/**
 * Intelligently calculates the next snooze interval based on user interaction patterns.
 * e.g., suggesting a longer interval if the user has snoozed multiple times already.
 */
export function calculateSmartSnooze(
  baseMinutes: number = 10,
  snoozeCount: number = 0
): SmartSnoozeResult {
  if (snoozeCount === 0) {
    // First snooze: quick crisp nudge (min 5m or base)
    const nextMinutes = Math.max(5, Math.min(baseMinutes, 10));
    return {
      nextMinutes,
      reason: 'Quick buffer to prepare and begin habit',
      snoozeCount: 0,
      patternTag: 'Quick Nudge',
    };
  }

  if (snoozeCount === 1) {
    // Second snooze: standard buffer
    const nextMinutes = Math.max(10, baseMinutes);
    return {
      nextMinutes,
      reason: 'Standard focus buffer (snoozed 1x)',
      snoozeCount: 1,
      patternTag: 'Focus Buffer',
    };
  }

  if (snoozeCount === 2) {
    // Third snooze: escalating to 15m
    const nextMinutes = Math.max(15, baseMinutes + 5);
    return {
      nextMinutes,
      reason: 'Extended break (snoozed 2x already)',
      snoozeCount: 2,
      patternTag: 'Extended Window',
    };
  }

  // 3 or more snoozes: deeper restorative interval (20-30 mins)
  const nextMinutes = Math.min(30, 20 + (snoozeCount - 3) * 5);
  return {
    nextMinutes,
    reason: `Adaptive recovery (${snoozeCount}x snoozed, auto-extended)`,
    snoozeCount,
    patternTag: 'Smart Recovery',
  };
}

/**
 * Normalizes time string to 12-hour format e.g. "07:30 AM"
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '08:00 AM';
  const clean = timeStr.trim();
  if (/am|pm/i.test(clean)) {
    return clean.toUpperCase();
  }
  const parts = clean.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parts[1].slice(0, 2);
    if (isNaN(hour)) return clean;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const padHour = hour < 10 ? `0${hour}` : `${hour}`;
    return `${padHour}:${minute} ${ampm}`;
  }
  return clean;
}

/**
 * Converts 12h/24h time to 24h "HH:MM" for <input type="time">
 */
export function toInputTimeValue(timeStr: string): string {
  if (!timeStr) return '08:00';
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return clean.slice(0, 5);

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm) {
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  }
  const padHour = hour < 10 ? `0${hour}` : `${hour}`;
  return `${padHour}:${minute}`;
}

/**
 * Parses time string to 24-hour hour & minute numbers
 */
export function parseHourMinute(timeStr: string): { hour: number; minute: number } {
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return { hour: 8, minute: 0 };

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10) || 0;
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm) {
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  }
  return { hour, minute };
}

/**
 * Checks if a reminder should trigger at a given Date
 */
export function shouldReminderTriggerNow(reminder: ReminderItem, now: Date): boolean {
  if (!reminder.enabled) return false;

  // If snoozed, check if snooze window has arrived
  if (reminder.snoozeUntil) {
    const snoozeDate = new Date(reminder.snoozeUntil);
    if (!isNaN(snoozeDate.getTime()) && now.getTime() >= snoozeDate.getTime()) {
      return true;
    }
    // If still in future snooze, do not fire regular schedule yet
    if (!isNaN(snoozeDate.getTime()) && now.getTime() < snoozeDate.getTime()) {
      return false;
    }
  }

  // Check matching hour & minute
  const { hour, minute } = parseHourMinute(reminder.time);
  if (now.getHours() !== hour || now.getMinutes() !== minute) {
    return false;
  }

  // Day abbreviation: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDayName = dayNames[now.getDay()];
  const isWeekend = currentDayName === 'Sat' || currentDayName === 'Sun';

  switch (reminder.repeat) {
    case 'once': {
      if (reminder.date) {
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return reminder.date === todayStr;
      }
      return true;
    }
    case 'daily':
      return true;
    case 'weekdays':
      return !isWeekend;
    case 'weekends':
      return isWeekend;
    case 'weekly':
    case 'custom': {
      if (Array.isArray(reminder.days) && reminder.days.length > 0) {
        return reminder.days.includes(currentDayName);
      }
      return true;
    }
    case 'monthly': {
      return reminder.date ? new Date(reminder.date).getDate() === now.getDate() : now.getDate() === 1;
    }
    default:
      return true;
  }
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

const REMINDERS_INITIALIZED_KEY = 'streak_reminders_initialized';

export function deduplicateReminders(reminders: ReminderItem[]): ReminderItem[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: ReminderItem[] = [];

  for (const r of reminders) {
    if (!r || !r.title) continue;
    const key = `${(r.title || '').trim().toLowerCase()}_${r.time}`;
    if (r.id && seenIds.has(r.id)) continue;
    if (seenKeys.has(key)) continue;

    if (r.id) seenIds.add(r.id);
    seenKeys.add(key);
    result.push(r);
  }

  return result;
}

export function readLocalReminders(): ReminderItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_REMINDERS_KEY);
    if (raw !== null) {
      const parsed: ReminderItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return deduplicateReminders(parsed.map((item) => ({
          ...item,
          repeat: item.repeat || (item.days?.length === 7 ? 'daily' : item.days?.length === 5 ? 'weekdays' : 'custom'),
          notificationEnabled: item.notificationEnabled ?? true,
          soundTone: item.soundTone || 'streak-pulse',
          volume: typeof item.volume === 'number' ? item.volume : 0.85,
          vibrate: item.vibrate ?? true,
          vibrationPattern: item.vibrationPattern || (item.vibrate === false ? 'off' : 'default'),
          snoozeEnabled: item.snoozeEnabled ?? true,
          snoozeMinutes: typeof item.snoozeMinutes === 'number' ? item.snoozeMinutes : 10,
          snoozeCount: typeof item.snoozeCount === 'number' ? item.snoozeCount : 0,
        })));
      }
    }

    const isInit = localStorage.getItem(REMINDERS_INITIALIZED_KEY);
    if (isInit) {
      return [];
    }

    saveLocalReminders(DEFAULT_REMINDERS);
    localStorage.setItem(REMINDERS_INITIALIZED_KEY, 'true');
    return deduplicateReminders(DEFAULT_REMINDERS);
  } catch {
    return deduplicateReminders(DEFAULT_REMINDERS);
  }
}

/**
 * Returns all active or configured reminders linked to a specific habit.
 */
export function getRemindersForHabit(habitId: string): ReminderItem[] {
  if (!habitId) return [];
  const list = readLocalReminders();
  return list.filter((r) => r.linkedHabitId === habitId);
}

const SNOOZE_HISTORY_KEY = 'streak_snooze_interaction_history';

export function recordSnoozeInteraction(id: string, minutes: number): void {
  try {
    const raw = localStorage.getItem(SNOOZE_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : {};
    const count = (history[id]?.count || 0) + 1;
    history[id] = {
      count,
      lastMinutes: minutes,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(SNOOZE_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to record snooze interaction:', e);
  }
}

export function getSnoozeHistoryCount(id: string): number {
  try {
    const raw = localStorage.getItem(SNOOZE_HISTORY_KEY);
    if (!raw) return 0;
    const history = JSON.parse(raw);
    return history[id]?.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Snoozes a reminder for a given number of minutes and updates its snooze count.
 */
export async function snoozeReminder(
  id: string,
  minutes: number = 10,
  userId?: string,
  currentCount?: number
): Promise<ReminderItem[]> {
  const snoozeDate = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  recordSnoozeInteraction(id, minutes);
  const nextCount = typeof currentCount === 'number' ? currentCount + 1 : getSnoozeHistoryCount(id);

  return updateReminder(
    id, 
    { 
      snoozeUntil: snoozeDate,
      snoozeCount: nextCount,
    }, 
    userId
  );
}

/**
 * Dismisses an active reminder alarm and clears its snooze & snooze count.
 */
export async function dismissReminderAlarm(
  id: string,
  userId?: string
): Promise<ReminderItem[]> {
  const nowIso = new Date().toISOString();
  return updateReminder(
    id,
    {
      lastTriggeredAt: nowIso,
      snoozeUntil: undefined,
      snoozeCount: 0,
    },
    userId
  );
}

export function saveLocalReminders(reminders: ReminderItem[]): void {
  try {
    const clean = deduplicateReminders(reminders);
    localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(clean));
  } catch {
    // Ignore
  }
}

export async function getUserReminders(userId: string): Promise<ReminderItem[]> {
  const local = readLocalReminders();
  if (!isCloudSyncableUser(userId)) {
    return deduplicateReminders(local);
  }

  try {
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const rawFirestoreReminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReminderItem));

    // Deduplicate in Firestore
    const seenKeys = new Map<string, string>();
    const duplicateDocIdsToDelete: string[] = [];
    const firestoreReminders: ReminderItem[] = [];

    for (const r of rawFirestoreReminders) {
      const key = `${(r.title || '').trim().toLowerCase()}_${r.time}`;
      if (seenKeys.has(key)) {
        if (r.id) duplicateDocIdsToDelete.push(r.id);
      } else {
        if (r.id) seenKeys.set(key, r.id);
        firestoreReminders.push(r);
      }
    }

    if (duplicateDocIdsToDelete.length > 0) {
      duplicateDocIdsToDelete.forEach(async (id) => {
        try {
          await deleteDoc(doc(db, 'reminders', id));
        } catch {
          // ignore
        }
      });
    }

    if (firestoreReminders.length > 0) {
      const clean = deduplicateReminders(firestoreReminders);
      saveLocalReminders(clean);
      localStorage.setItem(REMINDERS_INITIALIZED_KEY, 'true');
      return clean;
    } else {
      const isInit = localStorage.getItem(REMINDERS_INITIALIZED_KEY);
      if (isInit) {
        saveLocalReminders([]);
        return [];
      }
      return deduplicateReminders(local);
    }
  } catch (err) {
    console.error('Error fetching reminders from Firestore:', err);
    return deduplicateReminders(local);
  }
}

export async function toggleReminder(id: string, userId?: string): Promise<ReminderItem[]> {
  const list = readLocalReminders();
  const reminder = list.find((r) => r.id === id);
  if (!reminder) return list;
  
  const newState = !reminder.enabled;
  const updated = list.map((r) => (r.id === id ? { ...r, enabled: newState } : r));
  saveLocalReminders(updated);
  
  if (isCloudSyncableUser(userId) && !id.startsWith('temp_rem_')) {
    try {
      const ref = doc(db, 'reminders', id);
      await updateDoc(ref, { enabled: newState });
    } catch (err) {
      console.error('Failed to sync reminder toggle:', err);
    }
  }
  
  return updated;
}

export async function createReminder(
  item: Omit<ReminderItem, 'id' | 'createdAt'>,
  userId?: string
): Promise<ReminderItem> {
  const list = readLocalReminders();
  let newId = 'temp_rem_' + Date.now();
  let serverTime = new Date().toISOString();

  if (isCloudSyncableUser(userId)) {
    try {
      const docRef = await addDoc(collection(db, 'reminders'), {
        ...item,
        userId,
        createdAt: serverTimestamp()
      });
      newId = docRef.id;
    } catch (err) {
      console.error('Failed to sync reminder creation:', err);
      handleFirestoreError(err, OperationType.CREATE, 'reminders');
    }
  }

  const newReminder: ReminderItem = {
    ...item,
    id: newId,
    userId,
    createdAt: serverTime,
  };
  
  list.unshift(newReminder);
  saveLocalReminders(list);
  trackReminderCreated(item.category, item.repeat);
  return newReminder;
}

export async function updateReminder(
  id: string,
  updates: Partial<ReminderItem>,
  userId?: string
): Promise<ReminderItem[]> {
  const list = readLocalReminders();
  const updated = list.map((r) => (r.id === id ? { ...r, ...updates } : r));
  saveLocalReminders(updated);
  
  if (isCloudSyncableUser(userId) && !id.startsWith('temp_rem_')) {
    try {
      const ref = doc(db, 'reminders', id);
      await updateDoc(ref, updates);
    } catch (err) {
      console.error('Failed to sync reminder update:', err);
      handleFirestoreError(err, OperationType.UPDATE, `reminders/${id}`);
    }
  }
  return updated;
}

export async function deleteReminder(id: string, userId?: string): Promise<ReminderItem[]> {
  const list = readLocalReminders();
  const updated = list.filter((r) => r.id !== id);
  saveLocalReminders(updated);
  
  if (isCloudSyncableUser(userId)) {
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (err) {
      console.error('Failed to sync reminder deletion:', err);
      handleFirestoreError(err, OperationType.DELETE, `reminders/${id}`);
    }
  }
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
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg && reg.showNotification) {
          const swOptions = {
            body: options?.body || 'Stay consistent with your daily goals on STREAK.',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: options?.tag || 'streak-reminder',
            requireInteraction: true,
            actions: [
              { action: 'snooze', title: 'Snooze' },
              { action: 'dismiss', title: 'Dismiss' }
            ],
            ...options,
          };
          await reg.showNotification(title, swOptions as any);
          trackReminderTriggered();
          return true;
        }
      }
      
      new Notification(title, {
        body: options?.body || 'Stay consistent with your daily goals on STREAK.',
        icon: '/favicon.ico',
        ...options,
      });
      trackReminderTriggered();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Registers STREAK PWA service worker for background reminder notifications.
 */
export async function registerStreakServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  return await registerPWA();
}

export function subscribeToReminders(
  userId: string | undefined,
  callback: (reminders: ReminderItem[]) => void
): () => void {
  if (!isCloudSyncableUser(userId)) {
    callback(readLocalReminders());
    return () => {};
  }

  const q = query(
    collection(db, 'reminders'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reminders = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ReminderItem[];

      if (reminders.length > 0) {
        saveLocalReminders(reminders);
        callback(reminders);
      } else {
        callback(readLocalReminders());
      }
    },
    (err) => {
      console.warn('subscribeToReminders error fallback to local:', err);
      callback(readLocalReminders());
    }
  );
}

export async function syncLocalRemindersToCloud(userId: string) {
  if (!isCloudSyncableUser(userId)) return;
  const localReminders = readLocalReminders();
  for (const reminder of localReminders) {
    if (!reminder.userId || reminder.userId === 'local' || reminder.userId !== userId) {
      reminder.userId = userId;
      const targetDocId = reminder.id || 'rem_' + Date.now();
      const targetDocRef = doc(db, 'reminders', targetDocId);
      try {
        const snap = await getDoc(targetDocRef);
        const reminderPayload: Record<string, any> = {
          userId,
          title: reminder.title,
          time: reminder.time,
          repeat: reminder.repeat,
          enabled: Boolean(reminder.enabled),
          notificationEnabled: Boolean(reminder.notificationEnabled),
          category: reminder.category || 'General',
          updatedAt: serverTimestamp(),
        };
        if (reminder.description) reminderPayload.description = reminder.description;
        if (reminder.date) reminderPayload.date = reminder.date;
        if (Array.isArray(reminder.days)) reminderPayload.days = reminder.days;
        if (reminder.linkedHabitId) reminderPayload.linkedHabitId = reminder.linkedHabitId;
        if (reminder.linkedEntityName) reminderPayload.linkedEntityName = reminder.linkedEntityName;
        if (reminder.lastTriggeredAt) reminderPayload.lastTriggeredAt = reminder.lastTriggeredAt;
        if (reminder.soundTone) reminderPayload.soundTone = reminder.soundTone;
        if (reminder.customAudioId) reminderPayload.customAudioId = reminder.customAudioId;
        if (reminder.customAudioName) reminderPayload.customAudioName = reminder.customAudioName;
        if (typeof reminder.volume === 'number') reminderPayload.volume = reminder.volume;
        if (typeof reminder.vibrate === 'boolean') reminderPayload.vibrate = reminder.vibrate;
        if (typeof reminder.snoozeEnabled === 'boolean') reminderPayload.snoozeEnabled = reminder.snoozeEnabled;
        if (typeof reminder.snoozeMinutes === 'number') reminderPayload.snoozeMinutes = reminder.snoozeMinutes;
        if (reminder.snoozeUntil) reminderPayload.snoozeUntil = reminder.snoozeUntil;

        if (!snap.exists()) {
          reminderPayload.createdAt = serverTimestamp();
          await setDoc(targetDocRef, reminderPayload);
        } else {
          await updateDoc(targetDocRef, reminderPayload);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `reminders/${targetDocId}`);
      }
    }
  }
}
