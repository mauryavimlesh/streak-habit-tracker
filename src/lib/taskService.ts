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
import { getTodayDateKey, diffDays } from './dateUtils';
import { isCloudSyncableUser } from './authUtils';

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
  linkedGoalId?: string;
  linkedGoalActivityId?: string;
  linkedHabitId?: string;
  unit?: string; // e.g. 'pages', 'minutes', 'questions', 'problems'
  targetQuantity?: number; // e.g. 50
  progressQuantity?: number; // e.g. 25
  isArchived?: boolean;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchivedTaskItem extends TaskItem {
  archivedAt: string;
  originalDate?: string;
}

const LOCAL_STORAGE_KEY = 'streak_tasks_v1';
const TASKS_INITIALIZED_KEY = 'streak_tasks_initialized';
export const ARCHIVED_STORAGE_KEY = 'streak_archived_tasks_v1';
export const LAST_AUTO_ARCHIVE_CHECK_KEY = 'streak_last_tasks_auto_archive_check';

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

function updateGuestArchivedTasksNamespace(archivedTasks: ArchivedTaskItem[]) {
  try {
    const raw = localStorage.getItem(GUEST_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.archivedTasks = archivedTasks;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore
  }
}

export function readLocalArchivedTasks(): ArchivedTaskItem[] {
  try {
    const raw = localStorage.getItem(ARCHIVED_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    const guestRaw = localStorage.getItem(GUEST_DATA_KEY);
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed.archivedTasks)) {
        return parsed.archivedTasks;
      }
    }
    return [];
  } catch (err) {
    console.error('Error reading local archived tasks:', err);
    return [];
  }
}

export function saveLocalArchivedTasks(archivedTasks: ArchivedTaskItem[]): void {
  try {
    localStorage.setItem(ARCHIVED_STORAGE_KEY, JSON.stringify(archivedTasks));
    updateGuestArchivedTasksNamespace(archivedTasks);
  } catch (err) {
    console.error('Error saving local archived tasks:', err);
  }
}

