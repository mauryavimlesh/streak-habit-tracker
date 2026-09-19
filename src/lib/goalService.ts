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
  serverTimestamp,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { trackGoalCreated, trackGoalCompleted, trackGoalUpdated, trackGoalDeleted } from './analyticsService';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { isCloudSyncableUser } from './authUtils';
import { getTodayDateKey, formatDateKey, addDays } from './dateUtils';
import {
  calculateGoalProgress,
  calculateImmutableGoalStreaks,
  calculateActivityQuantities,
  GoalProgressResult,
} from './goalProgressEngine';

export { calculateGoalProgress, calculateImmutableGoalStreaks, calculateActivityQuantities };
export type { GoalProgressResult };

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export type GoalType = 'one_time' | 'daily' | 'weekly' | 'long_term';

export interface GoalActivity {
  id: string;
  title: string;
  subject?: string;
  type?: string; // 'Lecture' | 'Notes' | 'Revision' | 'DPP' | 'Questions' | 'NCERT Reading' | 'Practice' | 'Preparation' | 'Custom'
  targetQuantity: number;
  progress: number;
  unit: string;
  completed: boolean;
  estimatedDuration?: number; // minutes
  scheduledTime?: string;
  plannedDurationMinutes?: number;
  notes?: string;
  status?: 'upcoming' | 'in_progress' | 'done' | 'missed';
  deadline?: string;
  linkedTaskId?: string;
  linkedHabitId?: string;
  focusSessionId?: string;
}

export interface DailyGoalEntry {
  date: string; // YYYY-MM-DD
  target: number;
  progress: number;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  activities?: GoalActivity[];
  missedHandled?: 'carried_forward' | 'missed' | 'rescheduled';
}

export interface Goal {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  category: string;
  type?: GoalType;
  target: number; 
  currentProgress: number; 
  dailyTarget?: number; 
  unit?: string; 
  subjects?: string[];
  startDate?: string;
  endDate?: string;
  dailyHistory?: Record<string, DailyGoalEntry>; 
  linkToHabit?: boolean;
  linkedHabitId?: string;
  linkToTask?: boolean;
  linkedTaskId?: string;
  targetDate?: string; 
  priority?: 'low' | 'medium' | 'high';
  milestones?: Milestone[];
  linkedHabitIds?: string[];
  status: 'in_progress' | 'completed' | 'paused' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

const LOCAL_GOALS_KEY = 'streak_goals_v1';

const DEFAULT_GOALS: Goal[] = [
  {
    id: 'goal-seed-daily-1',
    title: 'Study Focused Lectures',
    description: 'Daily technical curriculum and system design lectures',
    category: 'Study',
    type: 'daily',
    target: 120,
    dailyTarget: 4,
    currentProgress: 3,
    unit: 'Lectures',
    targetDate: '2026-12-31',
    priority: 'high',
    status: 'in_progress',
    linkToHabit: false,
    linkToTask: true,
    dailyHistory: {
      [getTodayDateKey()]: {
        date: getTodayDateKey(),
        target: 4,
        progress: 3,
        completed: false,
      },
      ...(() => {
        const hist: Record<string, DailyGoalEntry> = {};
        const now = new Date();
        for (let i = 1; i <= 14; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const dStr = formatDateKey(d);
          const progress = i % 4 === 0 ? 3 : 4;
          hist[dStr] = {
            date: dStr,
            target: 4,
            progress,
            completed: progress >= 4,
            completedAt: progress >= 4 ? `${dStr}T17:30:00Z` : undefined,
          };
        }
        return hist;
      })(),
    },
  },
  {
    id: 'goal-seed-1',
    title: 'Run a Half Marathon (21.1 km)',
    description: 'Build aerobic endurance and consistent weekly mileage',
    category: 'Fitness',
    type: 'one_time',
    target: 21,
    currentProgress: 14,
    unit: 'km',
    targetDate: '2026-11-15',
    priority: 'high',
    status: 'in_progress',
    milestones: [
      { id: 'm1', title: 'Continuous 5k without stopping', completed: true },
      { id: 'm2', title: 'Continuous 10k race pace', completed: true },
      { id: 'm3', title: '15k long endurance weekend run', completed: false },
      { id: 'm4', title: '21.1k race day completion', completed: false },
    ],
  },
  {
    id: 'goal-seed-2',
    title: 'Read 12 Deep Books',
    description: 'Focus on psychology, biology, systems thinking, and discipline',
    category: 'Study',
    type: 'one_time',
    target: 12,
    currentProgress: 7,
    unit: 'books',
    targetDate: '2026-12-31',
    priority: 'medium',
    status: 'in_progress',
    milestones: [
      { id: 'm5', title: 'Atomic Habits', completed: true },
      { id: 'm6', title: 'Thinking Fast & Slow', completed: true },
      { id: 'm7', title: 'Deep Work', completed: true },
      { id: 'm8', title: 'Principles by Ray Dalio', completed: false },
    ],
  },
  {
    id: 'goal-seed-3',
    title: 'Achieve 90 Days Daily Meditation',
    description: 'Mindfulness training for calmness and emotional stability',
    category: 'Health',
    type: 'one_time',
    target: 90,
    currentProgress: 42,
    unit: 'days',
    targetDate: '2026-10-30',
    priority: 'high',
    status: 'in_progress',
  },
];

const GUEST_DATA_KEY = 'streak_guest_data';

function updateGuestGoalsNamespace(goals: Goal[]) {
  try {
    const raw = localStorage.getItem(GUEST_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.goals = goals;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore
  }
}

const GOALS_INITIALIZED_KEY = 'streak_goals_initialized';

export function deduplicateGoals(goals: Goal[]): Goal[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const result: Goal[] = [];

  for (const g of goals) {
    if (!g || !g.title) continue;
    const titleKey = g.title.trim().toLowerCase();
    if (g.id && seenIds.has(g.id)) continue;
    if (seenTitles.has(titleKey)) continue;

    if (g.id) seenIds.add(g.id);
    seenTitles.add(titleKey);
    result.push(g);
  }

  return result;
}

export function readLocalGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(LOCAL_GOALS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return deduplicateGoals(parsed);
      }
    }

