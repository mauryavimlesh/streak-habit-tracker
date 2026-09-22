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
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return clean;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampmRaw = match[3] ? match[3].toUpperCase() : null;

  let ampm: 'AM' | 'PM' = 'AM';
  if (ampmRaw) {
    ampm = ampmRaw as 'AM' | 'PM';
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
  } else {
    ampm = hour >= 12 ? 'PM' : 'AM';
  }

  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  const padHour = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${padHour}:${minute} ${ampm}`;
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
  const result: ReminderItem[] = [];

  for (const r of reminders) {
    if (!r) continue;
    const stableId = r.id || `${(r.title || '').trim().toLowerCase()}_${r.time}`;
    if (seenIds.has(stableId)) continue;
    seenIds.add(stableId);
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_reminders_updated', { detail: clean }));
    }
  } catch {
    // Ignore
  }
}

export function sanitizeReminderForFirestore(
  reminder: Partial<ReminderItem>,
  userId: string,
  isCreate: boolean = false
): Record<string, any> {
  const payload: Record<string, any> = {
    userId,
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    payload.createdAt = serverTimestamp();
    payload.title = (reminder.title || 'Reminder').trim();
    payload.time = formatTimeDisplay(reminder.time || '08:00 AM');
    payload.repeat = reminder.repeat || 'daily';
    payload.enabled = reminder.enabled ?? true;
    payload.notificationEnabled = reminder.notificationEnabled ?? true;
    payload.category = reminder.category || 'general';
  } else {
    if (reminder.title !== undefined) payload.title = String(reminder.title).trim();
    if (reminder.time !== undefined) payload.time = formatTimeDisplay(reminder.time);
    if (reminder.repeat !== undefined) payload.repeat = String(reminder.repeat);
    if (reminder.enabled !== undefined) payload.enabled = Boolean(reminder.enabled);
    if (reminder.notificationEnabled !== undefined) payload.notificationEnabled = Boolean(reminder.notificationEnabled);
    if (reminder.category !== undefined) payload.category = String(reminder.category);
  }

  if (reminder.description !== undefined) {
    const desc = String(reminder.description).trim();
    if (desc) payload.description = desc;
  }

  if (reminder.date !== undefined && reminder.date) {
    payload.date = String(reminder.date).trim();
  }

  if (Array.isArray(reminder.days) && reminder.days.length > 0) {
    payload.days = reminder.days;
  }

  if (reminder.linkedHabitId) {
    payload.linkedHabitId = String(reminder.linkedHabitId);
  }

  if (reminder.linkedEntityName) {
    payload.linkedEntityName = String(reminder.linkedEntityName);
  }

  if (reminder.soundTone) {
    payload.soundTone = String(reminder.soundTone);
  }

  if (reminder.customAudioId) {
    payload.customAudioId = String(reminder.customAudioId);
  }

  if (reminder.customAudioName) {
    payload.customAudioName = String(reminder.customAudioName);
  }

  if (typeof reminder.volume === 'number' && !isNaN(reminder.volume)) {
    payload.volume = Number(reminder.volume.toFixed(2));
  }

  if (typeof reminder.vibrate === 'boolean') {
    payload.vibrate = reminder.vibrate;
  }

  if (reminder.vibrationPattern) {
    payload.vibrationPattern = String(reminder.vibrationPattern);
  }

  if (typeof reminder.snoozeEnabled === 'boolean') {
    payload.snoozeEnabled = reminder.snoozeEnabled;
  }

  if (typeof reminder.snoozeMinutes === 'number' && !isNaN(reminder.snoozeMinutes)) {
    payload.snoozeMinutes = reminder.snoozeMinutes;
  }

  if (reminder.snoozeUntil) {
    payload.snoozeUntil = String(reminder.snoozeUntil);
  }

  if (typeof reminder.snoozeCount === 'number' && !isNaN(reminder.snoozeCount)) {
    payload.snoozeCount = reminder.snoozeCount;
  }

  if (reminder.lastTriggeredAt) {
    payload.lastTriggeredAt = String(reminder.lastTriggeredAt);
  }

  return payload;
}

export function generateStableReminderId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `rem_${crypto.randomUUID()}`;
  }
  return `rem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function getUserReminders(userId: string): Promise<ReminderItem[]> {
  const local = readLocalReminders();
  if (!isCloudSyncableUser(userId)) {
    return deduplicateReminders(local);
  }

  try {
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const rawFirestoreReminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReminderItem));

    rawFirestoreReminders.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    if (rawFirestoreReminders.length > 0) {
      const clean = deduplicateReminders(rawFirestoreReminders);
      saveLocalReminders(clean);
      localStorage.setItem(REMINDERS_INITIALIZED_KEY, 'true');
      return clean;
    } else {
      if (local.length > 0) {
        await syncLocalRemindersToCloud(userId);
        return deduplicateReminders(local);
      }
      return [];
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
  return updateReminder(id, { enabled: newState }, userId);
}