// Fetch all tasks (merges local storage and Firestore if authenticated)
export async function getAllTasks(userId?: string): Promise<TaskItem[]> {
  // Asynchronously trigger auto-archive for tasks older than 30 days to maintain performance
  autoArchiveOldCompletedTasks(userId).catch(() => {});

  const local = readLocalTasks();

  if (!isCloudSyncableUser(userId)) {
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
        goalId: data.goalId || data.linkedGoalId,
        unit: data.unit || undefined,
        targetQuantity: typeof data.targetQuantity === 'number' ? data.targetQuantity : undefined,
        progressQuantity: typeof data.progressQuantity === 'number' ? data.progressQuantity : undefined,
        isArchived: Boolean(data.isArchived),
        archivedAt: data.archivedAt?.toDate ? data.archivedAt.toDate().toISOString() : (data.archivedAt || undefined),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
      };
    });

    // Check if Firestore had duplicate documents and clean them up asynchronously
    const seenContent = new Map<string, string>(); // contentKey -> primaryDocId
    const duplicateDocIdsToDelete: string[] = [];
    const firestoreTasks: TaskItem[] = [];

    for (const t of rawFirestoreTasks) {
      if (t.isArchived) continue;
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
    unit: taskData.unit?.trim() || undefined,
    targetQuantity: typeof taskData.targetQuantity === 'number' && taskData.targetQuantity > 0 ? taskData.targetQuantity : undefined,
    progressQuantity: typeof taskData.progressQuantity === 'number'
      ? taskData.progressQuantity
      : (taskData.completed && typeof taskData.targetQuantity === 'number' ? taskData.targetQuantity : 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediately save locally for instantaneous UI update
  local.unshift(newTask);
  saveLocalTasks(local);

  // 2. Sync with Firestore if authenticated
  if (isCloudSyncableUser(userId)) {
    try {
      const taskPayload: Record<string, any> = {
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
      };
      if (newTask.unit) taskPayload.unit = newTask.unit;
      if (typeof newTask.targetQuantity === 'number') taskPayload.targetQuantity = newTask.targetQuantity;
      if (typeof newTask.progressQuantity === 'number') taskPayload.progressQuantity = newTask.progressQuantity;

      const docRef = await addDoc(collection(db, 'tasks'), taskPayload);
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
  if (isCloudSyncableUser(userId) && !taskId.startsWith('temp_task_')) {
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
      if (updates.unit !== undefined) firestoreUpdates.unit = updates.unit;
      if (updates.targetQuantity !== undefined) firestoreUpdates.targetQuantity = updates.targetQuantity;
      if (updates.progressQuantity !== undefined) firestoreUpdates.progressQuantity = updates.progressQuantity;
      if (updates.isArchived !== undefined) firestoreUpdates.isArchived = updates.isArchived;
      if (updates.archivedAt !== undefined) firestoreUpdates.archivedAt = updates.archivedAt;

      await updateDoc(doc(db, 'tasks', taskId), firestoreUpdates);
    } catch (err) {
      console.warn('Could not sync updated task to Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
    }
  }

  return updated;
}

/**
 * Updates a quantitative unit progress for a task (e.g. 15 pages out of 50).
 * Automatically marks the task complete when progress reaches or exceeds the target quantity.
 */
export async function updateTaskProgressQuantity(
  taskId: string,
  newQuantity: number,
  userId?: string
): Promise<TaskItem | null> {
  const local = readLocalTasks();
  const task = local.find((t) => t.id === taskId);
  if (!task) return null;

  const validQuantity = Math.max(0, Math.round(newQuantity * 100) / 100);
  const isTargetMet =
    typeof task.targetQuantity === 'number' && task.targetQuantity > 0
      ? validQuantity >= task.targetQuantity
      : task.completed;

  if (isTargetMet && !task.completed) {
    trackTaskCompleted(task.category);
  }

  return updateTask(
    taskId,
    {
      progressQuantity: validQuantity,
      completed: isTargetMet,
    },
    userId
  );
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
      const { readLocalGoals, logDailyGoalProgressQuick, updateGoalActivity } = await import('./goalService');
      const localGoals = readLocalGoals();
      const linkedGoal = localGoals.find(g => g.id === task.goalId);
      
      // If linked to specific activity in goal
      if (linkedGoal && (task as any).activityId) {
        await updateGoalActivity(linkedGoal.id, task.date, (task as any).activityId, { completed: nextCompleted }, userId);
      } else if (linkedGoal && linkedGoal.type === 'daily') {
        const delta = nextCompleted ? (linkedGoal.dailyTarget || linkedGoal.target || 1) : -(linkedGoal.dailyTarget || linkedGoal.target || 1);
        await logDailyGoalProgressQuick(linkedGoal.id, task.date, delta, userId, true);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('streak_goals_updated'));
      }
    } catch (e) {
      console.warn('Could not sync task to goal:', e);
    }
  }
  
  return nextCompleted;
}

