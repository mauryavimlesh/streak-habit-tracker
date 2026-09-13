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

export type ReminderRepeat = 'once' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom' | 'monthly';
export type ReminderCategory = 'habit' | 'task' | 'general' | 'morning' | 'night';

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
  if (!userId || userId === 'local' || userId === 'default') {
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
  
  if (userId && userId !== 'local' && userId !== 'default' && !id.startsWith('temp_rem_')) {
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

  if (userId && userId !== 'local' && userId !== 'default') {
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
  
  if (userId && userId !== 'local' && userId !== 'default' && !id.startsWith('temp_rem_')) {
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
  
  if (userId && userId !== 'local' && userId !== 'default') {
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
      trackReminderTriggered();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function subscribeToReminders(
  userId: string | undefined,
  callback: (reminders: ReminderItem[]) => void
): () => void {
  if (!userId || userId === 'local' || userId === 'default') {
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
  if (!userId || userId === 'local' || userId === 'default') return;
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
