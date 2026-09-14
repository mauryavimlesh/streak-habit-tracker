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

export interface Goal {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  category: string;
  target: number;
  currentProgress: number;
  unit?: string;
  targetDate: string; // YYYY-MM-DD
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
    id: 'goal-seed-1',
    title: 'Run a Half Marathon (21.1 km)',
    description: 'Build aerobic endurance and consistent weekly mileage',
    category: 'Fitness',
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
        target: data.target || 100,
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
  const newGoal: Goal = {
    ...goalData,
    id: tempId,
    userId,
    status: goalData.status || 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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
        target: newGoal.target,
        currentProgress: newGoal.currentProgress || 0,
        unit: newGoal.unit || '%',
        targetDate: newGoal.targetDate,
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

  const updated: Goal = {
    ...local[index],
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
          target: data.target,
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