let globalTasksListener: (() => void) | null = null;
let globalTasksCache: TaskItem[] | null = null;
const taskSubscribers = new Set<(tasks: TaskItem[]) => void>();
let globalUserId: string | undefined = undefined;
let cleanupTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Subscribe to tasks with real-time Firestore sync & local storage fallback
export function subscribeToTasks(
  userId: string | undefined,
  onUpdate: (tasks: TaskItem[]) => void
): () => void {
  // Clear any pending teardown immediately since a new subscriber has connected
  if (cleanupTimeoutId) {
    clearTimeout(cleanupTimeoutId);
    cleanupTimeoutId = null;
  }

  // If user changed, tear down old listener cleanly
  if (globalUserId !== userId) {
    if (globalTasksListener) {
      try {
        globalTasksListener();
      } catch (err) {
        console.warn('Error unsubscribing previous tasks listener:', err);
      }
      globalTasksListener = null;
    }
    globalTasksCache = null;
    globalUserId = userId;
  }

  taskSubscribers.add(onUpdate);

  // Immediately supply cached tasks (memory if available, else local storage)
  if (globalTasksCache) {
    onUpdate(globalTasksCache);
  } else {
    const local = deduplicateTasks(readLocalTasks());
    globalTasksCache = local;
    onUpdate(local);
  }

  if (!isCloudSyncableUser(userId)) {
    return () => {
      taskSubscribers.delete(onUpdate);
    };
  }

  if (!globalTasksListener) {
    try {
      const q = query(collection(db, 'tasks'), where('userId', '==', userId));
      globalTasksListener = onSnapshot(
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
              goalId: data.goalId || data.linkedGoalId,
              unit: data.unit || undefined,
              targetQuantity: typeof data.targetQuantity === 'number' ? data.targetQuantity : undefined,
              progressQuantity: typeof data.progressQuantity === 'number' ? data.progressQuantity : undefined,
              isArchived: Boolean(data.isArchived),
              archivedAt: data.archivedAt?.toDate ? data.archivedAt.toDate().toISOString() : (data.archivedAt || undefined),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
            };
          });

          const seenContent = new Set<string>();
          const firestoreTasks: TaskItem[] = [];
          for (const t of rawFirestoreTasks) {
            if (t.isArchived) continue;
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
          globalTasksCache = merged;
          taskSubscribers.forEach((cb) => cb(merged));
        },
        (err) => {
          console.warn('Firestore tasks subscription error:', err);
        }
      );
    } catch (err) {
      console.warn('Could not establish Firestore tasks subscription:', err);
    }
  }

  return () => {
    taskSubscribers.delete(onUpdate);
    if (taskSubscribers.size === 0 && globalTasksListener) {
      if (cleanupTimeoutId) {
        clearTimeout(cleanupTimeoutId);
      }
      cleanupTimeoutId = setTimeout(() => {
        if (taskSubscribers.size === 0 && globalTasksListener) {
          try {
            globalTasksListener();
          } catch (err) {
            console.warn('Error during tasks listener unsubscribe:', err);
          }
          globalTasksListener = null;
          globalTasksCache = null;
        }
        cleanupTimeoutId = null;
      }, 1200);
    }
  };
}