    const guestRaw = localStorage.getItem(GUEST_DATA_KEY);
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed.goals) && parsed.goals.length > 0) {
        const clean = deduplicateGoals(parsed.goals);
        saveLocalGoals(clean);
        return clean;
      }
    }

    // If previously initialized, return empty
    const isInit = localStorage.getItem(GOALS_INITIALIZED_KEY);
    if (isInit) {
      return [];
    }

    saveLocalGoals(DEFAULT_GOALS);
    localStorage.setItem(GOALS_INITIALIZED_KEY, 'true');
    return deduplicateGoals(DEFAULT_GOALS);
  } catch {
    return deduplicateGoals(DEFAULT_GOALS);
  }
}

export function saveLocalGoals(goals: Goal[]): void {
  try {
    const clean = deduplicateGoals(goals);
    localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(clean));
    updateGuestGoalsNamespace(clean);
    goalsMemoryCache = clean;
    goalsCacheTimestamp = Date.now();
  } catch {
    // Ignore storage issues
  }
}

// Function to ensure daily goals have corresponding tasks for today
export async function ensureDailyGoalTasks(userId?: string) {
  const localGoals = readLocalGoals();
  const dailyTaskGoals = localGoals.filter(g => g.type === 'daily' && g.linkToTask && g.status === 'in_progress');
  if (dailyTaskGoals.length === 0) return;

  const todayStr = getTodayDateKey();
  let updatedAny = false;

  try {
    const { readLocalTasks, createTask } = await import('./taskService');
    const localTasks = readLocalTasks();
    const todaysTasks = localTasks.filter(t => t.date === todayStr);

    for (const goal of dailyTaskGoals) {
      // Check if a task for this goal exists for today
      const exists = todaysTasks.some(t => t.goalId === goal.id);
      if (!exists) {
        const task = await createTask({
          title: `${goal.title} (${goal.dailyTarget || 1} ${goal.unit || 'units'})`,
          date: todayStr,
          completed: false,
          category: goal.category as any,
          type: 'task',
          repeat: 'daily',
          goalId: goal.id,
        }, userId);
        
        goal.linkedTaskId = task.id; // update linked id to today's task
        updatedAny = true;
      }
    }

    if (updatedAny) {
      saveLocalGoals(localGoals);
    }
  } catch (e) {
    console.warn('Could not auto-generate daily tasks:', e);
  }
}

let goalsMemoryCache: Goal[] | null = null;
let goalsCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function clearGoalsCache() {
  goalsMemoryCache = null;
}

