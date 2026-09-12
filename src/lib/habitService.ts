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
  Timestamp
} from 'firebase/firestore';

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
  archived?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const LOCAL_HABITS_KEY = 'streak_habits_v1';
const LOCAL_LOGS_KEY = 'streak_habit_logs_v1';

export function readLocalHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(LOCAL_HABITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(LOCAL_HABITS_KEY, JSON.stringify(habits));
  } catch {
    // Ignore storage quota
  }
}

export function readLocalLogs(): HabitLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalLogs(logs: HabitLog[]): void {
  try {
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
  } catch {
    // Ignore
  }
}

// Error Handler following Firebase blueprint
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.warn('Firestore fallback: ', JSON.stringify(errInfo));
}

// Habit CRUD
export const createHabit = async (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
  const tempId = 'habit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newHabit: Habit = {
    ...habitData,
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

  return tempId;
};

export const getUserHabits = async (userId: string): Promise<Habit[]> => {
  const local = readLocalHabits();
  
  if (!userId || userId === 'local' || userId === 'default') {
    return local;
  }

  try {
    const q = query(
      collection(db, 'habits'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const firestoreHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));

    if (firestoreHabits.length > 0) {
      // Merge unique habits (prefer Firestore)
      const map = new Map<string, Habit>();
      firestoreHabits.forEach(h => map.set(h.id!, h));
      local.forEach(h => {
        if (h.id && !map.has(h.id)) {
          map.set(h.id, h);
        }
      });
      const merged = Array.from(map.values());
      saveLocalHabits(merged);
      return merged;
    } else if (local.length > 0) {
      return local;
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'habits');
    return local;
  }
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>) => {
  const local = readLocalHabits();
  const index = local.findIndex(h => h.id === habitId);
  if (index !== -1) {
    local[index] = { ...local[index], ...updates, updatedAt: new Date().toISOString() };
    saveLocalHabits(local);
  }

  if (!habitId.startsWith('habit_') && !habitId.startsWith('default-')) {
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
};

export const deleteHabit = async (habitId: string) => {
  const local = readLocalHabits();
  const filtered = local.filter(h => h.id !== habitId);
  saveLocalHabits(filtered);

  if (!habitId.startsWith('habit_') && !habitId.startsWith('default-')) {
    try {
      await deleteDoc(doc(db, 'habits', habitId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `habits/${habitId}`);
    }
  }
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
    return created;
  } catch (error) {
    console.error('Failed to seed default habits:', error);
    return [];
  }
};

export const getHabitLogs = async (userId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> => {
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
    
    return logs.sort((a, b) => b.date.localeCompare(a.date));
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