export async function createReminder(
  item: Omit<ReminderItem, 'id' | 'createdAt'>,
  userId?: string
): Promise<ReminderItem> {
  const isCloud = isCloudSyncableUser(userId);
  const docRef = isCloud ? doc(collection(db, 'reminders')) : null;
  const stableId = docRef ? docRef.id : generateStableReminderId();
  const nowIso = new Date().toISOString();

  const formattedTime = formatTimeDisplay(item.time);

  const newReminder: ReminderItem = {
    ...item,
    time: formattedTime,
    id: stableId,
    userId: userId || 'local',
    createdAt: nowIso,
  };

  // Directly persist to source of truth (Firestore) first if signed in
  if (isCloud && docRef && userId) {
    try {
      const firestorePayload = sanitizeReminderForFirestore(newReminder, userId, true);
      await setDoc(docRef, firestorePayload);
    } catch (err) {
      console.error('Failed to sync reminder creation to database:', err);
      handleFirestoreError(err, OperationType.CREATE, 'reminders');
      throw err;
    }
  }

  // Only commit to local persistent mirror after source of truth confirmed
  const list = readLocalReminders();
  const existingIndex = list.findIndex(r => r.id === stableId);
  if (existingIndex !== -1) {
    list[existingIndex] = newReminder;
  } else {
    list.unshift(newReminder);
  }
  saveLocalReminders(list);
  localStorage.setItem(REMINDERS_INITIALIZED_KEY, 'true');

  trackReminderCreated(item.category, item.repeat);
  return newReminder;
}

export async function updateReminder(
  id: string,
  updates: Partial<ReminderItem>,
  userId?: string
): Promise<ReminderItem[]> {
  const list = readLocalReminders();
  const index = list.findIndex((r) => r.id === id);

  const formattedUpdates = { ...updates };
  if (updates.time) {
    formattedUpdates.time = formatTimeDisplay(updates.time);
  }

  let updatedItem: ReminderItem;
  if (index !== -1) {
    updatedItem = {
      ...list[index],
      ...formattedUpdates,
      id,
    };
  } else {
    updatedItem = {
      id,
      userId: userId || 'local',
      title: formattedUpdates.title || 'Reminder',
      time: formattedUpdates.time || '08:00 AM',
      repeat: formattedUpdates.repeat || 'daily',
      days: formattedUpdates.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      enabled: formattedUpdates.enabled ?? true,
      notificationEnabled: formattedUpdates.notificationEnabled ?? true,
      category: formattedUpdates.category || 'general',
      createdAt: new Date().toISOString(),
      ...formattedUpdates,
    };
  }

  // Directly update source of truth (Firestore) first if signed in
  if (isCloudSyncableUser(userId)) {
    try {
      const targetDocRef = doc(db, 'reminders', id);
      const firestorePayload = sanitizeReminderForFirestore(updatedItem, userId, false);
      await setDoc(targetDocRef, firestorePayload, { merge: true });
    } catch (err) {
      console.error('Failed to sync reminder update to database:', err);
      handleFirestoreError(err, OperationType.UPDATE, `reminders/${id}`);
      throw err;
    }
  }

  // Commit update to local state after confirmed by source of truth
  if (index !== -1) {
    list[index] = updatedItem;
  } else {
    list.unshift(updatedItem);
  }
  saveLocalReminders(list);
  localStorage.setItem(REMINDERS_INITIALIZED_KEY, 'true');

  return list;
}

export async function deleteReminder(id: string, userId?: string): Promise<ReminderItem[]> {
  // Directly delete from source of truth (Firestore) first if signed in
  if (isCloudSyncableUser(userId)) {
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (err) {
      console.error('Failed to sync reminder deletion to database:', err);
      handleFirestoreError(err, OperationType.DELETE, `reminders/${id}`);
      throw err;
    }
  }

  // Remove from local persistent mirror only after confirmation
  const list = readLocalReminders();
  const updated = list.filter((r) => r.id !== id);
  saveLocalReminders(updated);
  localStorage.setItem(REMINDERS_INITIALIZED_KEY, 'true');

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
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reminders = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ReminderItem[];

      reminders.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

      if (reminders.length > 0) {
        const clean = deduplicateReminders(reminders);
        saveLocalReminders(clean);
        callback(clean);
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
    const targetDocId = reminder.id || generateStableReminderId();
    reminder.id = targetDocId;
    reminder.userId = userId;
    const targetDocRef = doc(db, 'reminders', targetDocId);
    try {
      const firestorePayload = sanitizeReminderForFirestore(reminder, userId, true);
      await setDoc(targetDocRef, firestorePayload, { merge: true });
    } catch (e) {
      console.warn('syncLocalRemindersToCloud item warning:', targetDocId, e);
    }
  }
  saveLocalReminders(localReminders);
}