export async function getUserGoals(userId?: string, force = false): Promise<Goal[]> {
  const local = readLocalGoals();
  if (!isCloudSyncableUser(userId)) {
    return deduplicateGoals(local);
  }

  if (!force && goalsMemoryCache && Date.now() - goalsCacheTimestamp < CACHE_TTL) {
    return goalsMemoryCache;
  }

  try {
    const q = query(collection(db, 'goals'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const rawFirestoreGoals: Goal[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        category: data.category || 'General',
        type: data.type || 'one_time',
        target: data.target || 100,
        dailyTarget: data.dailyTarget,
        dailyHistory: data.dailyHistory || {},
        linkToHabit: data.linkToHabit,
        linkedHabitId: data.linkedHabitId,
        linkToTask: data.linkToTask,
        linkedTaskId: data.linkedTaskId,
        currentProgress: data.currentProgress || 0,
        unit: data.unit || '%',
        targetDate: data.targetDate || '',
        priority: data.priority || 'medium',
        milestones: data.milestones || [],
        linkedHabitIds: data.linkedHabitIds || [],
        status: data.status || 'in_progress',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
      };
    });

    // Deduplicate in Firestore
    const seenTitles = new Map<string, string>();
    const duplicateDocIdsToDelete: string[] = [];
    const firestoreGoals: Goal[] = [];

    for (const g of rawFirestoreGoals) {
      const titleKey = (g.title || '').trim().toLowerCase();
      if (seenTitles.has(titleKey)) {
        duplicateDocIdsToDelete.push(g.id);
      } else {
        seenTitles.set(titleKey, g.id);
        firestoreGoals.push(g);
      }
    }

    if (duplicateDocIdsToDelete.length > 0) {
      duplicateDocIdsToDelete.forEach(async (id) => {
        try {
          await deleteDoc(doc(db, 'goals', id));
        } catch {
          // ignore
        }
      });
    }

    if (firestoreGoals.length > 0) {
      const clean = deduplicateGoals(firestoreGoals);
      saveLocalGoals(clean);
      localStorage.setItem(GOALS_INITIALIZED_KEY, 'true');
      goalsMemoryCache = clean;
      goalsCacheTimestamp = Date.now();
      return clean;
    } else {
      const isInit = localStorage.getItem(GOALS_INITIALIZED_KEY);
      if (isInit) {
        saveLocalGoals([]);
        goalsMemoryCache = [];
        goalsCacheTimestamp = Date.now();
        return [];
      }
      return deduplicateGoals(local);
    }
  } catch (err) {
    console.warn('Firestore goals query fallback to local:', err);
    return deduplicateGoals(local);
  }
}