// Delete Task (permanently deletes in local storage AND Firestore)
export async function deleteTask(taskId: string, userId?: string): Promise<boolean> {
  const local = readLocalTasks();
  const filtered = local.filter((t) => t.id !== taskId);
  saveLocalTasks(filtered);

  if (isCloudSyncableUser(userId)) {
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
  if (!isCloudSyncableUser(userId)) return;
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

/**
 * Automatically archives completed tasks older than 30 days into the dedicated 'Archived' history store.
 * Keeps the active tasks collection and calendar views lean, snappy, and high-performance.
 */
export async function autoArchiveOldCompletedTasks(
  userId?: string,
  options: { force?: boolean; daysThreshold?: number } = {}
): Promise<{ archivedCount: number; archivedTasks: ArchivedTaskItem[] }> {
  const daysThreshold = options.daysThreshold ?? 30;
  const todayKey = getTodayDateKey();

  // Rate-limiting check for automatic background runs (throttle to once every 12 hours unless forced)
  if (!options.force) {
    const lastCheckStr = localStorage.getItem(LAST_AUTO_ARCHIVE_CHECK_KEY);
    if (lastCheckStr) {
      const lastCheck = parseInt(lastCheckStr, 10);
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      if (Date.now() - lastCheck < twelveHoursMs) {
        return { archivedCount: 0, archivedTasks: [] };
      }
    }
  }

  // Update check timestamp
  localStorage.setItem(LAST_AUTO_ARCHIVE_CHECK_KEY, Date.now().toString());

  const currentLocalTasks = readLocalTasks();
  const existingArchived = readLocalArchivedTasks();
  const archivedMap = new Map<string, ArchivedTaskItem>();
  existingArchived.forEach((item) => archivedMap.set(item.id, item));

  const toArchive: ArchivedTaskItem[] = [];
  const remainingActiveTasks: TaskItem[] = [];

  for (const task of currentLocalTasks) {
    if (!task || !task.date) {
      remainingActiveTasks.push(task);
      continue;
    }

    const ageDays = diffDays(task.date, todayKey);
    // Condition: Task is completed AND older than threshold (default 30 days)
    if (task.completed && ageDays >= daysThreshold) {
      const archivedRecord: ArchivedTaskItem = {
        ...task,
        originalDate: task.date,
        archivedAt: new Date().toISOString(),
      };
      toArchive.push(archivedRecord);
      archivedMap.set(task.id, archivedRecord);
    } else {
      remainingActiveTasks.push(task);
    }
  }

  // Save updated active tasks & archived tasks in local storage
  if (toArchive.length > 0) {
    saveLocalTasks(remainingActiveTasks);
    saveLocalArchivedTasks(Array.from(archivedMap.values()));
  }

  // If authenticated user, move old completed tasks in Firestore
  if (isCloudSyncableUser(userId)) {
    try {
      // Query completed tasks for this user from Firestore
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', userId),
        where('completed', '==', true)
      );
      const snapshot = await getDocs(q);

      const firestoreToArchive: TaskItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const taskDate = data.date;
        if (taskDate) {
          const ageDays = diffDays(taskDate, todayKey);
          if (ageDays >= daysThreshold) {
            firestoreToArchive.push({
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
              completed: true,
              repeat: data.repeat,
              goalId: data.goalId || data.linkedGoalId,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
            });
          }
        }
      });

      // Move each qualifying firestore task to archived_tasks collection and remove from tasks
      for (const t of firestoreToArchive) {
        try {
          const archivedDocRef = doc(db, 'archived_tasks', t.id);
          const taskPayload: Record<string, any> = {
            userId,
            title: t.title,
            date: t.date,
            originalDate: t.date,
            completed: true,
            archivedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (t.description) taskPayload.description = t.description;
          if (t.time) taskPayload.time = t.time;
          if (t.timeEnd) taskPayload.timeEnd = t.timeEnd;
          if (t.repeat) taskPayload.repeat = t.repeat;
          if (t.category) taskPayload.category = t.category;
          if (t.priority) taskPayload.priority = t.priority;
          if (t.type) taskPayload.type = t.type;
          if (t.goalId) taskPayload.linkedGoalId = t.goalId;
          if (t.unit) taskPayload.unit = t.unit;
          if (typeof t.targetQuantity === 'number') taskPayload.targetQuantity = t.targetQuantity;
          if (typeof t.progressQuantity === 'number') taskPayload.progressQuantity = t.progressQuantity;

          await setDoc(archivedDocRef, taskPayload);
          await deleteDoc(doc(db, 'tasks', t.id));

          const archivedItem: ArchivedTaskItem = {
            ...t,
            originalDate: t.date,
            archivedAt: new Date().toISOString(),
          };
          archivedMap.set(t.id, archivedItem);
          if (!toArchive.some((x) => x.id === t.id)) {
            toArchive.push(archivedItem);
          }
        } catch (err) {
          console.warn(`Could not archive task ${t.id} in Firestore:`, err);
        }
      }

      saveLocalArchivedTasks(Array.from(archivedMap.values()));
    } catch (err) {
      console.warn('Firestore auto-archive check failed:', err);
    }
  }

  if (toArchive.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('streak_tasks_archived', {
        detail: { count: toArchive.length, archivedTasks: toArchive },
      })
    );
    window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
  }

  return {
    archivedCount: toArchive.length,
    archivedTasks: toArchive,
  };
}

/**
 * Retrieves all archived tasks from the dedicated history store.
 */
export async function getArchivedTasks(userId?: string): Promise<ArchivedTaskItem[]> {
  const local = readLocalArchivedTasks();

  if (!isCloudSyncableUser(userId)) {
    return local.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  try {
    const q = query(collection(db, 'archived_tasks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const firestoreArchived: ArchivedTaskItem[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        date: data.date,
        originalDate: data.originalDate || data.date,
        time: data.time,
        timeEnd: data.timeEnd,
        category: data.category,
        priority: data.priority,
        type: data.type || 'task',
        completed: Boolean(data.completed),
        repeat: data.repeat,
        goalId: data.linkedGoalId || data.goalId,
        unit: data.unit || undefined,
        targetQuantity: typeof data.targetQuantity === 'number' ? data.targetQuantity : undefined,
        progressQuantity: typeof data.progressQuantity === 'number' ? data.progressQuantity : undefined,
        archivedAt: data.archivedAt?.toDate
          ? data.archivedAt.toDate().toISOString()
          : (data.archivedAt || new Date().toISOString()),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
      };
    });

    const map = new Map<string, ArchivedTaskItem>();
    firestoreArchived.forEach((item) => map.set(item.id, item));
    local.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    saveLocalArchivedTasks(merged);
    return merged;
  } catch (err) {
    console.warn('Failed to fetch archived tasks from Firestore, returning local:', err);
    return local.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }
}

