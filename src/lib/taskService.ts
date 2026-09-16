import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { trackTaskCreated, trackTaskCompleted } from './analyticsService';
import { handleFirestoreError, OperationType } from './firestoreErrors';

export interface TaskItem {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "1:30 PM" or "13:30"
  timeEnd?: string; // e.g. "2:00 PM"
  category?: 'Work' | 'Health' | 'Fitness' | 'Personal' | 'General';
  priority?: 'low' | 'medium' | 'high';
  type?: 'task' | 'meeting' | 'event' | 'reminder';
  completed: boolean;
  repeat?: 'none' | 'daily' | 'weekly';
  goalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_KEY = 'streak_tasks_v1';
const TASKS_INITIALIZED_KEY = 'streak_tasks_initialized';

// Deduplicate tasks by ID and by content (title + date + time + type)
export function deduplicateTasks(tasks: TaskItem[]): TaskItem[] {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const result: TaskItem[] = [];

  for (const task of tasks) {
    if (!task || !task.title) continue;
    const contentKey = `${task.title.trim().toLowerCase()}_${task.date}_${(task.time || '').trim()}_${task.type || 'task'}`;

    if (task.id && seenIds.has(task.id)) {
      continue;
    }
    if (seenContent.has(contentKey)) {
      continue;
    }

    if (task.id) seenIds.add(task.id);
    seenContent.add(contentKey);
    result.push(task);
  }

  return result;
}

// Seed demo tasks for today and surrounding days so the calendar feels active out-of-the-box, matching the reference image
export function getInitialSeedTasks(baseDateStr?: string): TaskItem[] {
  const today = baseDateStr ? new Date(baseDateStr) : new Date();
  const getOffsetDate = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = getOffsetDate(-1);
  const tomorrowStr = getOffsetDate(1);

  return [
    {
      id: 'task-seed-1',
      title: 'Outdoor run',
      description: '5km zone-2 cardio pacing in the park',
      date: todayStr,
      time: '1:30 PM',
      timeEnd: '2:00 PM',
      category: 'Fitness',
      priority: 'high',
      type: 'task',
      completed: false,
    },
    {
      id: 'task-seed-2',
      title: 'Apply to YC',
      description: 'Review pitch deck and submit video update',
      date: todayStr,
      time: '2:30 PM',
      timeEnd: '3:30 PM',
      category: 'Work',
      priority: 'high',
      type: 'task',
      completed: false,
    },
    {
      id: 'task-seed-3',
      title: 'Order vitamin D',
      description: 'Restock micronutrients and omega-3 supplements',
      date: todayStr,
      time: '7:00 PM',
      timeEnd: '7:30 PM',
      category: 'Health',
      priority: 'medium',
      type: 'task',
      completed: true,
    },
    {
      id: 'task-seed-4',
      title: 'Finish onboarding review',
      description: 'Rescheduled from yesterday sprint',
      date: todayStr,
      time: '10:00 AM',
      timeEnd: '10:45 AM',
      category: 'Work',
      priority: 'medium',
      type: 'task',
      completed: true,
    },
    {
      id: 'task-seed-5',
      title: 'Order protein & book flight tickets',
      description: 'Auto-scheduled from to-do inbox',
      date: todayStr,
      time: '11:15 AM',
      timeEnd: '11:45 AM',
      category: 'Personal',
      priority: 'low',
      type: 'task',
      completed: false,
    },
    {
      id: 'task-seed-6',
      title: 'Exoplan Strategy Discussion',
      description: 'Weekly team roadmap alignment & product milestones',
      date: todayStr,
      time: '4:00 PM',
      timeEnd: '5:00 PM',
      category: 'Work',
      priority: 'high',
      type: 'meeting',
      completed: false,
    },
    {
      id: 'task-seed-7',
      title: 'Deep Meditation & Stretch',
      description: 'Evening recovery protocol',
      date: tomorrowStr,
      time: '8:00 AM',
      timeEnd: '8:30 AM',
      category: 'Health',
      priority: 'medium',
      type: 'task',
      completed: false,
    },
    {
      id: 'task-seed-8',
      title: 'Weekly Systems Review',
      description: 'Log weekly habit streaks and goal reflections',
      date: yesterdayStr,
      time: '6:00 PM',
      timeEnd: '7:00 PM',
      category: 'Work',
      priority: 'high',
      type: 'task',
      completed: true,
    },
  ];
}

const GUEST_DATA_KEY = 'streak_guest_data';

function updateGuestTasksNamespace(tasks: TaskItem[]) {
  try {
    const raw = localStorage.getItem(GUEST_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.tasks = tasks;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore
  }
}

// Local storage helpers
export function readLocalTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return deduplicateTasks(parsed);
      }
    }

    // Check inside streak_guest_data namespace
    const guestRaw = localStorage.getItem(GUEST_DATA_KEY);
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
        const clean = deduplicateTasks(parsed.tasks);
        saveLocalTasks(clean);
        return clean;
      }
    }

    // If user has already initialized before, do NOT re-seed on every empty read
    const isInitialized = localStorage.getItem(TASKS_INITIALIZED_KEY);
    if (isInitialized) {
      return [];
    }

    const initial = deduplicateTasks(getInitialSeedTasks());
    saveLocalTasks(initial);
    localStorage.setItem(TASKS_INITIALIZED_KEY, 'true');
    return initial;
  } catch (err) {
    console.error('Error reading local tasks:', err);
    return [];
  }
}

