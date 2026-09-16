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
  targetDate: string; 
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
      [new Date().toLocaleDateString('en-CA')]: {
        date: new Date().toLocaleDateString('en-CA'),
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
          const dStr = d.toLocaleDateString('en-CA');
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
  } catch {
    // Ignore storage issues
  }
}

// Function to ensure daily goals have corresponding tasks for today
export async function ensureDailyGoalTasks(userId?: string) {
  const localGoals = readLocalGoals();
  const dailyTaskGoals = localGoals.filter(g => g.type === 'daily' && g.linkToTask && g.status === 'in_progress');
  if (dailyTaskGoals.length === 0) return;

  const todayStr = new Date().toLocaleDateString('en-CA');
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

export async function getUserGoals(userId?: string): Promise<Goal[]> {
  const local = readLocalGoals();
  if (!userId || userId === 'local' || userId === 'default') {
    return deduplicateGoals(local);
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
      return clean;
    } else {
      const isInit = localStorage.getItem(GOALS_INITIALIZED_KEY);
      if (isInit) {
        saveLocalGoals([]);
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
  const tempId = 'temp_goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const todayStr = new Date().toLocaleDateString('en-CA');

  const newGoal: Goal = {
    ...goalData,
    id: tempId,
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
          userId
        }
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
          goalId: newGoal.id,
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

  if (userId && userId !== 'local' && userId !== 'default') {
    try {
      const docRef = await addDoc(collection(db, 'goals'), {
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
      newGoal.id = docRef.id;
      const updatedLocal = readLocalGoals().map((g) => (g.id === tempId ? newGoal : g));
      saveLocalGoals(updatedLocal);
    } catch (err) {
      console.warn('Could not sync goal to Firestore:', err);
      handleFirestoreError(err, OperationType.CREATE, 'goals');
    }
  }

  trackGoalCreated(newGoal.category);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_goals_updated', { detail: newGoal }));
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
    const todayStr = new Date().toLocaleDateString('en-CA');
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

  if (userId && userId !== 'local' && userId !== 'default' && !goalId.startsWith('temp_goal_')) {
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
  const goal = local.find(g => g.id === goalId);
  const filtered = local.filter((g) => g.id !== goalId);
  saveLocalGoals(filtered);

  if (userId && userId !== 'local' && userId !== 'default') {
    try {
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (err) {
      console.warn('Could not delete goal in Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, `goals/${goalId}`);
    }
  }

  trackGoalDeleted();
  return true;
}

export function subscribeToGoals(
  userId: string | undefined,
  callback: (goals: Goal[]) => void
): () => void {
  if (!userId || userId === 'local' || userId === 'default') {
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
  const d = dateStr || new Date().toLocaleDateString('en-CA');
  if (goal.type === 'daily') {
    const entry = goal.dailyHistory?.[d];
    const target = entry ? entry.target : (goal.dailyTarget || goal.target || 1);
    const progress = entry ? entry.progress : 0;
    const remaining = Math.max(0, target - progress);
    const percent = Math.min(100, Math.round((progress / (target || 1)) * 100));
    const completed = progress >= target;
    return { target, progress, remaining, percent, completed };
  } else {
    const target = goal.target || 100;
    const progress = goal.currentProgress || 0;
    const remaining = Math.max(0, target - progress);
    const percent = Math.min(100, Math.round((progress / (target || 1)) * 100));
    const completed = goal.status === 'completed' || progress >= target;
    return { target, progress, remaining, percent, completed };
  }
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
  const targetDate = dateStr || new Date().toLocaleDateString('en-CA');
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
  if (userId && userId !== 'local' && userId !== 'default' && !goalId.startsWith('temp_goal_')) {
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
  const history = goal.dailyHistory || {};
  const entries = Object.values(history);
  const totalTrackedDays = entries.length;

  let totalCompletedUnits = 0;
  let completedDaysCount = 0;

  entries.forEach((e) => {
    totalCompletedUnits += e.progress || 0;
    if (e.completed || e.progress >= e.target) {
      completedDaysCount++;
    }
  });

  const averagePerDay = totalTrackedDays > 0 ? Math.round((totalCompletedUnits / totalTrackedDays) * 10) / 10 : 0;
  const completionRate = totalTrackedDays > 0 ? Math.round((completedDaysCount / totalTrackedDays) * 100) : 0;

  // Calculate streaks chronologically
  const sortedCompletedDates = Object.keys(history)
    .filter((d) => history[d].completed || history[d].progress >= history[d].target)
    .sort();

  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dStr of sortedCompletedDates) {
    const curDate = new Date(dStr + 'T00:00:00');
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diff = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
      } else if (diff === 0) {
        // same day
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
    prevDate = curDate;
  }

  // Current streak (must be today or yesterday)
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todaySuccess = history[todayStr] && (history[todayStr].completed || history[todayStr].progress >= history[todayStr].target);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');
  const yesterdaySuccess = history[yesterdayStr] && (history[yesterdayStr].completed || history[yesterdayStr].progress >= history[yesterdayStr].target);

  let currentStreak = 0;
  if (todaySuccess || yesterdaySuccess) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }

  return {
    currentStreak,
    bestStreak,
    completedDaysCount,
    totalTrackedDays,
    totalCompletedUnits,
    averagePerDay,
    completionRate,
  };
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

export async function syncLocalGoalsToCloud(userId: string) {
  if (!userId || userId === 'local' || userId === 'default') return;
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