/**
 * Restores a previously archived task back into active tasks.
 */
export async function restoreArchivedTask(
  taskId: string,
  userId?: string
): Promise<TaskItem | null> {
  const localArchived = readLocalArchivedTasks();
  const index = localArchived.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const itemToRestore = localArchived[index];

  // Remove from archived store
  const remainingArchived = localArchived.filter((t) => t.id !== taskId);
  saveLocalArchivedTasks(remainingArchived);

  // Re-add to active tasks store
  const activeTask: TaskItem = {
    id: itemToRestore.id,
    userId: itemToRestore.userId || userId,
    title: itemToRestore.title,
    description: itemToRestore.description,
    date: itemToRestore.date,
    time: itemToRestore.time,
    timeEnd: itemToRestore.timeEnd,
    category: itemToRestore.category,
    priority: itemToRestore.priority,
    type: itemToRestore.type || 'task',
    completed: itemToRestore.completed,
    repeat: itemToRestore.repeat,
    goalId: itemToRestore.goalId,
    unit: itemToRestore.unit,
    targetQuantity: itemToRestore.targetQuantity,
    progressQuantity: itemToRestore.progressQuantity,
    createdAt: itemToRestore.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const localTasks = readLocalTasks();
  localTasks.unshift(activeTask);
  saveLocalTasks(localTasks);

  // If authenticated, delete from archived_tasks and set in tasks
  if (isCloudSyncableUser(userId)) {
    try {
      await deleteDoc(doc(db, 'archived_tasks', taskId));
      const targetDocRef = doc(db, 'tasks', taskId);
      const payload: Record<string, any> = {
        userId,
        title: activeTask.title,
        date: activeTask.date,
        completed: Boolean(activeTask.completed),
        updatedAt: serverTimestamp(),
      };
      if (activeTask.description) payload.description = activeTask.description;
      if (activeTask.time) payload.time = activeTask.time;
      if (activeTask.timeEnd) payload.timeEnd = activeTask.timeEnd;
      if (activeTask.repeat) payload.repeat = activeTask.repeat;
      if (activeTask.category) payload.category = activeTask.category;
      if (activeTask.priority) payload.priority = activeTask.priority;
      if (activeTask.type) payload.type = activeTask.type;
      if (activeTask.goalId) payload.goalId = activeTask.goalId;
      if (activeTask.unit) payload.unit = activeTask.unit;
      if (typeof activeTask.targetQuantity === 'number') payload.targetQuantity = activeTask.targetQuantity;
      if (typeof activeTask.progressQuantity === 'number') payload.progressQuantity = activeTask.progressQuantity;

      await setDoc(targetDocRef, payload);
    } catch (err) {
      console.warn(`Could not restore archived task ${taskId} in Firestore:`, err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
  }

  return activeTask;
}

/**
 * Permanently deletes a task from the archived store.
 */
export async function deleteArchivedTask(taskId: string, userId?: string): Promise<boolean> {
  const localArchived = readLocalArchivedTasks();
  const filtered = localArchived.filter((t) => t.id !== taskId);
  saveLocalArchivedTasks(filtered);

  if (isCloudSyncableUser(userId)) {
    try {
      await deleteDoc(doc(db, 'archived_tasks', taskId));
    } catch (err) {
      console.warn('Could not delete archived task in Firestore:', err);
    }
  }

  return true;
}

/**
 * Clears all archived tasks for the user.
 */
export async function clearAllArchivedTasks(userId?: string): Promise<boolean> {
  const localArchived = readLocalArchivedTasks();
  saveLocalArchivedTasks([]);

  if (isCloudSyncableUser(userId)) {
    try {
      for (const item of localArchived) {
        await deleteDoc(doc(db, 'archived_tasks', item.id)).catch(() => {});
      }
    } catch (err) {
      console.warn('Could not clear all archived tasks in Firestore:', err);
    }
  }

  return true;
}