export function saveLocalTasks(tasks: TaskItem[]) {
  try {
    const clean = deduplicateTasks(tasks);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clean));
    updateGuestTasksNamespace(clean);
  } catch (err) {
    console.error('Error saving local tasks:', err);
  }
}

// Fetch all tasks (merges local storage and Firestore if authenticated)
export async function getAllTasks(userId?: string): Promise<TaskItem[]> {
  const local = readLocalTasks();

  if (!userId || userId === 'local' || userId === 'default') {
    return deduplicateTasks(local);
  }

  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const rawFirestoreTasks: TaskItem[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        date: data.date,
        time: data.time,
        timeEnd: data.timeEnd,
        category: data.category,
        priority: data.priority,
        type: data.type || 'task',
        completed: Boolean(data.completed),
        repeat: data.repeat,
        goalId: data.goalId,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
      };
    });

    // Check if Firestore had duplicate documents and clean them up asynchronously
    const seenContent = new Map<string, string>(); // contentKey -> primaryDocId
    const duplicateDocIdsToDelete: string[] = [];
    const firestoreTasks: TaskItem[] = [];

    for (const t of rawFirestoreTasks) {
      const contentKey = `${t.title.trim().toLowerCase()}_${t.date}_${(t.time || '').trim()}_${t.type || 'task'}`;
      if (seenContent.has(contentKey)) {
        duplicateDocIdsToDelete.push(t.id);
      } else {
        seenContent.set(contentKey, t.id);
        firestoreTasks.push(t);
      }
    }

    if (duplicateDocIdsToDelete.length > 0) {
      duplicateDocIdsToDelete.forEach(async (id) => {
        try {
          await deleteDoc(doc(db, 'tasks', id));
        } catch {
          // ignore background cleanup error
        }
      });
    }

    if (firestoreTasks.length > 0) {
      // Retain only temporary local tasks created very recently that haven't synced yet
      const taskMap = new Map<string, TaskItem>();
      firestoreTasks.forEach((t) => taskMap.set(t.id, t));

      local.forEach((t) => {
        if (!taskMap.has(t.id) && t.id.startsWith('temp_task_')) {
          const contentKey = `${t.title.trim().toLowerCase()}_${t.date}_${(t.time || '').trim()}_${t.type || 'task'}`;
          if (!seenContent.has(contentKey)) {
            taskMap.set(t.id, t);
          }
        }
      });
      const merged = deduplicateTasks(Array.from(taskMap.values()));
      saveLocalTasks(merged);
      localStorage.setItem(TASKS_INITIALIZED_KEY, 'true');
      return merged;
    } else {
      // If Firestore has 0 tasks for this user
      const isInitialized = localStorage.getItem(TASKS_INITIALIZED_KEY);
      if (isInitialized) {
        saveLocalTasks([]);
        return [];
      }
      return deduplicateTasks(local);
    }
  } catch (err) {
    console.warn('Firestore tasks query failed, using local storage:', err);
    return deduplicateTasks(local);
  }
}