export async function createGoal(
  goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<Goal> {
  const isCloud = isCloudSyncableUser(userId);
  const goalDocRef = isCloud ? doc(collection(db, 'goals')) : null;
  const stableId = goalDocRef ? goalDocRef.id : ('goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
  const todayStr = getTodayDateKey();

  const newGoal: Goal = {
    ...goalData,
    id: stableId,
    userId,
    type: goalData.type || 'one_time',
    status: goalData.status || 'in_progress',
    dailyTarget: goalData.dailyTarget || (goalData.type === 'daily' ? goalData.target || 1 : undefined),
    dailyHistory: goalData.dailyHistory || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If daily goal, initialize today's entry if not present
  if (newGoal.type === 'daily' && !newGoal.dailyHistory?.[todayStr]) {
    newGoal.dailyHistory = {
      ...(newGoal.dailyHistory || {}),
      [todayStr]: {
        date: todayStr,
        target: newGoal.dailyTarget || 1,
        progress: 0,
        completed: false,
      },
    };
  }

  // Link to Habit if requested
  if (newGoal.type === 'daily' && newGoal.linkToHabit && !newGoal.linkedHabitId) {
    try {
      const { createHabit } = await import('./habitService');
      const habitId = await createHabit(
        {
          name: newGoal.title,
          category: newGoal.category.toLowerCase(),
          targetType: 'count',
          targetValue: newGoal.dailyTarget || 1,
          targetUnit: newGoal.unit || 'units',
          frequencyType: 'daily',
          frequencyValue: [],
          icon: 'target',
          color: 'lime',
          userId,
          goalId: stableId,
        } as any
      );
      newGoal.linkedHabitId = habitId;
    } catch (e) {
      console.warn('Could not auto-link habit:', e);
    }
  }

  // Link to Task if requested
  if (newGoal.type === 'daily' && newGoal.linkToTask && !newGoal.linkedTaskId) {
    try {
      const { createTask } = await import('./taskService');
      const task = await createTask(
        {
          title: `${newGoal.title} (${newGoal.dailyTarget || 1} ${newGoal.unit || 'units'})`,
          date: todayStr,
          completed: false,
          category: newGoal.category as any,
          type: 'task',
          repeat: 'daily',
          goalId: stableId,
        },
        userId
      );
      newGoal.linkedTaskId = task.id;
    } catch (e) {
      console.warn('Could not auto-link task:', e);
    }
  }

  const local = readLocalGoals();
  local.unshift(newGoal);
  saveLocalGoals(local);

  if (isCloud && goalDocRef) {
    try {
      await setDoc(goalDocRef, {
        userId,
        title: newGoal.title,
        description: newGoal.description || '',
        category: newGoal.category,
        type: newGoal.type || 'one_time',
        target: newGoal.target,
        dailyTarget: newGoal.dailyTarget || 0,
        dailyHistory: newGoal.dailyHistory || {},
        linkToHabit: newGoal.linkToHabit || false,
        linkedHabitId: newGoal.linkedHabitId || '',
        linkToTask: newGoal.linkToTask || false,
        linkedTaskId: newGoal.linkedTaskId || '',
        currentProgress: newGoal.currentProgress || 0,
        unit: newGoal.unit || '%',
        targetDate: newGoal.targetDate || '',
        priority: newGoal.priority || 'medium',
        milestones: newGoal.milestones || [],
        linkedHabitIds: newGoal.linkedHabitIds || [],
        status: newGoal.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not sync goal to Firestore:', err);
      handleFirestoreError(err, OperationType.CREATE, 'goals');
    }
  }

  trackGoalCreated(newGoal.category);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_goals_updated', { detail: newGoal }));
    window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
    window.dispatchEvent(new CustomEvent('streak_habits_updated'));
  }
  return newGoal;
}

export async function updateGoal(
  goalId: string,
  updates: Partial<Goal>,
  userId?: string
): Promise<Goal | null> {
  const local = readLocalGoals();
  const index = local.findIndex((g) => g.id === goalId);
  if (index === -1) return null;

  const prevGoal = local[index];

  // If editing Daily Target: Past days' history MUST NOT be modified!
  // The new target applies only from today onward.
  if (updates.dailyTarget !== undefined && updates.dailyTarget !== prevGoal.dailyTarget) {
    const todayStr = getTodayDateKey();
    const existingHistory = { ...(prevGoal.dailyHistory || {}) };
    const todayEntry = existingHistory[todayStr];

    if (todayEntry) {
      existingHistory[todayStr] = {
        ...todayEntry,
        target: updates.dailyTarget,
        completed: todayEntry.progress >= updates.dailyTarget,
      };
    } else {
      existingHistory[todayStr] = {
        date: todayStr,
        target: updates.dailyTarget,
        progress: 0,
        completed: false,
      };
    }
    updates.dailyHistory = existingHistory;
  }

  const updated: Goal = {
    ...prevGoal,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  local[index] = updated;
  saveLocalGoals(local);

  if (updates.status === 'completed') {
    trackGoalCompleted(updated.category);
  } else if (Object.keys(updates).length > 0) {
    trackGoalUpdated(updated.category);
  }

  if (isCloudSyncableUser(userId) && !goalId.startsWith('temp_goal_')) {
    try {
      await updateDoc(doc(db, 'goals', goalId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not sync goal update to Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}`);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_goals_updated', { detail: updated }));
  }

  return updated;
}

export async function deleteGoal(goalId: string, userId?: string): Promise<boolean> {
  const local = readLocalGoals();
  const filtered = local.filter((g) => g.id !== goalId);
  saveLocalGoals(filtered);
  localStorage.setItem(GOALS_INITIALIZED_KEY, 'true');
  clearGoalsCache();

  // Unlink any tasks linked to this deleted goal
  try {
    const { readLocalTasks, saveLocalTasks } = await import('./taskService');
    const localTasks = readLocalTasks();
    let tasksChanged = false;
    const updatedTasks = localTasks.map((t) => {
      if (t.goalId === goalId || t.linkedGoalId === goalId) {
        tasksChanged = true;
        return { ...t, goalId: undefined, linkedGoalId: undefined };
      }
      return t;
    });
    if (tasksChanged) {
      saveLocalTasks(updatedTasks);
    }
  } catch {
    // ignore
  }

  // Unlink any habits linked to this deleted goal
  try {
    const { readLocalHabits, saveLocalHabits } = await import('./habitService');
    const localHabits = readLocalHabits();
    let habitsChanged = false;
    const updatedHabits = localHabits.map((h) => {
      if ((h as any).goalId === goalId || (h as any).linkedGoalId === goalId) {
        habitsChanged = true;
        return { ...h, goalId: undefined, linkedGoalId: undefined };
      }
      return h;
    });
    if (habitsChanged) {
      saveLocalHabits(updatedHabits);
    }
  } catch {
    // ignore
  }

  // Unlink any activities in activityService linked to this deleted goal
  try {
    const { getLocalActivities, saveLocalActivities } = await import('./activityService');
    const acts = getLocalActivities();
    let actsChanged = false;
    const updatedActs = acts.map((a) => {
      if (a.goalId === goalId) {
        actsChanged = true;
        return { ...a, goalId: undefined };
      }
      return a;
    });
    if (actsChanged) {
      saveLocalActivities(updatedActs);
    }
  } catch {
    // ignore
  }

  if (isCloudSyncableUser(userId)) {
    try {
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (err) {
      console.warn('Could not delete goal in Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, `goals/${goalId}`);
    }
  }

  trackGoalDeleted();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_goals_updated', { detail: { id: goalId, deleted: true } }));
    window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
    window.dispatchEvent(new CustomEvent('streak_habits_updated'));
  }

  return true;
}

export function subscribeToGoals(
  userId: string | undefined,
  callback: (goals: Goal[]) => void
): () => void {
  if (!isCloudSyncableUser(userId)) {
    callback(readLocalGoals());
    return () => {};
  }

  const q = query(collection(db, 'goals'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const firestoreGoals = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          title: data.title,
          description: data.description,
          category: data.category,
          type: data.type || 'one_time',
          target: data.target,
          dailyTarget: data.dailyTarget,
          dailyHistory: data.dailyHistory || {},
          linkToHabit: data.linkToHabit,
          linkedHabitId: data.linkedHabitId,
          linkToTask: data.linkToTask,
          linkedTaskId: data.linkedTaskId,
          currentProgress: data.currentProgress,
          unit: data.unit,
          targetDate: data.targetDate,
          priority: data.priority,
          milestones: data.milestones,
          linkedHabitIds: data.linkedHabitIds,
          status: data.status,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
        } as Goal;
      });

      if (firestoreGoals.length > 0) {
        saveLocalGoals(firestoreGoals);
        callback(firestoreGoals);
      } else {
        callback(readLocalGoals());
      }
    },
    (err) => {
      console.warn('subscribeToGoals error fallback to local:', err);
      callback(readLocalGoals());
    }
  );
}

export function subscribeToGoalUpdates(callback: (goals: Goal[]) => void): () => void {
  const handler = () => {
    callback(readLocalGoals());
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('streak_goals_updated', handler);
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('streak_goals_updated', handler);
    }
  };
}

export function getGoalTodayProgress(
  goal: Goal,
  dateStr?: string
): {
  target: number;
  progress: number;
  remaining: number;
  percent: number;
  completed: boolean;
} {
  const res = calculateGoalProgress(goal, dateStr);
  return {
    target: res.todayTarget,
    progress: res.todayProgress,
    remaining: res.todayRemaining,
    percent: res.todayPercent,
    completed: res.isTodayComplete,
  };
}

export async function logDailyGoalProgress(
  goalId: string,
  amount: number,
  mode: 'add' | 'set' = 'add',
  userId?: string,
  dateStr?: string,
  notes?: string
): Promise<Goal | null> {
  const local = readLocalGoals();
  const index = local.findIndex((g) => g.id === goalId);
  if (index === -1) return null;

  const goal = local[index];
  const targetDate = dateStr || getTodayDateKey();
  const history = { ...(goal.dailyHistory || {}) };
  const existingEntry = history[targetDate];

  const dailyTarget = existingEntry?.target || goal.dailyTarget || goal.target || 1;
  const prevProgress = existingEntry?.progress || 0;
  const newProgress = Math.max(0, mode === 'add' ? prevProgress + amount : amount);
  const isCompleted = newProgress >= dailyTarget;

  const updatedEntry: DailyGoalEntry = {
    date: targetDate,
    target: dailyTarget,
    progress: newProgress,
    completed: isCompleted,
    completedAt: isCompleted ? (existingEntry?.completedAt || new Date().toISOString()) : undefined,
    notes: notes !== undefined ? notes : existingEntry?.notes,
  };

  history[targetDate] = updatedEntry;

  // Calculate cumulative progress
  const totalCompletedUnits = Object.values(history).reduce((sum, e) => sum + (e.progress || 0), 0);

  const updatedGoal: Goal = {
    ...goal,
    dailyHistory: history,
    currentProgress: totalCompletedUnits,
    updatedAt: new Date().toISOString(),
  };

  local[index] = updatedGoal;
  saveLocalGoals(local);

  // Sync to Firestore
  if (isCloudSyncableUser(userId) && !goalId.startsWith('temp_goal_')) {
    try {
      await updateDoc(doc(db, 'goals', goalId), {
        dailyHistory: history,
        currentProgress: totalCompletedUnits,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not sync daily goal progress to Firestore:', err);
    }
  }

  // Sync to Habit if linked
  if (goal.linkToHabit && goal.linkedHabitId) {
    try {
      const { logHabit } = await import('./habitService');
      await logHabit({
        userId: userId || 'local',
        habitId: goal.linkedHabitId,
        date: targetDate,
        status: isCompleted ? 'completed' : newProgress > 0 ? 'partial' : 'in_progress',
        progressValue: newProgress,
      });
    } catch (err) {
      console.warn('Could not sync goal to habit:', err);
    }
  }

  // Sync to Task if linked
  if (goal.linkToTask && goal.linkedTaskId) {
    try {
      const { updateTask } = await import('./taskService');
      await updateTask(
        goal.linkedTaskId,
        {
          completed: isCompleted,
        },
        userId
      );
    } catch (err) {
      console.warn('Could not sync goal to task:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_goals_updated', { detail: updatedGoal }));
  }

  return updatedGoal;
}

export function calculateGoalStreak(goal: Goal): {
  currentStreak: number;
  bestStreak: number;
  completedDaysCount: number;
  totalTrackedDays: number;
  totalCompletedUnits: number;
  averagePerDay: number;
  completionRate: number;
} {
  return calculateImmutableGoalStreaks(goal);
}

export function getTodayGoalProgress(goal: Goal, todayStr: string): number {
  if (goal.type !== 'daily') return goal.currentProgress;
  const history = goal.dailyHistory || {};
  return history[todayStr]?.progress || 0;
}

export async function logDailyGoalProgressQuick(goalId: string, dateStr: string, progressDelta: number, userId: string = 'local', skipSync: boolean = false) {
  const localGoals = readLocalGoals();
  const goal = localGoals.find(g => g.id === goalId);
  if (!goal) return null;

  const history = goal.dailyHistory || {};
  const currentEntry = history[dateStr] || {
    date: dateStr,
    target: goal.dailyTarget || goal.target || 1,
    progress: 0,
    completed: false
  };

  const newProgress = Math.max(0, currentEntry.progress + progressDelta);
  const isCompleted = newProgress >= currentEntry.target;
  
  history[dateStr] = {
    ...currentEntry,
    progress: newProgress,
    completed: isCompleted,
    completedAt: isCompleted ? new Date().toISOString() : undefined
  };

  const currentProgress = Object.values(history).reduce((acc, curr) => acc + (curr.progress || 0), 0);

  const updated = await updateGoal(goalId, {
    dailyHistory: history,
    currentProgress
  }, userId);

  if (!skipSync) {
    if (goal.linkedHabitId) {
      try {
        const { logHabit } = await import('./habitService');
        await logHabit({
          habitId: goal.linkedHabitId,
          userId,
          date: dateStr,
          status: isCompleted ? 'completed' : 'in_progress',
          progressValue: newProgress
        }, true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('streak_habits_updated'));
        }
      } catch (e) {
        console.warn('Could not sync goal to habit:', e);
      }
    }

    if (goal.linkedTaskId) {
      try {
        const { updateTask } = await import('./taskService');
        await updateTask(goal.linkedTaskId, { completed: isCompleted }, userId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
        }
      } catch (e) {
        console.warn('Could not sync goal to task:', e);
      }
    }
  }

  return updated;
}

export function getGoalHistoryList(goal: Goal) {
  if (!goal || !goal.dailyHistory) return [];
  return Object.values(goal.dailyHistory).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addGoalActivity(
  goalId: string,
  dateStr: string,
  activityData: Omit<GoalActivity, 'id'>,
  userId: string = 'local',
  options?: { addToTask?: boolean; addToHabit?: boolean }
): Promise<GoalActivity | null> {
  const localGoals = readLocalGoals();
  const goal = localGoals.find(g => g.id === goalId);
  if (!goal) return null;

  const activityId = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newActivity: GoalActivity = {
    ...activityData,
    id: activityId,
    progress: activityData.progress || 0,
    completed: Boolean(activityData.completed),
    unit: activityData.unit || 'unit',
  };

  // Optional: Create linked task
  if (options?.addToTask) {
    try {
      const { createTask } = await import('./taskService');
      const task = await createTask({
        title: `${newActivity.title}${newActivity.subject ? ` (${newActivity.subject})` : ''}`,
        description: `Linked to Goal: ${goal.title}`,
        date: dateStr,
        category: (goal.category as any) || 'Study',
        priority: goal.priority || 'medium',
        type: 'task',
        goalId: goal.id,
        completed: newActivity.completed,
      }, userId);
      if (task?.id) {
        newActivity.linkedTaskId = task.id;
      }
    } catch (err) {
      console.warn('Failed creating linked task for goal activity:', err);
    }
  }

  // Optional: Create linked habit
  if (options?.addToHabit) {
    try {
      const { createHabit } = await import('./habitService');
      const habitId = await createHabit({
        userId,
        name: newActivity.title,
        category: goal.category || 'Study',
        icon: 'BookOpen',
        color: '#a5ff36',
        frequencyType: 'daily',
        frequencyValue: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        targetType: 'count',
        targetValue: newActivity.targetQuantity || 1,
        targetUnit: newActivity.unit || 'unit',
      });
      if (habitId) {
        newActivity.linkedHabitId = typeof habitId === 'string' ? habitId : (habitId as any).id;
      }
    } catch (err) {
      console.warn('Failed creating linked habit for goal activity:', err);
    }
  }

  const history = { ...(goal.dailyHistory || {}) };
  const currentEntry = history[dateStr] || {
    date: dateStr,
    target: goal.dailyTarget || goal.target || 1,
    progress: 0,
    completed: false,
    activities: [],
  };

  const updatedActivities = [...(currentEntry.activities || []), newActivity];
  const quantities = calculateActivityQuantities(updatedActivities);
  const target = currentEntry.target || goal.dailyTarget || goal.target || 1;
  const isDayCompleted = quantities.completedQuantity >= target;

  history[dateStr] = {
    ...currentEntry,
    activities: updatedActivities,
    progress: quantities.completedQuantity,
    completed: isDayCompleted,
    completedAt: isDayCompleted ? (currentEntry.completedAt || new Date().toISOString()) : undefined,
  };

  await updateGoal(goalId, { dailyHistory: history }, userId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_goals_updated'));
    window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
    window.dispatchEvent(new CustomEvent('streak_habits_updated'));
  }

  return newActivity;
}

export async function updateGoalActivity(
  goalId: string,
  dateStr: string,
  activityId: string,
  updates: Partial<GoalActivity>,
  userId: string = 'local'
): Promise<GoalActivity | null> {
  const localGoals = readLocalGoals();
  const goal = localGoals.find(g => g.id === goalId);
  if (!goal || !goal.dailyHistory || !goal.dailyHistory[dateStr]) return null;

  const history = { ...goal.dailyHistory };
  const dayEntry = { ...history[dateStr] };
  const activities = [...(dayEntry.activities || [])];
  const actIndex = activities.findIndex(a => a.id === activityId);
  if (actIndex === -1) return null;

  const oldAct = activities[actIndex];
  const updatedAct: GoalActivity = {
    ...oldAct,
    ...updates,
  };

  if (updates.progress !== undefined) {
    updatedAct.completed = updatedAct.progress >= updatedAct.targetQuantity;
  }

  activities[actIndex] = updatedAct;
  dayEntry.activities = activities;

  const quantities = calculateActivityQuantities(activities);
  const target = dayEntry.target || goal.dailyTarget || goal.target || 1;
  const isCompleted = quantities.completedQuantity >= target;

  dayEntry.progress = quantities.completedQuantity;
  dayEntry.completed = isCompleted;
  if (isCompleted && !dayEntry.completedAt) {
    dayEntry.completedAt = new Date().toISOString();
  } else if (!isCompleted) {
    dayEntry.completedAt = undefined;
  }

  history[dateStr] = dayEntry;
  await updateGoal(goalId, { dailyHistory: history }, userId);

  // Sync to linked task if present
  if (updatedAct.linkedTaskId && updates.completed !== undefined) {
    try {
      const { updateTask } = await import('./taskService');
      await updateTask(updatedAct.linkedTaskId, { completed: updatedAct.completed }, userId);
    } catch (e) {
      console.warn('Error syncing activity completion to task:', e);
    }
  }

  // Sync to linked habit if present
  if (updatedAct.linkedHabitId) {
    try {
      const { logHabit } = await import('./habitService');
      await logHabit({
        userId,
        habitId: updatedAct.linkedHabitId,
        date: dateStr,
        status: updatedAct.completed ? 'completed' : 'in_progress',
        progressValue: updatedAct.progress,
      }, true);
    } catch (e) {
      console.warn('Error syncing activity completion to habit:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_goals_updated'));
    window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
    window.dispatchEvent(new CustomEvent('streak_habits_updated'));
  }

  return updatedAct;
}

export async function deleteGoalActivity(
  goalId: string,
  dateStr: string,
  activityId: string,
  userId: string = 'local'
): Promise<boolean> {
  const localGoals = readLocalGoals();
  const goal = localGoals.find(g => g.id === goalId);
  if (!goal || !goal.dailyHistory || !goal.dailyHistory[dateStr]) return false;

  const history = { ...goal.dailyHistory };
  const dayEntry = { ...history[dateStr] };
  const activities = [...(dayEntry.activities || [])];
  const targetAct = activities.find(a => a.id === activityId);
  const remaining = activities.filter(a => a.id !== activityId);

  dayEntry.activities = remaining;
  const quantities = calculateActivityQuantities(remaining);
  const target = dayEntry.target || goal.dailyTarget || goal.target || 1;
  const isCompleted = quantities.completedQuantity >= target;
  dayEntry.progress = quantities.completedQuantity;
  dayEntry.completed = isCompleted;
  if (!isCompleted) {
    dayEntry.completedAt = undefined;
  }

  history[dateStr] = dayEntry;
  await updateGoal(goalId, { dailyHistory: history }, userId);

  // If had linked task, delete or unlink it
  if (targetAct?.linkedTaskId) {
    try {
      const { deleteTask } = await import('./taskService');
      await deleteTask(targetAct.linkedTaskId, userId);
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_goals_updated'));
    window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
  }
  return true;
}

export async function rescheduleGoalActivity(
  goalId: string,
  fromDateStr: string,
  activityId: string,
  target: string | number,
  userId: string = 'local'
): Promise<boolean> {
  const localGoals = readLocalGoals();
  const goal = localGoals.find(g => g.id === goalId);
  if (!goal || !goal.dailyHistory || !goal.dailyHistory[fromDateStr]) return false;

  const fromActivities = goal.dailyHistory[fromDateStr].activities || [];
  const act = fromActivities.find(a => a.id === activityId);
  if (!act) return false;

  // Case A: target is a number -> delay scheduled time on the same date by N minutes
  if (typeof target === 'number') {
    let currentHour = 10;
    let currentMin = 0;
    if (act.scheduledTime) {
      const match = act.scheduledTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        currentHour = parseInt(match[1], 10);
        currentMin = parseInt(match[2], 10);
        if (match[3]?.toUpperCase() === 'PM' && currentHour < 12) currentHour += 12;
        if (match[3]?.toUpperCase() === 'AM' && currentHour === 12) currentHour = 0;
      }
    }

    const totalMins = currentHour * 60 + currentMin + target;
    const newH24 = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    const meridiem = newH24 >= 12 ? 'PM' : 'AM';
    const newH12 = newH24 % 12 === 0 ? 12 : newH24 % 12;
    const newTimeStr = `${newH12}:${newM.toString().padStart(2, '0')} ${meridiem}`;

    await updateGoalActivity(goalId, fromDateStr, activityId, { scheduledTime: newTimeStr }, userId);
    return true;
  }

  // Case B: target is a date string -> reschedule to new date
  const toDateStr = target;
  await updateGoalActivity(goalId, fromDateStr, activityId, { notes: `Rescheduled to ${toDateStr}` }, userId);

  const newActivityData: Omit<GoalActivity, 'id'> = {
    title: act.title,
    subject: act.subject,
    type: act.type,
    targetQuantity: act.targetQuantity,
    progress: 0,
    unit: act.unit,
    completed: false,
    estimatedDuration: act.estimatedDuration,
    scheduledTime: act.scheduledTime,
    notes: `Rescheduled from ${fromDateStr}`,
  };

  await addGoalActivity(goalId, toDateStr, newActivityData, userId, { addToTask: Boolean(act.linkedTaskId) });
  return true;
}

export async function syncLocalGoalsToCloud(userId: string) {
  if (!isCloudSyncableUser(userId)) return;
  const localGoals = readLocalGoals();
  for (const goal of localGoals) {
    if (!goal.userId || goal.userId === 'local' || goal.userId !== userId) {
      goal.userId = userId;
      const targetDocId = goal.id || 'goal_' + Date.now();
      const targetDocRef = doc(db, 'goals', targetDocId);
      try {
        const snap = await getDoc(targetDocRef);
        const goalPayload: Record<string, any> = {
          userId,
          title: goal.title || 'Goal',
          updatedAt: serverTimestamp(),
        };
        if (goal.description) goalPayload.description = goal.description;
        if (goal.category) goalPayload.category = goal.category;
        if (goal.target !== undefined) goalPayload.target = Number(goal.target) || 0;
        if (goal.currentProgress !== undefined) goalPayload.currentProgress = Number(goal.currentProgress) || 0;
        if (goal.unit) goalPayload.unit = goal.unit;
        if (goal.targetDate) goalPayload.targetDate = goal.targetDate;
        if (goal.priority) goalPayload.priority = goal.priority;
        if (goal.status) goalPayload.status = goal.status;
        if (Array.isArray(goal.milestones)) goalPayload.milestones = goal.milestones;
        if (Array.isArray(goal.linkedHabitIds)) goalPayload.linkedHabitIds = goal.linkedHabitIds;

        if (!snap.exists()) {
          goalPayload.createdAt = serverTimestamp();
          await setDoc(targetDocRef, goalPayload);
        } else {
          await updateDoc(targetDocRef, goalPayload);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `goals/${targetDocId}`);
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('streak_goals_updated', () => clearGoalsCache());
}
