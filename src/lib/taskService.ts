import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

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
  createdAt?: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_KEY = 'streak_tasks_v1';

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

// Local storage helpers
export function readLocalTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedTasks();
      saveLocalTasks(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Error reading local tasks:', err);
    return [];
  }
}

export function saveLocalTasks(tasks: TaskItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Error saving local tasks:', err);
  }
}

// Fetch all tasks (merges local storage and Firestore if authenticated)
export async function getAllTasks(userId?: string): Promise<TaskItem[]> {
  const local = readLocalTasks();

  if (!userId) {
    return local;
  }

  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const firestoreTasks: TaskItem[] = snapshot.docs.map((docSnap) => {
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

    if (firestoreTasks.length > 0) {
      // Merge unique tasks (preferring Firestore by ID, appending local if not yet in Firestore)
      const taskMap = new Map<string, TaskItem>();
      firestoreTasks.forEach((t) => taskMap.set(t.id, t));
      local.forEach((t) => {
        if (!taskMap.has(t.id)) {
          taskMap.set(t.id, t);
        }
      });
      const merged = Array.from(taskMap.values());
      saveLocalTasks(merged);
      return merged;
    } else if (local.length > 0) {
      // Background-seed local tasks into Firestore for this user
      local.forEach(async (task) => {
        try {
          await addDoc(collection(db, 'tasks'), {
            userId,
            title: task.title,
            description: task.description || '',
            date: task.date,
            time: task.time || '',
            timeEnd: task.timeEnd || '',
            category: task.category || 'General',
            priority: task.priority || 'medium',
            type: task.type || 'task',
            completed: task.completed,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Ignore background sync errors
        }
      });
    }

    return local;
  } catch (err) {
    console.warn('Firestore tasks query failed, using local storage:', err);
    return local;
  }
}

// Create Task
export async function createTask(
  taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<TaskItem> {
  const newTask: TaskItem = {
    ...taskData,
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately save locally for instantaneous UI update
  const local = readLocalTasks();
  local.unshift(newTask);
  saveLocalTasks(local);

  // 2. Sync with Firestore if authenticated
  if (userId) {
    try {
      const tempId = newTask.id;
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Update local task with firestore doc ID
      newTask.id = docRef.id;
      const updatedLocal = readLocalTasks().map((t) => (t.id === tempId ? newTask : t));
      saveLocalTasks(updatedLocal);
    } catch (err) {
      console.warn('Could not sync created task to Firestore:', err);
    }
  }

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
  if (userId && !taskId.startsWith('task_seed_')) {
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

      await updateDoc(doc(db, 'tasks', taskId), firestoreUpdates);
    } catch (err) {
      console.warn('Could not sync updated task to Firestore:', err);
    }
  }

  return updated;
}

// Toggle Task Completion
export async function toggleTaskComplete(taskId: string, userId?: string): Promise<boolean> {
  const local = readLocalTasks();
  const task = local.find((t) => t.id === taskId);
  if (!task) return false;

  const nextCompleted = !task.completed;
  await updateTask(taskId, { completed: nextCompleted }, userId);
  return nextCompleted;
}

// Subscribe to tasks with real-time Firestore sync & local storage fallback
export function subscribeToTasks(
  userId: string | undefined,
  onUpdate: (tasks: TaskItem[]) => void
): () => void {
  // Immediately supply cached local tasks for instant rendering
  const local = readLocalTasks();
  onUpdate(local);

  if (!userId) {
    return () => {};
  }

  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreTasks: TaskItem[] = snapshot.docs.map((docSnap) => {
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

        if (firestoreTasks.length > 0) {
          // Merge any newly created local tasks that haven't synced yet
          const taskMap = new Map<string, TaskItem>();
          firestoreTasks.forEach((t) => taskMap.set(t.id, t));
          local.forEach((t) => {
            if (!taskMap.has(t.id) && t.id.startsWith('task_')) {
              taskMap.set(t.id, t);
            }
          });
          const merged = Array.from(taskMap.values());
          saveLocalTasks(merged);
          onUpdate(merged);
        } else {
          onUpdate(local);
        }
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

// Delete Task
export async function deleteTask(taskId: string, userId?: string): Promise<boolean> {
  const local = readLocalTasks();
  const filtered = local.filter((t) => t.id !== taskId);
  saveLocalTasks(filtered);

  if (userId && !taskId.startsWith('task_seed_') && !taskId.startsWith('task_')) {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      console.warn('Could not delete task in Firestore:', err);
    }
  }

  return true;
}