// Create Task
export async function createTask(
  taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<TaskItem> {
  const cleanTitle = (taskData.title || '').trim();
  if (!cleanTitle) {
    throw new Error('Task title cannot be empty.');
  }

  const cleanDate = taskData.date || new Date().toISOString().split('T')[0];

  // Prevent duplicate creation if an identical task already exists for this date and time
  const local = readLocalTasks();
  const duplicate = local.find(
    (t) =>
      t.title.trim().toLowerCase() === cleanTitle.toLowerCase() &&
      t.date === cleanDate &&
      (t.time || '').trim() === (taskData.time || '').trim() &&
      (t.type || 'task') === (taskData.type || 'task')
  );
  if (duplicate) {
    return duplicate;
  }

  const tempId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? `task_${crypto.randomUUID()}` 
    : `temp_task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`;

  const newTask: TaskItem = {
    ...taskData,
    title: cleanTitle,
    date: cleanDate,
    id: tempId,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately save locally for instantaneous UI update
  local.unshift(newTask);
  saveLocalTasks(local);

  // 2. Sync with Firestore if authenticated
  if (userId && userId !== 'local' && userId !== 'default') {
    try {
      const docRef = await addDoc(collection(db, 'tasks'), {
        userId,
        title: newTask.title,
        description: newTask.description || '',
        date: newTask.date,
        time: newTask.time || '',
        timeEnd: newTask.timeEnd || '',
        category: newTask.category || 'General',
        priority: newTask.priority || 'medium',
        type: newTask.type || 'task',
        completed: Boolean(newTask.completed),
        repeat: newTask.repeat || 'none',
        goalId: newTask.goalId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Update local task with firestore doc ID
      newTask.id = docRef.id;
      const currentLocal = readLocalTasks();
      const updatedLocal = currentLocal.map((t) => (t.id === tempId ? newTask : t));
      saveLocalTasks(updatedLocal);
    } catch (err) {
      console.warn('Could not sync created task to Firestore:', err);
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    }
  }

  trackTaskCreated(newTask.category, newTask.priority);
  return newTask;
}

// Update Task
export async function updateTask(
  taskId: string,
  updates: Partial<TaskItem>,
  userId?: string
): Promise<TaskItem | null> {
  const local = readLocalTasks();
  const index = local.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const updated: TaskItem = {
    ...local[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  local[index] = updated;
  saveLocalTasks(local);

  // Background sync with Firestore
  if (userId && userId !== 'local' && userId !== 'default' && !taskId.startsWith('temp_task_')) {
    try {
      const firestoreUpdates: any = {
        updatedAt: serverTimestamp(),
      };
      if (updates.title !== undefined) firestoreUpdates.title = updates.title;
      if (updates.description !== undefined) firestoreUpdates.description = updates.description;
      if (updates.date !== undefined) firestoreUpdates.date = updates.date;
      if (updates.time !== undefined) firestoreUpdates.time = updates.time;
      if (updates.timeEnd !== undefined) firestoreUpdates.timeEnd = updates.timeEnd;
      if (updates.category !== undefined) firestoreUpdates.category = updates.category;
      if (updates.priority !== undefined) firestoreUpdates.priority = updates.priority;
      if (updates.type !== undefined) firestoreUpdates.type = updates.type;
      if (updates.completed !== undefined) firestoreUpdates.completed = updates.completed;
      if (updates.repeat !== undefined) firestoreUpdates.repeat = updates.repeat;
      if (updates.goalId !== undefined) firestoreUpdates.goalId = updates.goalId;

      await updateDoc(doc(db, 'tasks', taskId), firestoreUpdates);
    } catch (err) {
      console.warn('Could not sync updated task to Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
    }
  }

  return updated;
}

// Toggle Task Completion
export async function toggleTaskComplete(taskId: string, userId?: string, skipSync: boolean = false): Promise<boolean> {
  const local = readLocalTasks();
  const task = local.find((t) => t.id === taskId);
  if (!task) return false;

  const nextCompleted = !task.completed;
  if (nextCompleted) {
    trackTaskCompleted(task.category);
  }
  await updateTask(taskId, { completed: nextCompleted }, userId);
  
  if (!skipSync && task.goalId) {
    try {
      const { readLocalGoals, logDailyGoalProgressQuick } = await import('./goalService');
      const localGoals = readLocalGoals();
      const linkedGoal = localGoals.find(g => g.id === task.goalId);
      if (linkedGoal && linkedGoal.type === 'daily') {
        const delta = nextCompleted ? (linkedGoal.dailyTarget || linkedGoal.target || 1) : -(linkedGoal.dailyTarget || linkedGoal.target || 1);
        await logDailyGoalProgressQuick(linkedGoal.id, task.date, delta, userId, true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('streak_goals_updated'));
        }
      }
    } catch (e) {
      console.warn('Could not sync task to goal:', e);
    }
  }
  
  return nextCompleted;
}

// Subscribe to tasks with real-time Firestore sync & local storage fallback
export function subscribeToTasks(
  userId: string | undefined,
  onUpdate: (tasks: TaskItem[]) => void
): () => void {
  // Immediately supply cached local tasks for instant rendering
  const local = deduplicateTasks(readLocalTasks());
  onUpdate(local);

  if (!userId || userId === 'local' || userId === 'default') {
    return () => {};
  }

  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rawFirestoreTasks: TaskItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: data.userId,
            title: data.title,
            description: data.description,
            date: data.date,
            time: data.time,
            timeEnd: data.timeEnd,
            category: data.category,
            priority: data.priority,
            type: data.type || 'task',
            completed: Boolean(data.completed),
            repeat: data.repeat,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
          };
        });

        const seenContent = new Set<string>();
        const firestoreTasks: TaskItem[] = [];
        for (const t of rawFirestoreTasks) {
          const contentKey = `${t.title.trim().toLowerCase()}_${t.date}_${(t.time || '').trim()}_${t.type || 'task'}`;
          if (!seenContent.has(contentKey)) {
            seenContent.add(contentKey);
            firestoreTasks.push(t);
          }
        }

        // Merge any newly created in-flight local tasks
        const currentLocal = readLocalTasks();
        const taskMap = new Map<string, TaskItem>();
        firestoreTasks.forEach((t) => taskMap.set(t.id, t));
        currentLocal.forEach((t) => {
          if (!taskMap.has(t.id) && t.id.startsWith('temp_task_')) {
            const contentKey = `${t.title.trim().toLowerCase()}_${t.date}_${(t.time || '').trim()}_${t.type || 'task'}`;
            if (!seenContent.has(contentKey)) {
              taskMap.set(t.id, t);
            }
          }
        });
        const merged = deduplicateTasks(Array.from(taskMap.values()));
        saveLocalTasks(merged);
        onUpdate(merged);
      },
      (err) => {
        console.warn('Firestore tasks subscription error:', err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish Firestore tasks subscription:', err);
    return () => {};
  }
}

// Delete Task (permanently deletes in local storage AND Firestore)
export async function deleteTask(taskId: string, userId?: string): Promise<boolean> {
  const local = readLocalTasks();
  const filtered = local.filter((t) => t.id !== taskId);
  saveLocalTasks(filtered);

  if (userId && userId !== 'local' && userId !== 'default') {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      console.warn('Could not delete task in Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    }
  }

  return true;
}

export const syncLocalTasksToCloud = async (userId: string) => {
  if (!userId || userId === 'local' || userId === 'default') return;
  const localTasks = deduplicateTasks(readLocalTasks());
  let syncCount = 0;
  for (const task of localTasks) {
    if (!task.userId || task.userId === 'local' || task.userId !== userId) {
      task.userId = userId;
      const targetDocId = task.id.startsWith('task-seed-')
        ? 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
        : task.id || 'task_' + Date.now();
      const targetDocRef = doc(db, 'tasks', targetDocId);
      try {
        const snap = await getDoc(targetDocRef);
        const taskPayload: Record<string, any> = {
          userId,
          title: task.title,
          date: task.date,
          completed: Boolean(task.completed),
          updatedAt: serverTimestamp(),
        };
        if (task.description) taskPayload.description = task.description;
        if (task.time) taskPayload.time = task.time;
        if (task.timeEnd) taskPayload.timeEnd = task.timeEnd;
        if (task.repeat) taskPayload.repeat = task.repeat;
        if (task.category) taskPayload.category = task.category;
        if (task.priority) taskPayload.priority = task.priority;
        if (task.type) taskPayload.type = task.type;

        if (!snap.exists()) {
          taskPayload.createdAt = serverTimestamp();
          await setDoc(targetDocRef, taskPayload);
        } else {
          await updateDoc(targetDocRef, taskPayload);
        }
        syncCount++;
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `tasks/${targetDocId}`);
      }
    }
  }
  if (syncCount > 0) {
    // Clear out local cache and let real-time subscription hydrate
    saveLocalTasks([]);
  }
};
