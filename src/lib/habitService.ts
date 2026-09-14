import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { 
  trackHabitCreated, 
  trackHabitCompleted, 
  trackHabitDeleted,
  trackHabitEdited,
  trackHabitUncompleted
} from './analyticsService';
import { handleFirestoreError, OperationType } from './firestoreErrors';

export type HabitFrequency = 'daily' | 'selected_days' | 'weekly' | 'custom';
export type TargetType = 'binary' | 'count' | 'duration' | 'quantity';

export interface HabitLog {
  id?: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'skipped' | 'failed' | 'in_progress' | 'partial' | 'missed';
  progressValue?: number;
  note?: string;
  reflection?: string;
  completedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface Habit {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  category: string;
  icon: string;
  color: string;
  frequencyType: HabitFrequency;
  frequencyValue: string[];
  targetType: TargetType;
  targetValue: number;
  targetUnit?: string;
  reminderTime?: string;
  sleepBedtime?: string;
  sleepWakeTime?: string;
  archived?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const LOCAL_HABITS_KEY = 'streak_habits_v1';
const LOCAL_LOGS_KEY = 'streak_habit_logs_v1';
const GUEST_DATA_KEY = 'streak_guest_data';

// Deduplicate habits by ID and by name (case-insensitive)
export function deduplicateHabits(habits: Habit[]): Habit[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const result: Habit[] = [];

  for (const habit of habits) {
    if (!habit || !habit.name) continue;
    const nameKey = habit.name.trim().toLowerCase();

    if (habit.id && seenIds.has(habit.id)) {
      continue;
    }
    if (seenNames.has(nameKey)) {
      continue;
    }

    if (habit.id) seenIds.add(habit.id);
    seenNames.add(nameKey);
    result.push(habit);
  }

  return result;
}

function updateGuestNamespaceField(field: 'habits' | 'habitLogs', value: any) {
  try {
    const raw = localStorage.getItem(GUEST_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed[field] = value;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore
  }
}

export function readLocalHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(LOCAL_HABITS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return deduplicateHabits(parsed);
      }
    }
    
    // Check inside streak_guest_data namespace
    const guestRaw = localStorage.getItem(GUEST_DATA_KEY);
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed.habits) && parsed.habits.length > 0) {
        const clean = deduplicateHabits(parsed.habits);
        saveLocalHabits(clean);
        return clean;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveLocalHabits(habits: Habit[]): void {
  try {
    const clean = deduplicateHabits(habits);
    localStorage.setItem(LOCAL_HABITS_KEY, JSON.stringify(clean));
    updateGuestNamespaceField('habits', clean);
  } catch {
    // Ignore storage quota
  }
}

export function readLocalLogs(): HabitLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    if (raw) return JSON.parse(raw);

    const guestRaw = localStorage.getItem(GUEST_DATA_KEY);
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed.habitLogs) && parsed.habitLogs.length > 0) {
        return parsed.habitLogs;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveLocalLogs(logs: HabitLog[]): void {
  try {
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
    updateGuestNamespaceField('habitLogs', logs);
  } catch {
    // Ignore
  }
}

// Habit CRUD
export const createHabit = async (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
  const trimmedName = (habitData.name || '').trim();
  if (!trimmedName) {
    throw new Error('Habit title is required.');
  }

  // Prevent duplicate creation if an identical habit name already exists
  const existingHabits = readLocalHabits();
  const duplicate = existingHabits.find(
    (h) => h.name && h.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate && duplicate.id) {
    return duplicate.id;
  }

  const tempId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? `habit_${crypto.randomUUID()}` 
    : `habit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`;

  const newHabit: Habit = {
    ...habitData,
    name: trimmedName,
    id: tempId,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Immediately store in local cache
  const local = readLocalHabits();
  local.unshift(newHabit);
  saveLocalHabits(local);

  if (habitData.userId && habitData.userId !== 'local' && habitData.userId !== 'default') {
    try {
      const docRef = await addDoc(collection(db, 'habits'), {
        ...habitData,
        name: trimmedName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      newHabit.id = docRef.id;
      const updatedLocal = readLocalHabits().map((h) => (h.id === tempId ? newHabit : h));
      saveLocalHabits(updatedLocal);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'habits');
    }
  }

  trackHabitCreated(habitData.category, habitData.frequencyType);
  return tempId;
};

export const getUserHabits = async (userId: string): Promise<Habit[]> => {
  const local = readLocalHabits();
  
  if (!userId || userId === 'local' || userId === 'default') {
    return deduplicateHabits(local);
  }

  try {
    const q = query(
      collection(db, 'habits'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const rawFirestoreHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));

    // Deduplicate by habit name (case-insensitive)
    const seenNames = new Map<string, string>(); // nameKey -> primaryDocId
    const duplicateDocIdsToDelete: string[] = [];
    const firestoreHabits: Habit[] = [];

    for (const h of rawFirestoreHabits) {
      if (!h || !h.name) continue;
      const nameKey = h.name.trim().toLowerCase();
      if (seenNames.has(nameKey)) {
        if (h.id) duplicateDocIdsToDelete.push(h.id);
      } else {
        if (h.id) seenNames.set(nameKey, h.id);
        firestoreHabits.push(h);
      }
    }

    if (duplicateDocIdsToDelete.length > 0) {
      duplicateDocIdsToDelete.forEach(async (id) => {
        try {
          await deleteDoc(doc(db, 'habits', id));
        } catch {
          // ignore background cleanup error
        }
      });
    }

    if (firestoreHabits.length > 0) {
      // Clean, single-source-of-truth habits from Firestore
      const clean = deduplicateHabits(firestoreHabits);
      saveLocalHabits(clean);
      localStorage.setItem(`streak_habits_initialized_${userId}`, 'true');
      return clean;
    } else {
      const isInitialized = localStorage.getItem(`streak_habits_initialized_${userId}`);
      if (isInitialized) {
        saveLocalHabits([]);
        return [];
      }
      return deduplicateHabits(local);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'habits');
    return deduplicateHabits(local);
  }
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
  const local = readLocalHabits();
  const index = local.findIndex(h => h.id === habitId);
  if (index !== -1) {
    local[index] = { ...local[index], ...updates, updatedAt: new Date().toISOString() };
    saveLocalHabits(local);
  }

  if (!habitId.startsWith('temp_habit_') && !habitId.startsWith('default-')) {
    try {
      const habitRef = doc(db, 'habits', habitId);
      await updateDoc(habitRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `habits/${habitId}`);
    }
  }
  
  if (updates.name || updates.category || updates.frequencyType) {
    trackHabitEdited(updates.category);
  }
};

export const deleteHabit = async (habitId: string, userId?: string) => {
  const local = readLocalHabits();
  const filtered = local.filter(h => h.id !== habitId);
  saveLocalHabits(filtered);

  // Clean up local logs associated with this habit
  const localLogs = readLocalLogs();
  const filteredLogs = localLogs.filter(l => l.habitId !== habitId);
  saveLocalLogs(filteredLogs);

  if (!habitId.startsWith('temp_habit_') && !habitId.startsWith('default-')) {
    try {
      await deleteDoc(doc(db, 'habits', habitId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `habits/${habitId}`);
    }
  }

  // Also asynchronously clean up Firestore habit_logs for this habit
  if (userId && userId !== 'local' && userId !== 'default') {
    try {
      const q = query(
        collection(db, 'habit_logs'),
        where('userId', '==', userId),
        where('habitId', '==', habitId)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(async (d) => {
        try {
          await deleteDoc(doc(db, 'habit_logs', d.id));
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }

  trackHabitDeleted();
};

// Habit Logs CRUD
export const logHabit = async (logData: Omit<HabitLog, 'id' | 'createdAt' | 'updatedAt'>) => {
  // Update local logs immediately
  const localLogs = readLocalLogs();
  const existingIdx = localLogs.findIndex(
    l => l.habitId === logData.habitId && l.date === logData.date
  );

  const updatedLog: HabitLog = {
    ...logData,
    id: existingIdx !== -1 ? localLogs[existingIdx].id : 'log_' + Date.now(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    localLogs[existingIdx] = updatedLog;
  } else {
    localLogs.unshift(updatedLog);
  }
  saveLocalLogs(localLogs);

  if (logData.status === 'completed') {
    const habits = readLocalHabits();
    const habit = habits.find((h) => h.id === logData.habitId);
    trackHabitCompleted(habit?.category);
  } else if (existingIdx !== -1 && localLogs[existingIdx].status === 'completed') {
    const habits = readLocalHabits();
    const habit = habits.find((h) => h.id === logData.habitId);
    trackHabitUncompleted(habit?.category);
  }

  if (logData.userId && logData.userId !== 'local' && logData.userId !== 'default') {
    try {
      const q = query(
        collection(db, 'habit_logs'),
        where('userId', '==', logData.userId),
        where('habitId', '==', logData.habitId),
        where('date', '==', logData.date)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'habit_logs', existingDoc.id), {
          status: logData.status,
          progressValue: logData.progressValue,
          updatedAt: serverTimestamp()
        });
        return existingDoc.id;
      }

      const docRef = await addDoc(collection(db, 'habit_logs'), {
        ...logData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'habit_logs');
    }
  }

  return updatedLog.id;
};

export const seedDefaultHabits = async (userId: string): Promise<Habit[]> => {
  if (!userId || userId === 'local' || userId === 'default') return [];

  // 1. Guard check: has this user already seeded or initialized habits?
  const seededFlag = localStorage.getItem(`streak_habits_seeded_${userId}`);
  if (seededFlag) {
    return [];
  }

  // 2. Check Firestore: if habits exist already in Firestore, do NOT seed duplicates!
  try {
    const q = query(collection(db, 'habits'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      localStorage.setItem(`streak_habits_seeded_${userId}`, 'true');
      localStorage.setItem(`streak_habits_initialized_${userId}`, 'true');
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
    }
  } catch {
    // continue
  }

  const defaults: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      userId,
      name: 'Workout',
      category: 'fitness',
      icon: 'dumbbell',
      color: 'lime',
      frequencyType: 'daily',
      frequencyValue: [],
      targetType: 'duration',
      targetValue: 30,
      targetUnit: 'min',
      reminderTime: '08:00',
    },
    {
      userId,
      name: 'Drink Water',
      category: 'health',
      icon: 'droplets',
      color: 'cyan',
      frequencyType: 'daily',
      frequencyValue: [],
      targetType: 'count',
      targetValue: 8,
      targetUnit: 'glasses',
      reminderTime: '10:00',
    },
    {
      userId,
      name: 'Sleep 8 Hours',
      category: 'health',
      icon: 'moon',
      color: 'violet',
      frequencyType: 'daily',
      frequencyValue: [],
      targetType: 'count',
      targetValue: 8,
      targetUnit: 'hours',
      reminderTime: '22:30',
    },
  ];

  try {
    const created: Habit[] = [];
    for (const habit of defaults) {
      const docRef = await addDoc(collection(db, 'habits'), {
        ...habit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created.push({ id: docRef.id, ...habit });
    }
    localStorage.setItem(`streak_habits_seeded_${userId}`, 'true');
    localStorage.setItem(`streak_habits_initialized_${userId}`, 'true');
    saveLocalHabits(created);
    return created;
  } catch (error) {
    console.error('Failed to seed default habits:', error);
    return [];
  }
};

export const getHabitLogs = async (userId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> => {
  const local = readLocalLogs();
  if (!userId || userId === 'local' || userId === 'default') {
    let logs = local;
    if (startDate) logs = logs.filter(l => l.date >= startDate);
    if (endDate) logs = logs.filter(l => l.date <= endDate);
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }
  try {
    const q = query(
      collection(db, 'habit_logs'),
      where('userId', '==', userId)
    );
    
    // In-memory date filtering avoids missing composite index runtime errors in Firestore
    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog));
    
    if (startDate) {
      logs = logs.filter(l => l.date >= startDate);
    }
    if (endDate) {
      logs = logs.filter(l => l.date <= endDate);
    }
    
    // Merge local logs
    const map = new Map<string, HabitLog>();
    logs.forEach(l => map.set(l.id || (l.habitId + '_' + l.date), l));
    local.forEach(l => {
      const key = l.id || (l.habitId + '_' + l.date);
      if (!map.has(key)) {
        if ((!startDate || l.date >= startDate) && (!endDate || l.date <= endDate)) {
          map.set(key, l);
        }
      }
    });
    const merged = Array.from(map.values());
    saveLocalLogs(merged);
    
    return merged.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'habit_logs');
    return [];
  }
};

// Streak Engine
export { calculateStreakStats } from './streakEngine';

export interface JournalLog {
  id?: string;
  userId: string;
  date: string;
  text: string;
  createdAt?: any;
  updatedAt?: any;
}

// Journal CRUD
export const logReflection = async (logData: Omit<JournalLog, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    let reflectionId = '';
    const q = query(
      collection(db, 'journal_logs'),
      where('userId', '==', logData.userId),
      where('date', '==', logData.date)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'journal_logs', existingDoc.id), {
        text: logData.text,
        updatedAt: serverTimestamp()
      });
      reflectionId = existingDoc.id;
    } else {
      const docRef = await addDoc(collection(db, 'journal_logs'), {
        ...logData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      reflectionId = docRef.id;
    }

    // Append / sync the reflection note to the user's daily habit logs for today
    try {
      const habitLogsQ = query(
        collection(db, 'habit_logs'),
        where('userId', '==', logData.userId),
        where('date', '==', logData.date)
      );
      const habitSnap = await getDocs(habitLogsQ);
      for (const logItem of habitSnap.docs) {
        await updateDoc(doc(db, 'habit_logs', logItem.id), {
          reflection: logData.text,
          updatedAt: serverTimestamp()
        });
      }
    } catch (syncErr) {
      console.warn('Could not append reflection to daily habit_logs:', syncErr);
    }

    return reflectionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'journal_logs');
  }
};

export const getReflection = async (userId: string, date: string): Promise<JournalLog | null> => {
  try {
    const q = query(
      collection(db, 'journal_logs'),
      where('userId', '==', userId),
      where('date', '==', date)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as JournalLog;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'journal_logs');
    return null;
  }
};

export const syncLocalToCloud = async (userId: string) => {
  if (!userId || userId === 'local' || userId === 'default') return;
  const localHabits = readLocalHabits();
  let syncedHabits = 0;
  for (const habit of localHabits) {
    if (!habit.userId || habit.userId === 'local' || habit.userId !== userId) {
      habit.userId = userId;
      const targetDocId = habit.id || 'habit_' + Date.now();
      const targetDocRef = doc(db, 'habits', targetDocId);
      try {
        const snap = await getDoc(targetDocRef);
        const habitPayload: Record<string, any> = {
          userId,
          name: habit.name,
          category: habit.category || 'General',
          frequencyType: habit.frequencyType || 'daily',
          targetType: habit.targetType || 'binary',
          archived: Boolean(habit.archived),
          updatedAt: serverTimestamp(),
        };
        if (habit.description) habitPayload.description = habit.description;
        if (habit.icon) habitPayload.icon = habit.icon;
        if (habit.color) habitPayload.color = habit.color;
        if (Array.isArray(habit.frequencyValue)) habitPayload.frequencyValue = habit.frequencyValue;
        if (habit.targetValue !== undefined) habitPayload.targetValue = Number(habit.targetValue) || 1;
        if (habit.targetUnit) habitPayload.targetUnit = habit.targetUnit;
        if (habit.reminderTime) habitPayload.reminderTime = habit.reminderTime;
        if (habit.sleepBedtime) habitPayload.sleepBedtime = habit.sleepBedtime;
        if (habit.sleepWakeTime) habitPayload.sleepWakeTime = habit.sleepWakeTime;

        if (!snap.exists()) {
          habitPayload.createdAt = serverTimestamp();
          await setDoc(targetDocRef, habitPayload);
        } else {
          await updateDoc(targetDocRef, habitPayload);
        }
        syncedHabits++;
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `habits/${targetDocId}`);
      }
    }
  }
  if (syncedHabits > 0) saveLocalHabits([]);
  
  const localLogs = readLocalLogs();
  let syncedLogs = 0;
  for (const log of localLogs) {
    if (!log.userId || log.userId === 'local' || log.userId !== userId) {
      log.userId = userId;
      const targetDocId = log.id || 'log_' + Date.now();
      const targetDocRef = doc(db, 'habit_logs', targetDocId);
      try {
        const snap = await getDoc(targetDocRef);
        const logPayload: Record<string, any> = {
          userId,
          habitId: log.habitId,
          date: log.date,
          status: log.status,
          updatedAt: serverTimestamp(),
        };
        if (log.progressValue !== undefined) logPayload.progressValue = Number(log.progressValue) || 0;
        if (log.note) logPayload.note = log.note;
        if (log.reflection) logPayload.reflection = log.reflection;

        if (!snap.exists()) {
          logPayload.createdAt = serverTimestamp();
          await setDoc(targetDocRef, logPayload);
        } else {
          await updateDoc(targetDocRef, logPayload);
        }
        syncedLogs++;
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `habit_logs/${targetDocId}`);
      }
    }
  }
  if (syncedLogs > 0) saveLocalLogs([]);
};

export const subscribeToHabits = (
  userId: string | undefined,
  callback: (habits: Habit[]) => void
): (() => void) => {
  if (!userId || userId === 'local' || userId === 'default') {
    callback(readLocalHabits());
    return () => {};
  }

  const q = query(
    collection(db, 'habits'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const habits = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          name: data.name,
          category: data.category,
          icon: data.icon,
          color: data.color,
          frequencyType: data.frequencyType,
          frequencyValue: data.frequencyValue || [],
          targetType: data.targetType,
          targetValue: data.targetValue,
          targetUnit: data.targetUnit,
          reminderTime: data.reminderTime,
          sleepBedtime: data.sleepBedtime,
          sleepWakeTime: data.sleepWakeTime,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
        } as Habit;
      });

      if (habits.length > 0) {
        const clean = deduplicateHabits(habits);
        saveLocalHabits(clean);
        callback(clean);
      } else {
        callback(readLocalHabits());
      }
    },
    (err) => {
      console.warn('subscribeToHabits fallback to local:', err);
      callback(readLocalHabits());
    }
  );
};

export const subscribeToHabitLogs = (
  userId: string | undefined,
  callback: (logs: HabitLog[]) => void
): (() => void) => {
  if (!userId || userId === 'local' || userId === 'default') {
    callback(readLocalLogs());
    return () => {};
  }

  const q = query(collection(db, 'habit_logs'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          habitId: data.habitId,
          date: data.date,
          status: data.status,
          progressValue: data.progressValue,
          note: data.note,
          reflection: data.reflection,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
        } as HabitLog;
      });

      if (logs.length > 0) {
        saveLocalLogs(logs);
        callback(logs);
      } else {
        callback(readLocalLogs());
      }
    },
    (err) => {
      console.warn('subscribeToHabitLogs fallback to local:', err);
      callback(readLocalLogs());
    }
  );
};
